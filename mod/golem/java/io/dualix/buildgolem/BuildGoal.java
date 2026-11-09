// SPDX-License-Identifier: MIT
package io.dualix.buildgolem;

import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.core.GlobalPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
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
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.gameevent.GameEvent;
import net.minecraft.world.level.pathfinder.Path;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.Vec3;
import net.neoforged.neoforge.capabilities.Capabilities;
import net.neoforged.neoforge.common.util.BlockSnapshot;
import net.neoforged.neoforge.event.EventHooks;
import net.neoforged.neoforge.items.IItemHandler;
import net.neoforged.neoforge.items.ItemHandlerHelper;

import java.util.BitSet;
import java.util.EnumSet;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * El trabajo del gólem. Recorre el plano de abajo arriba buscando el siguiente bloque que falta; si no lo lleva, va al
 * cofre asignado que lo tenga y coge lo que va a necesitar pronto; luego camina hasta tenerlo a mano y lo pone
 * (un bloque cada 12 ticks, como un jugador con calma). Nunca rompe nada: un hueco ocupado por otro bloque se salta.
 * Si se atasca 4 s, salta a un sitio firme junto al objetivo. Al terminar devuelve lo que sobra a un cofre.
 */
final class BuildGoal extends Goal {
    private static final int PLACE_EVERY = 12, SCAN_BUDGET = 4096, AHEAD = 2048;
    private static final double REACH = 4.5, CHEST_REACH = 2.6, SPEED = 1.0;

    private enum Job { NONE, PLACE, FETCH, RETURN }

    private final BuilderGolem g;
    private Job job = Job.NONE;
    private int target = -1, scan, cooldown, repath, bestAt, blocked;
    /** Bloques que ya están bien: los vistos en la vuelta anterior más los puestos desde entonces (para el %). */
    private int known, passBase, doneSeen;
    private boolean progress;
    private BlockPos goal;
    private double best;
    private boolean announced = true, returned;
    private Plan lastPlan;
    private final BitSet deferred = new BitSet();
    private final Map<Item, Integer> missing = new LinkedHashMap<>();

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
        if (g.hasPlan()) g.setReading(true);
    }

    @Override
    public void tick() {
        ServerLevel sl = (ServerLevel) g.level();
        Plan plan = g.plan();
        if (plan != lastPlan) { lastPlan = plan; scan = passBase = known = g.cursor; resetPass(); job = Job.NONE; announced = false; returned = false; }
        if (plan == null) { g.setStatus("planmissing"); idle(200); return; }
        if (!plan.dimension.equals(sl.dimension().location().toString())) { g.setStatus("otherdim"); idle(200); return; }
        if (cooldown > 0) cooldown--;
        switch (job) {
            case NONE -> pick(sl, plan);
            case PLACE -> place(sl, plan);
            case FETCH -> fetch(sl, plan);
            case RETURN -> giveBack(sl);
        }
    }

    private void idle(int ticks) { g.waitTicks = ticks; job = Job.NONE; g.getNavigation().stop(); }

    private void resetPass() { deferred.clear(); missing.clear(); blocked = 0; doneSeen = 0; progress = false; passBase = g.cursor; }

    private void advance(int i) { if (i == g.cursor) g.cursor++; }

    private int count(Item item) { return g.inventory.countItem(item); }

    private int percent(Plan plan) { return Math.min(100, known * 100 / Math.max(1, plan.count())); }

    // ── elegir el siguiente trabajo ──
    private void pick(ServerLevel sl, Plan plan) {
        int n = plan.count();
        if (g.cursor > n) g.cursor = 0;
        if (scan < g.cursor) scan = g.cursor;
        for (int budget = SCAN_BUDGET; budget > 0 && scan < n; budget--, scan++) {
            int i = scan;
            if (deferred.get(i)) continue;
            BlockPos p = plan.pos(i);
            if (!sl.isLoaded(p)) { deferred.set(i); continue; }
            BlockState cur = sl.getBlockState(p), want = plan.state(i);
            if (cur.is(want.getBlock())) { doneSeen++; advance(i); continue; }
            if (!cur.isAir() && !cur.canBeReplaced()) { blocked++; advance(i); continue; }
            Item item = want.getBlock().asItem();
            if (item == Items.AIR) { advance(i); continue; }
            if (Plan.free(want) || !want.canSurvive(sl, p)) { deferred.set(i); continue; }
            int cost = Plan.cost(want);
            if (count(item) >= cost) { begin(Job.PLACE, i, p); return; }
            BlockPos chest = chestWith(sl, item);
            if (chest != null) { begin(Job.FETCH, i, chest); return; }
            missing.merge(item, cost, Integer::sum);
            deferred.set(i);
        }
        if (scan < n) return;                                   // sigue mirando en el próximo tick
        endOfPass(sl, plan);
    }

    private void endOfPass(ServerLevel sl, Plan plan) {
        known = passBase + doneSeen;
        int stuck = deferred.cardinality();
        boolean anyChest = g.chests.stream().anyMatch(c -> c.dimension().equals(sl.dimension()));
        if (!missing.isEmpty()) {
            var first = missing.entrySet().iterator().next();
            if (!anyChest) g.setStatus("nochests");
            else g.setStatus("missing", first.getKey().getDescription(), first.getValue());
            g.lastMissing.clear();
            g.lastMissing.putAll(missing);
            scan = g.cursor;
            resetPass();
            idle(100);
            return;
        }
        g.lastMissing.clear();
        if (stuck > 0 && progress) { g.setStatus("waiting"); scan = g.cursor; resetPass(); idle(40); return; }   // otra vuelta: quizá ya tengan apoyo
        if (!returned && !g.inventory.isEmpty()) {
            BlockPos c = nearestChest(sl);
            returned = true;
            if (c != null) { begin(Job.RETURN, -1, c); return; }
        }
        if (stuck > 0) g.setStatus("donepartial", stuck);
        else g.setStatus(blocked > 0 ? "doneblocked" : "done", blocked);
        if (!announced) {
            announced = true;
            g.tellOwner(Component.translatable("buildgolem.msg.done", g.planTitle()));
            g.playSound(SoundEvents.VILLAGER_CELEBRATE, 1, .7f);
        }
        g.cursor = 0;
        scan = 0;
        resetPass();
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
        BlockPos p = plan.pos(target);
        BlockState want = plan.state(target), cur = sl.getBlockState(p);
        if (cur.is(want.getBlock()) || !cur.isAir() && !cur.canBeReplaced()) { job = Job.NONE; return; }
        Item item = want.getBlock().asItem();
        int cost = Plan.cost(want);
        if (count(item) < cost) { job = Job.NONE; return; }
        g.setCarry(new ItemStack(item));
        g.setStatus("building", percent(plan));
        int r = approach(sl, p, REACH);
        if (r < 0) { deferred.set(target); job = Job.NONE; return; }
        if (r == 0) return;
        g.getLookControl().setLookAt(Vec3.atCenterOf(p));
        if (cooldown > 0) return;
        AABB cell = new AABB(p);
        if (g.getBoundingBox().intersects(cell)) {              // estorba él mismo: se aparta
            BlockPos spot = standSpot(sl, p, REACH, p);
            if (spot == null) { deferred.set(target); job = Job.NONE; } else hop(sl, spot);
            return;
        }
        if (!sl.getEntities((Entity) null, cell, e -> e.isAlive() && e.blocksBuilding).isEmpty()) { deferred.set(target); job = Job.NONE; return; }
        ItemStack used = g.inventory.removeItemType(item, cost);
        if (put(sl, p, want, used)) {
            cooldown = PLACE_EVERY;
            known++;
            progress = true;
            announced = false;
            returned = false;
            g.swing(InteractionHand.MAIN_HAND);
        } else {
            g.inventory.addItem(used);
            deferred.set(target);
        }
        job = Job.NONE;
        scan = target;
    }

    /** Pone el bloque como lo pondría el dueño: si una protección de terreno no se lo permite a él, no se pone. */
    private boolean put(ServerLevel sl, BlockPos p, BlockState want, ItemStack used) {
        BlockSnapshot snap = BlockSnapshot.create(sl.dimension(), sl, p);
        if (!sl.setBlock(p, want, Block.UPDATE_ALL)) return false;
        Player owner = g.ownerPlayer();
        if (EventHooks.onBlockPlace(owner != null ? owner : g, snap, Direction.UP)) { snap.restore(Block.UPDATE_ALL); return false; }
        want.getBlock().setPlacedBy(sl, p, want, owner, used.copyWithCount(1));
        SoundType st = want.getSoundType(sl, p, g);
        sl.playSound(null, p, st.getPlaceSound(), SoundSource.BLOCKS, (st.getVolume() + 1) / 2f, st.getPitch() * .8f);
        sl.gameEvent(GameEvent.BLOCK_PLACE, p, GameEvent.Context.of(g, want));
        return true;
    }

    // ── cofres ──
    private IItemHandler handler(ServerLevel sl, BlockPos pos) {
        return sl.isLoaded(pos) ? sl.getCapability(Capabilities.ItemHandler.BLOCK, pos, null) : null;
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
        IItemHandler h = handler(sl, goal);
        if (h == null) { job = Job.NONE; return; }
        Item item = plan.state(target).getBlock().asItem();
        g.setCarry(ItemStack.EMPTY);
        g.setStatus("fetching", item.getDescription());
        int r = approach(sl, goal, CHEST_REACH);
        if (r < 0) { deferred.set(target); job = Job.NONE; return; }
        if (r == 0) return;
        g.getLookControl().setLookAt(Vec3.atCenterOf(goal));
        lid(sl, goal);
        for (var en : upcoming(sl, plan, target).entrySet()) {
            int want = en.getValue() - count(en.getKey());
            if (want > 0 && !takeFrom(h, en.getKey(), want)) break;    // inventario lleno
        }
        cooldown = 10;
        job = Job.NONE;
        scan = target;
    }

    /** Lo que pedirán los próximos bloques del plano, en orden de aparición. */
    private Map<Item, Integer> upcoming(ServerLevel sl, Plan plan, int from) {
        Map<Item, Integer> need = new LinkedHashMap<>();
        for (int i = from; i < Math.min(plan.count(), from + AHEAD) && need.size() < g.inventory.getContainerSize(); i++) {
            BlockPos p = plan.pos(i);
            if (!sl.isLoaded(p)) continue;
            BlockState cur = sl.getBlockState(p), want = plan.state(i);
            if (cur.is(want.getBlock()) || !cur.isAir() && !cur.canBeReplaced() || Plan.free(want)) continue;
            Item item = want.getBlock().asItem();
            if (item != Items.AIR) need.merge(item, Plan.cost(want), Integer::sum);
        }
        return need;
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
