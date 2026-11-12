// SPDX-License-Identifier: MIT
package io.dualix.buildgolem;

import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.GlobalPos;
import net.minecraft.core.particles.BlockParticleOption;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.entity.ai.goal.Goal;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.ChestBlock;
import net.minecraft.world.level.block.SoundType;
import net.minecraft.world.level.block.entity.BlockEntity;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.Property;
import net.minecraft.world.level.gameevent.GameEvent;
import net.minecraft.world.level.pathfinder.Path;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.capabilities.Capabilities;
import net.neoforged.neoforge.common.util.BlockSnapshot;
import net.neoforged.neoforge.event.EventHooks;
import net.neoforged.neoforge.items.IItemHandler;
import net.neoforged.neoforge.items.ItemHandlerHelper;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.BitSet;
import java.util.Collection;
import java.util.Comparator;
import java.util.EnumSet;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * El trabajo del gólem. Repasa el plano sin parar (miles de bloques por tick, una vuelta cada 2 s como mucho) y apunta
 * lo que falta, lo que está girado y los cables a los que les faltan piezas: si alguien rompe un bloque ya puesto, lo
 * vuelve a poner. Elige lo más cercano (con preferencia por lo de abajo) y pone todo lo que tiene al alcance antes de
 * caminar. Si no lleva el material va al cofre que lo tenga y se trae lo de esa zona. Nunca rompe nada: un hueco ocupado
 * por otro bloque se salta, y en un cable solo añade piezas en caras libres. Si se atasca 4 s, salta a un sitio firme.
 */
final class BuildGoal extends Goal {
    private static final int SCAN_BUDGET = 8192, PASS_MIN = 40, CELL = 3;   // celdas de 8³ para encontrar rápido lo que hay al alcance
    private static final double CHEST_REACH = 2.6, NEAR_CHESTS = 4.5, SPEED = 1.0, LAYER_W = 3.0, DETOUR = 24;
    static final byte UNKNOWN = 0, OK = 1, MISSING = 2, PARTIAL = 3, TURNED = 4, BLOCKED = 5, UNLOADED = 6;
    /** Propiedades que el gólem endereza sin gastar nada (como una llave inglesa). */
    private static final Property<?>[] TURN = { BlockStateProperties.HORIZONTAL_FACING, BlockStateProperties.FACING, BlockStateProperties.FACING_HOPPER,
        BlockStateProperties.AXIS, BlockStateProperties.HORIZONTAL_AXIS, BlockStateProperties.HALF, BlockStateProperties.HANGING,
        BlockStateProperties.ROTATION_16, BlockStateProperties.ORIENTATION };

    private enum Job { NONE, PLACE, FETCH, RETURN }
    private record Taken(CompoundTag tag, List<ItemStack> spent) {}

    private final BuilderGolem g;
    private Job job = Job.NONE;
    private Plan lastPlan;
    private byte[] st = new byte[0];
    private final int[] cnt = new int[7];
    private final BitSet need = new BitSet(), skip = new BitSet(), gaveUp = new BitSet();
    private final Map<Integer, CompoundTag> partsMissing = new HashMap<>();
    /** Objetos que no están ni encima ni en los cofres (hasta la próxima vuelta): lo que los pide no se elige. */
    private final java.util.Set<Item> noStock = new java.util.HashSet<>();
    private Long2ObjectOpenHashMap<IntArrayList> cells = new Long2ObjectOpenHashMap<>();
    private int scan, passStart, target = -1, cooldown, repath, bestAt, lowY;
    private boolean passDone, announced = true, returned;
    private BlockPos goal;
    private double best;

    BuildGoal(BuilderGolem g) {
        this.g = g;
        setFlags(EnumSet.of(Flag.MOVE, Flag.LOOK));
    }

    @Override
    public boolean canUse() { return g.hasPlan() && !g.paused && g.waitTicks <= 0; }

    @Override
    public boolean canContinueToUse() { return canUse(); }

    @Override
    public boolean requiresUpdateEveryTick() { return true; }

    @Override
    public void start() { g.setReading(false); job = Job.NONE; }

    @Override
    public void stop() {
        g.getNavigation().stop();
        job = Job.NONE;
        g.setCarry(ItemStack.EMPTY);
        if (g.mood() == BuilderGolem.WORK) g.setMood(BuilderGolem.IDLE);
        if (g.hasPlan()) g.setReading(true);
    }

    @Override
    public void tick() {
        ServerLevel sl = (ServerLevel) g.level();
        Plan plan = g.plan();
        if (plan == null) { g.setStatus("planmissing"); g.setMood(BuilderGolem.CONFUSED); idle(200); return; }
        if (plan != lastPlan) reset(plan);
        if (!plan.dimension.equals(sl.dimension().location().toString())) { g.setStatus("otherdim"); idle(200); return; }
        if (cooldown > 0) cooldown--;
        scanSome(sl, plan);
        switch (job) {
            case NONE -> pick(sl, plan);
            case PLACE -> place(sl, plan);
            case FETCH -> fetch(sl, plan);
            case RETURN -> giveBack(sl);
        }
    }

    private void idle(int ticks) { g.waitTicks = ticks; job = Job.NONE; g.getNavigation().stop(); }

    private int count(Item item) { return g.inventory.countItem(item); }

    private int percent() { return Math.min(100, cnt[OK] * 100 / Math.max(1, st.length)); }

    // ── el plano contra el mundo ──
    private void reset(Plan plan) {
        lastPlan = plan;
        int n = plan.count();
        st = new byte[n];
        Arrays.fill(cnt, 0);
        cnt[UNKNOWN] = n;
        need.clear(); skip.clear(); gaveUp.clear(); partsMissing.clear();
        cells = new Long2ObjectOpenHashMap<>();
        for (int i = 0; i < n; i++) { BlockPos p = plan.pos(i); cells.computeIfAbsent(cell(p.getX(), p.getY(), p.getZ()), k -> new IntArrayList()).add(i); }
        scan = 0; passStart = g.tickCount; passDone = false; job = Job.NONE; announced = false; returned = false;
        lowY = Integer.MIN_VALUE;
    }

    private static long cell(int x, int y, int z) { return BlockPos.asLong(x >> CELL, y >> CELL, z >> CELL); }

    private void set(int i, byte s) {
        byte o = st[i];
        if (o == s) return;
        cnt[o]--; cnt[s]++; st[i] = s;
        need.set(i, s == MISSING || s == PARTIAL || s == TURNED);
    }

    private void scanSome(ServerLevel sl, Plan plan) {
        int n = plan.count();
        for (int budget = SCAN_BUDGET; budget > 0; ) {
            if (scan >= n) {
                if (passDone && g.tickCount - passStart < PASS_MIN) return;
                endPass(sl, plan);
                scan = 0; passStart = g.tickCount;
                return;
            }
            budget -= check(sl, plan, scan++);
        }
    }

    /** Compara un bloque del plano con el mundo. Devuelve lo que costó (leer las piezas de un cable cuesta más). */
    private int check(ServerLevel sl, Plan plan, int i) {
        BlockPos p = plan.pos(i);
        if (!sl.isLoaded(p)) { set(i, UNLOADED); return 1; }
        BlockState cur = sl.getBlockState(p), want = plan.state(i);
        if (cur.is(want.getBlock())) {
            CompoundTag d = plan.data(i);
            if (d == null) { set(i, !gaveUp.get(i) && turnedProp(cur, want) != null ? TURNED : OK); return 1; }
            CompoundTag miss = missingParts(sl, p, d);
            if (miss.isEmpty()) { partsMissing.remove(i); set(i, OK); } else { partsMissing.put(i, miss); set(i, PARTIAL); }
            return 16;
        }
        if (!cur.isAir() && !cur.canBeReplaced()) { set(i, BLOCKED); return 1; }
        if (Plan.free(want)) { set(i, OK); return 1; }                       // la otra mitad la pone el objeto al colocar la primera
        set(i, primary(plan, i) == Items.AIR ? BLOCKED : MISSING);
        return 1;
    }

    /** Al final de cada vuelta: se olvidan los apartados, se mira la capa más baja con trabajo y qué falta en los cofres. */
    private void endPass(ServerLevel sl, Plan plan) {
        passDone = true;
        skip.clear();
        noStock.clear();
        lowY = Integer.MAX_VALUE;
        Map<Item, Integer> want = new LinkedHashMap<>();
        for (int i = need.nextSetBit(0); i >= 0; i = need.nextSetBit(i + 1)) { lowY = Math.min(lowY, plan.pos(i).getY()); needs(plan, i, want); }
        Map<Item, Integer> stock = stock(sl, g.chests, new HashMap<>());
        g.lastMissing.clear();
        for (var en : want.entrySet()) {
            int lack = en.getValue() - count(en.getKey()) - stock.getOrDefault(en.getKey(), 0);
            if (lack > 0) g.lastMissing.put(en.getKey(), lack);
        }
    }

    // ── piezas de cable (AE2): el plano trae qué va en cada cara; el gólem solo pone piezas en caras libres ──
    static Item item(String id) {
        ResourceLocation rl = ResourceLocation.tryParse(id);
        return rl == null ? Items.AIR : BuiltInRegistries.ITEM.get(rl);
    }

    static Item partItem(CompoundTag nbt, String key) { return key.startsWith("facade") ? item("ae2:facade") : item(nbt.getCompound(key).getString("id")); }

    /** Lo que le falta al bloque en el mundo: solo claves que no tiene (una cara con otra pieza no se toca). */
    static CompoundTag missingParts(ServerLevel sl, BlockPos p, CompoundTag want) {
        CompoundTag out = new CompoundTag();
        BlockEntity be = sl.getBlockEntity(p);
        if (be == null) return out;
        CompoundTag have;
        try { have = be.saveWithoutMetadata(sl.registryAccess()); } catch (RuntimeException e) { return out; }
        for (String k : want.getAllKeys()) if (!have.contains(k)) out.put(k, want.get(k).copy());
        return out;
    }

    /** El objeto sin el que no se puede empezar un bloque: el bloque o, en un cable, el propio cable. */
    private static Item primary(Plan plan, int i) {
        CompoundTag d = plan.data(i);
        if (d == null) return plan.state(i).getBlock().asItem();
        if (d.contains("cable")) return partItem(d, "cable");
        for (String k : d.getAllKeys()) { Item it = partItem(d, k); if (it != Items.AIR) return it; }
        return Items.AIR;
    }

    /** Lo que gasta el bloque i tal como está ahora. */
    private void needs(Plan plan, int i, Map<Item, Integer> into) {
        CompoundTag parts = st[i] == PARTIAL ? partsMissing.get(i) : st[i] == MISSING ? plan.data(i) : null;
        if (st[i] == MISSING && parts == null) {
            Item it = plan.state(i).getBlock().asItem();
            if (it != Items.AIR) into.merge(it, Plan.cost(plan.state(i)), Integer::sum);
            return;
        }
        if (parts != null) for (String k : parts.getAllKeys()) { Item it = partItem(parts, k); if (it != Items.AIR) into.merge(it, 1, Integer::sum); }
    }

    private boolean canDoNow(Plan plan, int i) {
        return switch (st[i]) {
            case TURNED -> true;
            case MISSING -> plan.data(i) == null ? count(primary(plan, i)) >= Plan.cost(plan.state(i)) : count(primary(plan, i)) > 0;
            case PARTIAL -> {
                CompoundTag m = partsMissing.get(i);
                if (m != null) for (String k : m.getAllKeys()) if (count(partItem(m, k)) > 0) yield true;
                yield false;
            }
            default -> false;
        };
    }

    private Item firstLacking(Plan plan, int i) {
        Map<Item, Integer> m = new LinkedHashMap<>();
        needs(plan, i, m);
        for (var en : m.entrySet()) if (count(en.getKey()) < en.getValue()) return en.getKey();
        return Items.AIR;
    }

    private static boolean supported(ServerLevel sl, Plan plan, int i, byte s) { return s != MISSING || plan.state(i).canSurvive(sl, plan.pos(i)); }

    private static Property<?> turnedProp(BlockState cur, BlockState want) {
        if (cur.hasProperty(BlockStateProperties.DOUBLE_BLOCK_HALF) || cur.hasProperty(BlockStateProperties.BED_PART)
            || cur.hasProperty(BlockStateProperties.CHEST_TYPE) || cur.hasProperty(BlockStateProperties.EXTENDED)) return null;
        for (Property<?> p : TURN) if (want.hasProperty(p) && cur.hasProperty(p) && !cur.getValue(p).equals(want.getValue(p))) return p;
        return null;
    }

    private static <T extends Comparable<T>> BlockState copy(BlockState to, BlockState from, Property<T> p) { return to.setValue(p, from.getValue(p)); }

    // ── elegir el siguiente trabajo ──
    private double score(BlockPos p) { return Math.sqrt(g.distanceToSqr(Vec3.atCenterOf(p))) + (p.getY() - lowY) * LAYER_W; }

    private void pick(ServerLevel sl, Plan plan) {
        if (!passDone) { g.setStatus("checking"); return; }
        if (need.isEmpty()) { finished(sl); return; }
        int near = nearHere(sl, plan);
        if (near >= 0) { begin(Job.PLACE, near, plan.pos(near)); return; }
        int any = -1, have = -1;
        double sa = Double.MAX_VALUE, sh = Double.MAX_VALUE;
        for (int i = need.nextSetBit(0); i >= 0; i = need.nextSetBit(i + 1)) {
            if (skip.get(i)) continue;
            double s = score(plan.pos(i));
            boolean doable = s < sh && canDoNow(plan, i);
            if (doable) { sh = s; have = i; }
            if (s < sa && (doable || !noStock.contains(lacking(plan, i)))) { sa = s; any = i; }
        }
        if (have >= 0 && sh <= sa + DETOUR) { go(sl, plan, have); return; }       // lo que lleva encima, si no supone un rodeo grande
        if (any < 0) { waiting(sl); return; }                                       // todo lo pendiente está apartado o sin material
        Item lack = firstLacking(plan, any);
        BlockPos chest = lack == Items.AIR ? null : chestWith(sl, lack);
        if (chest != null) { begin(Job.FETCH, any, chest); return; }
        if (lack != Items.AIR) noStock.add(lack); else skip.set(any);             // sin material: no se elige más hasta la próxima vuelta
        if (have >= 0) go(sl, plan, have);                                          // mientras, hace lo que puede
    }

    /** El objeto que falta para el bloque i (rápido para un bloque normal, que es casi todo el plano). */
    private Item lacking(Plan plan, int i) {
        if (st[i] == MISSING && plan.data(i) == null) return plan.state(i).getBlock().asItem();
        return firstLacking(plan, i);
    }

    private void go(ServerLevel sl, Plan plan, int i) {
        if (supported(sl, plan, i, st[i])) begin(Job.PLACE, i, plan.pos(i)); else skip.set(i);
    }

    /** Lo que puede poner sin moverse: de abajo arriba y, a la misma altura, lo más cercano. */
    private int nearHere(ServerLevel sl, Plan plan) {
        double reach = g.reach(), r2 = reach * reach;
        Vec3 eye = g.position().add(0, 1.0, 0);
        int r = (int) Math.ceil(reach) + 1, bestI = -1, bestY = Integer.MAX_VALUE;
        double bestD = 0;
        BlockPos c = g.blockPosition();
        for (int cx = (c.getX() - r) >> CELL; cx <= (c.getX() + r) >> CELL; cx++)
            for (int cy = (c.getY() - r) >> CELL; cy <= (c.getY() + r + 1) >> CELL; cy++)
                for (int cz = (c.getZ() - r) >> CELL; cz <= (c.getZ() + r) >> CELL; cz++) {
                    IntArrayList list = cells.get(BlockPos.asLong(cx, cy, cz));
                    if (list == null) continue;
                    for (int k = 0; k < list.size(); k++) {
                        int i = list.getInt(k);
                        if (!need.get(i) || skip.get(i)) continue;
                        BlockPos p = plan.pos(i);
                        double d = eye.distanceToSqr(Vec3.atCenterOf(p));
                        if (d > r2 || p.getY() > bestY || p.getY() == bestY && d >= bestD) continue;
                        if (!canDoNow(plan, i) || !supported(sl, plan, i, st[i])) continue;
                        bestI = i; bestY = p.getY(); bestD = d;
                    }
                }
        return bestI;
    }

    private void waiting(ServerLevel sl) {
        if (!g.lastMissing.isEmpty()) {
            var first = g.lastMissing.entrySet().iterator().next();
            boolean anyChest = g.chests.stream().anyMatch(c -> c.dimension().equals(sl.dimension()));
            if (anyChest) g.setStatus("missing", first.getKey().getDescription(), first.getValue()); else g.setStatus("nochests");
            g.setMood(BuilderGolem.CONFUSED);
        } else {
            g.setStatus("waiting");
            g.setMood(BuilderGolem.IDLE);
        }
        idle(100);
    }

    private void finished(ServerLevel sl) {
        if (!returned && !g.inventory.isEmpty()) {
            returned = true;
            BlockPos c = nearestChest(sl);
            if (c != null) { begin(Job.RETURN, -1, c); return; }
        }
        if (cnt[UNLOADED] > 0) g.setStatus("donepartial", cnt[UNLOADED]);
        else if (cnt[BLOCKED] > 0) g.setStatus("doneblocked", cnt[BLOCKED]);
        else g.setStatus("done");
        g.lastMissing.clear();
        if (!announced) {
            announced = true;
            g.tellOwner(Component.translatable("buildgolem.msg.done", g.planTitle()));
            g.setMood(BuilderGolem.HAPPY);
        } else if (g.mood() != BuilderGolem.HAPPY) g.setMood(BuilderGolem.IDLE);
        idle(200);
    }

    private void begin(Job j, int i, BlockPos where) { job = j; target = i; goal = where; best = Double.MAX_VALUE; bestAt = 0; repath = 0; }

    // ── caminar ──
    /** 1 = ya llega, 0 = caminando, −1 = no hay forma de llegar. */
    private int approach(ServerLevel sl, BlockPos to, double reach) {
        Vec3 c = Vec3.atCenterOf(to);
        double d = g.position().add(0, 1.0, 0).distanceTo(c);
        if (d <= reach) { g.getNavigation().stop(); return 1; }
        if (d < best - .5) { best = d; bestAt = 0; } else bestAt++;
        if (--repath <= 0 || g.getNavigation().isDone()) {
            repath = 20;
            Path path = g.getNavigation().createPath(to, 1);
            if (path != null && path.canReach()) g.getNavigation().moveTo(path, SPEED);
            else { if (path != null) g.getNavigation().moveTo(path, SPEED); bestAt += 20; }
        }
        if (bestAt > 80) {                                      // 4 s sin acercarse: salta a un sitio firme junto al objetivo
            bestAt = 0; best = Double.MAX_VALUE;
            BlockPos spot = standSpot(sl, to, reach, null);
            if (spot == null) return -1;
            hop(sl, spot);
        }
        return 0;
    }

    /** Un sitio con suelo firme, sin obstáculos y al alcance del objetivo, que no sea el propio hueco. */
    private BlockPos standSpot(ServerLevel sl, BlockPos t, double reach, BlockPos avoid) {
        BlockPos bestP = null;
        double bd = Double.MAX_VALUE;
        for (int dy = -3; dy <= 2; dy++) for (int dx = -3; dx <= 3; dx++) for (int dz = -3; dz <= 3; dz++) {
            if (dx == 0 && dz == 0) continue;
            BlockPos p = t.offset(dx, dy, dz);
            if (!sl.isLoaded(p)) continue;
            BlockPos below = p.below();
            if (!sl.getBlockState(below).isFaceSturdy(sl, below, Direction.UP)) continue;
            AABB box = g.getType().getDimensions().makeBoundingBox(Vec3.atBottomCenterOf(p));
            if (box.intersects(new AABB(t)) || avoid != null && box.intersects(new AABB(avoid)) || !sl.noCollision(g, box)) continue;
            double d = Vec3.atBottomCenterOf(p).add(0, 1.0, 0).distanceTo(Vec3.atCenterOf(t));
            if (d > reach) continue;
            double score = d + Math.abs(dy) * .5 + g.position().distanceTo(Vec3.atBottomCenterOf(p)) * .05;
            if (score < bd) { bd = score; bestP = p; }
        }
        return bestP;
    }

    private void hop(ServerLevel sl, BlockPos spot) {
        sl.sendParticles(ParticleTypes.POOF, g.getX(), g.getY() + 1, g.getZ(), 10, .3, .5, .3, .02);
        g.getNavigation().stop();
        g.teleportTo(spot.getX() + .5, spot.getY(), spot.getZ() + .5);
        sl.sendParticles(ParticleTypes.POOF, spot.getX() + .5, spot.getY() + 1, spot.getZ() + .5, 10, .3, .5, .3, .02);
        sl.playSound(null, spot, SoundEvents.IRON_GOLEM_STEP, SoundSource.NEUTRAL, 1, .7f);
    }

    // ── colocar ──
    private void place(ServerLevel sl, Plan plan) {
        int i = target;
        check(sl, plan, i);                                     // el mundo pudo cambiar mientras caminaba
        byte s = st[i];
        if (s != MISSING && s != PARTIAL && s != TURNED || !canDoNow(plan, i)) { job = Job.NONE; return; }
        BlockPos p = plan.pos(i);
        g.setCarry(s == TURNED ? ItemStack.EMPTY : new ItemStack(s == MISSING ? primary(plan, i) : partItem(partsMissing.get(i), partsMissing.get(i).getAllKeys().iterator().next())));
        g.setStatus("building", percent());
        g.setMood(BuilderGolem.WORK);
        int r = approach(sl, p, g.reach());
        if (r < 0) { skip.set(i); job = Job.NONE; return; }
        if (r == 0) return;
        g.getLookControl().setLookAt(Vec3.atCenterOf(p));
        if (cooldown > 0) return;
        if (s == MISSING) {
            AABB box = new AABB(p);
            if (g.getBoundingBox().intersects(box)) {              // estorba él mismo: se aparta y lo intenta luego
                BlockPos spot = standSpot(sl, p, g.reach(), p);
                if (spot == null) { skip.set(i); job = Job.NONE; } else hop(sl, spot);
                return;
            }
            if (!sl.getEntities((Entity) null, box, e -> e.isAlive() && e.blocksBuilding).isEmpty()) { skip.set(i); job = Job.NONE; return; }
        }
        boolean ok = switch (s) {
            case TURNED -> turn(sl, plan, i);
            case PARTIAL -> addParts(sl, p, partsMissing.get(i));
            default -> placeNew(sl, plan, i);
        };
        if (ok) {
            cooldown = g.placeEvery();
            announced = false;
            returned = false;
            g.swing(InteractionHand.MAIN_HAND);
            check(sl, plan, i);
        } else skip.set(i);
        job = Job.NONE;
    }

    private boolean placeNew(ServerLevel sl, Plan plan, int i) {
        BlockPos p = plan.pos(i);
        BlockState want = plan.state(i);
        if (!want.canSurvive(sl, p)) return false;
        CompoundTag d = plan.data(i);
        if (d == null) {
            Item item = want.getBlock().asItem();
            int cost = Plan.cost(want);
            ItemStack used = g.inventory.removeItemType(item, cost);
            if (used.getCount() < cost) { give(used); return false; }
            if (put(sl, p, want, used, true)) return true;
            give(used);
            return false;
        }
        // cable con piezas: el cable y las piezas y fachadas que lleve, en el mismo tick (un cable vacío se borra solo)
        Taken t = take(d);
        if (t.tag().isEmpty() || d.contains("cable") && !t.tag().contains("cable")) { refund(t); return false; }
        if (!put(sl, p, want, t.spent().get(0), false)) { refund(t); return false; }
        if (!merge(sl, p, t.tag())) { refund(t); return false; }
        return true;
    }

    /** Añade a un cable que ya está las piezas que faltan y que el gólem lleva. */
    private boolean addParts(ServerLevel sl, BlockPos p, CompoundTag miss) {
        if (miss == null || !mayEdit(sl, p)) return false;
        Taken t = take(miss);
        if (t.tag().isEmpty()) return false;
        if (!merge(sl, p, t.tag())) { refund(t); return false; }
        BlockState s = sl.getBlockState(p);
        SoundType sound = s.getSoundType(sl, p, g);
        sl.playSound(null, p, sound.getPlaceSound(), SoundSource.BLOCKS, (sound.getVolume() + 1) / 2f, sound.getPitch() * 1.1f);
        sl.sendParticles(ParticleTypes.ELECTRIC_SPARK, p.getX() + .5, p.getY() + .5, p.getZ() + .5, 6, .25, .25, .25, .05);
        return true;
    }

    /** Endereza un bloque que es el bueno pero mira a otro lado, sin romperlo (conserva lo que tenga dentro). */
    private boolean turn(ServerLevel sl, Plan plan, int i) {
        BlockPos p = plan.pos(i);
        BlockState cur = sl.getBlockState(p);
        Property<?> prop = turnedProp(cur, plan.state(i));
        if (prop == null) return false;
        BlockState fixed = copy(cur, plan.state(i), prop);
        BlockSnapshot snap = BlockSnapshot.create(sl.dimension(), sl, p);
        if (!sl.setBlock(p, fixed, Block.UPDATE_ALL)) { gaveUp.set(i); return false; }
        Player owner = g.ownerPlayer();
        if (EventHooks.onBlockPlace(owner != null ? owner : g, snap, Direction.UP)) { snap.restore(Block.UPDATE_ALL); gaveUp.set(i); return false; }
        if (!sl.getBlockState(p).equals(fixed)) { gaveUp.set(i); return false; }     // el bloque no se deja: se acepta como está
        sl.playSound(null, p, SoundEvents.ITEM_FRAME_ROTATE_ITEM, SoundSource.BLOCKS, .9f, .8f);
        return true;
    }

    /** Saca del inventario una pieza por cada clave que pueda pagar (primero el cable). */
    private Taken take(CompoundTag want) {
        CompoundTag out = new CompoundTag();
        List<ItemStack> spent = new ArrayList<>();
        List<String> keys = new ArrayList<>(want.getAllKeys());
        keys.sort(Comparator.comparing((String k) -> !k.equals("cable")));
        for (String k : keys) {
            Item it = partItem(want, k);
            if (it == Items.AIR || count(it) < 1) continue;
            spent.add(g.inventory.removeItemType(it, 1));
            out.put(k, want.get(k).copy());
        }
        return new Taken(out, spent);
    }

    private void refund(Taken t) { for (ItemStack s : t.spent()) give(s); }

    private void give(ItemStack s) {
        if (s.isEmpty()) return;
        ItemStack rest = g.inventory.addItem(s);
        if (!rest.isEmpty()) g.spawnAtLocation(rest);
    }

    /** Funde las piezas en los datos del bloque, como "/data merge block": lo que ya tenía se conserva. */
    private static boolean merge(ServerLevel sl, BlockPos p, CompoundTag parts) {
        BlockEntity be = sl.getBlockEntity(p);
        if (be == null) return false;
        try {
            CompoundTag merged = be.saveWithoutMetadata(sl.registryAccess());
            merged.merge(parts);
            be.loadWithComponents(merged, sl.registryAccess());
            be.setChanged();
            BlockState s = sl.getBlockState(p);
            sl.sendBlockUpdated(p, s, s, Block.UPDATE_ALL);
            return true;
        } catch (RuntimeException e) {
            BuildGolem.LOG.warn("No se pudieron poner las piezas en {}", p, e);
            return false;
        }
    }

    /** ¿Dejaría una protección de terreno al dueño tocar aquí? */
    private boolean mayEdit(ServerLevel sl, BlockPos p) {
        Player owner = g.ownerPlayer();
        return !EventHooks.onBlockPlace(owner != null ? owner : g, BlockSnapshot.create(sl.dimension(), sl, p), Direction.UP);
    }

    /** Pone el bloque como lo pondría el dueño: si una protección de terreno no se lo permite a él, no se pone. */
    private boolean put(ServerLevel sl, BlockPos p, BlockState want, ItemStack used, boolean placedBy) {
        BlockSnapshot snap = BlockSnapshot.create(sl.dimension(), sl, p);
        if (!sl.setBlock(p, want, Block.UPDATE_ALL)) return false;
        Player owner = g.ownerPlayer();
        if (EventHooks.onBlockPlace(owner != null ? owner : g, snap, Direction.UP)) { snap.restore(Block.UPDATE_ALL); return false; }
        if (placedBy) want.getBlock().setPlacedBy(sl, p, want, owner, used.copyWithCount(1));
        SoundType st = want.getSoundType(sl, p, g);
        sl.playSound(null, p, st.getPlaceSound(), SoundSource.BLOCKS, (st.getVolume() + 1) / 2f, st.getPitch() * .8f);
        sl.sendParticles(new BlockParticleOption(ParticleTypes.BLOCK, want), p.getX() + .5, p.getY() + .5, p.getZ() + .5, 8, .3, .3, .3, .05);
        sl.gameEvent(GameEvent.BLOCK_PLACE, p, GameEvent.Context.of(g, want));
        return true;
    }

    // ── cofres ──
    private static IItemHandler handler(ServerLevel sl, BlockPos pos) {
        return sl.isLoaded(pos) ? sl.getCapability(Capabilities.ItemHandler.BLOCK, pos, null) : null;
    }

    /** Suma lo que hay en esos cofres (los de esta dimensión y cargados). */
    static Map<Item, Integer> stock(ServerLevel sl, Collection<GlobalPos> chests, Map<Item, Integer> into) {
        for (GlobalPos gp : chests) {
            if (!gp.dimension().equals(sl.dimension())) continue;
            IItemHandler h = handler(sl, gp.pos());
            if (h == null) continue;
            for (int s = 0; s < h.getSlots(); s++) { ItemStack st = h.getStackInSlot(s); if (!st.isEmpty()) into.merge(st.getItem(), st.getCount(), Integer::sum); }
        }
        return into;
    }

    private static boolean has(IItemHandler h, Item item) {
        for (int s = 0; s < h.getSlots(); s++) if (h.getStackInSlot(s).is(item)) return true;
        return false;
    }

    private BlockPos chestWith(ServerLevel sl, Item item) {
        BlockPos bestP = null;
        double bd = Double.MAX_VALUE;
        for (GlobalPos gp : g.chests) {
            if (!gp.dimension().equals(sl.dimension())) continue;
            IItemHandler h = handler(sl, gp.pos());
            if (h == null || !has(h, item)) continue;
            double d = g.distanceToSqr(Vec3.atCenterOf(gp.pos()));
            if (d < bd) { bd = d; bestP = gp.pos(); }
        }
        return bestP;
    }

    private BlockPos nearestChest(ServerLevel sl) {
        BlockPos bestP = null;
        double bd = Double.MAX_VALUE;
        for (GlobalPos gp : g.chests) {
            if (!gp.dimension().equals(sl.dimension()) || handler(sl, gp.pos()) == null) continue;
            double d = g.distanceToSqr(Vec3.atCenterOf(gp.pos()));
            if (d < bd) { bd = d; bestP = gp.pos(); }
        }
        return bestP;
    }

    private void lid(ServerLevel sl, BlockPos pos) {
        if (sl.getBlockState(pos).getBlock() instanceof ChestBlock) g.openLid(pos);
        else sl.playSound(null, pos, SoundEvents.BARREL_OPEN, SoundSource.BLOCKS, .5f, 1.1f);
    }

    private void fetch(ServerLevel sl, Plan plan) {
        if (handler(sl, goal) == null) { job = Job.NONE; return; }
        g.setCarry(ItemStack.EMPTY);
        g.setStatus("fetching", firstLacking(plan, target).getDescription());
        g.setMood(BuilderGolem.WORK);
        int r = approach(sl, goal, CHEST_REACH);
        if (r < 0) { skip.set(target); job = Job.NONE; return; }
        if (r == 0) return;
        g.getLookControl().setLookAt(Vec3.atCenterOf(goal));
        // el cofre al que iba y los suyos que tenga al lado: un solo viaje para todo lo que viene
        List<BlockPos> near = new ArrayList<>();
        near.add(goal);
        for (GlobalPos gp : g.chests)
            if (gp.dimension().equals(sl.dimension()) && !gp.pos().equals(goal) && g.position().distanceTo(Vec3.atCenterOf(gp.pos())) <= NEAR_CHESTS && handler(sl, gp.pos()) != null) near.add(gp.pos());
        Map<Item, Integer> avail = new HashMap<>();
        for (BlockPos c : near) stock(sl, List.of(GlobalPos.of(sl.dimension(), c)), avail);
        boolean took = false, full = false;
        java.util.Set<BlockPos> opened = new java.util.HashSet<>();
        for (var en : upcoming(plan, target, avail).entrySet()) {
            int before = count(en.getKey()), want = en.getValue() - before;
            if (want <= 0) continue;
            for (BlockPos c : near) {
                IItemHandler h = handler(sl, c);
                if (h == null || !has(h, en.getKey())) continue;
                if (opened.add(c)) lid(sl, c);
                full = !takeFrom(h, en.getKey(), want - (count(en.getKey()) - before));
                if (full || count(en.getKey()) - before >= want) break;
            }
            took |= count(en.getKey()) > before;
            if (full) break;                                    // inventario lleno
        }
        if (opened.isEmpty()) lid(sl, goal);
        if (took) sl.playSound(null, g.blockPosition(), SoundEvents.ITEM_PICKUP, SoundSource.NEUTRAL, .5f, .9f);
        else if (!canDoNow(plan, target)) skip.set(target);    // ya no estaba en el cofre
        cooldown = 10;
        job = Job.NONE;
    }

    /**
     * Lo que pide el trabajo que viene: el objetivo y luego lo más cercano a él (de abajo arriba), hasta llenar el inventario
     * con lo que de verdad hay (lo que lleva más lo de los cofres). Así no vuelve al cofre por cada bloque suelto.
     */
    private Map<Item, Integer> upcoming(Plan plan, int from, Map<Item, Integer> avail) {
        BlockPos c = plan.pos(from);
        IntArrayList order = new IntArrayList();
        for (int i = need.nextSetBit(0); i >= 0; i = need.nextSetBit(i + 1)) if (i != from && !skip.get(i)) order.add(i);
        order.sort((a, b) -> Double.compare(workScore(plan.pos(a), c), workScore(plan.pos(b), c)));
        Map<Item, Integer> out = new LinkedHashMap<>();
        needs(plan, from, out);
        for (int k = 0; k < order.size() && slots(out, avail) < g.inventory.getContainerSize(); k++) needs(plan, order.getInt(k), out);
        return out;
    }

    private double workScore(BlockPos p, BlockPos c) { return Math.sqrt(p.distSqr(c)) + (p.getY() - lowY) * LAYER_W; }

    /** Huecos de inventario que ocuparía llevarse eso, contando solo lo que hay. */
    private int slots(Map<Item, Integer> m, Map<Item, Integer> avail) {
        int n = 0;
        for (var e : m.entrySet()) {
            int max = Math.max(1, e.getKey().getDefaultMaxStackSize()), can = Math.min(e.getValue(), count(e.getKey()) + avail.getOrDefault(e.getKey(), 0));
            n += (can + max - 1) / max;
        }
        return n;
    }

    /** Saca hasta amount del cofre. false si ya no le cabe nada más. */
    private boolean takeFrom(IItemHandler h, Item item, int amount) {
        for (int s = 0; s < h.getSlots() && amount > 0; s++) {
            if (!h.getStackInSlot(s).is(item)) continue;
            ItemStack sim = h.extractItem(s, Math.min(amount, item.getDefaultMaxStackSize()), true);
            if (sim.isEmpty()) continue;
            if (!g.inventory.canAddItem(sim)) return false;
            ItemStack got = h.extractItem(s, sim.getCount(), false);
            ItemStack rest = g.inventory.addItem(got);
            amount -= got.getCount() - rest.getCount();
            if (!rest.isEmpty()) { ItemHandlerHelper.insertItem(h, rest, false); return false; }
        }
        return true;
    }

    private void giveBack(ServerLevel sl) {
        IItemHandler h = handler(sl, goal);
        if (h == null) { job = Job.NONE; return; }
        g.setCarry(ItemStack.EMPTY);
        g.setStatus("returning");
        int r = approach(sl, goal, CHEST_REACH);
        if (r < 0) { job = Job.NONE; return; }
        if (r == 0) return;
        lid(sl, goal);
        for (int s = 0; s < g.inventory.getContainerSize(); s++) {
            ItemStack st = g.inventory.getItem(s);
            if (!st.isEmpty()) g.inventory.setItem(s, ItemHandlerHelper.insertItemStacked(h, st, false));
        }
        job = Job.NONE;
    }
}
