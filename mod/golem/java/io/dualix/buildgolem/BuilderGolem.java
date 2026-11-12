// SPDX-License-Identifier: MIT
package io.dualix.buildgolem;

import com.mojang.serialization.Codec;
import net.minecraft.core.BlockPos;
import net.minecraft.core.GlobalPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.NbtOps;
import net.minecraft.network.chat.Component;
import net.minecraft.network.syncher.EntityDataAccessor;
import net.minecraft.network.syncher.EntityDataSerializers;
import net.minecraft.network.syncher.SynchedEntityData;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.SimpleContainer;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.ai.attributes.AttributeModifier;
import net.minecraft.world.entity.ai.attributes.AttributeSupplier;
import net.minecraft.world.entity.ai.attributes.Attributes;
import net.minecraft.world.entity.ai.goal.FloatGoal;
import net.minecraft.world.entity.ai.goal.LookAtPlayerGoal;
import net.minecraft.world.entity.ai.goal.OpenDoorGoal;
import net.minecraft.world.entity.ai.goal.RandomLookAroundGoal;
import net.minecraft.world.entity.ai.navigation.GroundPathNavigation;
import net.minecraft.world.entity.animal.AbstractGolem;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * El Gólem Constructor. Lleva un plano y hasta 5 cofres asignados; construye el plano sacando los bloques de esos cofres,
 * a ritmo de jugador (≈1,6 bloques/s más lo que camina; con engranajes de obra, hasta ≈6,6/s). Solo obedece a su dueño.
 * Clic con el plano: se lo das. Con el vinculador: le asignas sus cofres. Con un engranaje de obra: lo mejoras (hasta 3).
 * Mano vacía: pausa/sigue. Agachado con la mano vacía: lo recoges. Lingote de hierro: lo reparas.
 * Tiene humor (lo ve el cliente para animarlo): trabajando, confuso si le falta algo, contento al terminar.
 */
public class BuilderGolem extends AbstractGolem {
    private static final EntityDataAccessor<Component> STATUS = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.COMPONENT);
    private static final EntityDataAccessor<ItemStack> PLAN_ITEM = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.ITEM_STACK);
    private static final EntityDataAccessor<ItemStack> CARRY = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.ITEM_STACK);
    private static final EntityDataAccessor<Boolean> READING = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.BOOLEAN);
    private static final EntityDataAccessor<Byte> MOOD = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.BYTE);
    private static final EntityDataAccessor<Integer> GEARS = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.INT);
    private static final Codec<List<GlobalPos>> CHESTS_CODEC = GlobalPos.CODEC.listOf();
    private static final ResourceLocation GEAR_SPEED = BuildGolem.id("work_gear");
    public static final byte IDLE = 0, WORK = 1, CONFUSED = 2, HAPPY = 3;
    public static final int MAX_GEARS = 3;
    private static final int[] PLACE_EVERY = { 12, 8, 5, 3 };              // ticks entre bloque y bloque según los engranajes

    final SimpleContainer inventory = new SimpleContainer(18);
    final List<GlobalPos> chests = new ArrayList<>();
    /** Lo que faltaba en la última vuelta al plano, para contárselo al dueño. */
    final Map<Item, Integer> lastMissing = new LinkedHashMap<>();
    UUID owner;
    boolean paused;
    int waitTicks;
    private int closeChestIn, happyFor;
    private BlockPos openChest;
    private Plan plan;
    private UUID planId;

    public BuilderGolem(EntityType<? extends BuilderGolem> type, Level level) {
        super(type, level);
        ((GroundPathNavigation) getNavigation()).setCanOpenDoors(true);
        setPersistenceRequired();
    }

    public static AttributeSupplier.Builder attributes() {
        return createMobAttributes().add(Attributes.MAX_HEALTH, 80).add(Attributes.MOVEMENT_SPEED, 0.3).add(Attributes.KNOCKBACK_RESISTANCE, 1.0)
            .add(Attributes.FOLLOW_RANGE, 64).add(Attributes.ARMOR, 6).add(Attributes.STEP_HEIGHT, 1.0);
    }

    @Override
    protected void defineSynchedData(SynchedEntityData.Builder b) {
        super.defineSynchedData(b);
        b.define(STATUS, Component.empty());
        b.define(PLAN_ITEM, ItemStack.EMPTY);
        b.define(CARRY, ItemStack.EMPTY);
        b.define(READING, false);
        b.define(MOOD, IDLE);
        b.define(GEARS, 0);
    }

    @Override
    protected void registerGoals() {
        goalSelector.addGoal(0, new FloatGoal(this));
        goalSelector.addGoal(1, new BuildGoal(this));
        goalSelector.addGoal(2, new OpenDoorGoal(this, true));
        goalSelector.addGoal(3, new LookAtPlayerGoal(this, Player.class, 8));
        goalSelector.addGoal(4, new RandomLookAroundGoal(this));
    }

    // ── estado que ve el cliente ──
    public Component status() { return entityData.get(STATUS); }

    public ItemStack planItem() { return entityData.get(PLAN_ITEM); }

    public boolean hasPlan() { return !planItem().isEmpty(); }

    public ItemStack carried() { return entityData.get(CARRY); }

    public boolean isReading() { return entityData.get(READING); }

    void setStatus(String key, Object... args) {
        Component c = Component.translatable("buildgolem.status." + key, args);
        if (!c.equals(status())) entityData.set(STATUS, c);
    }

    void setReading(boolean r) { if (r != isReading()) entityData.set(READING, r); }

    void setCarry(ItemStack s) { if (!ItemStack.matches(s, carried())) entityData.set(CARRY, s.copyWithCount(1)); }

    public byte mood() { return entityData.get(MOOD); }

    public int gears() { return entityData.get(GEARS); }

    /** Ticks entre bloque y bloque: los engranajes y, con el capataz cerca, un 25 % menos. */
    int placeEvery() { int t = PLACE_EVERY[Math.min(MAX_GEARS, gears())]; return foreman ? Math.max(2, t * 3 / 4) : t; }

    private boolean foreman;
    private static final double FOREMAN_RANGE = 16;

    /** Cada segundo: ¿anda cerca su dueño con casco y chaleco? Al llegar, le saluda (si no está a mitad de algo, con los brazos arriba). */
    private void watchForeman(ServerLevel sl) {
        Player o = ownerPlayer();
        boolean now = o != null && o.isAlive() && !o.isSpectator() && o.distanceToSqr(this) < FOREMAN_RANGE * FOREMAN_RANGE && Content.foreman(o);
        if (now && !foreman) {
            getLookControl().setLookAt(o, 30, 30);
            playSound(SoundEvents.IRON_GOLEM_REPAIR, .6f, 1.5f);
            sl.sendParticles(ParticleTypes.NOTE, getX(), getY() + 2.4, getZ(), 1, 0, 0, 0, 1);
            if (mood() == IDLE) { entityData.set(MOOD, HAPPY); happyFor = 30; }
        }
        foreman = now;
    }

    double reach() { return 4.5 + .5 * gears(); }

    /** Cambia de humor; al entrar en uno nuevo reacciona (rascarse la cabeza con un resoplido, o celebrarlo). */
    void setMood(byte m) {
        if (m == mood()) return;
        entityData.set(MOOD, m);
        if (!(level() instanceof ServerLevel sl)) return;
        if (m == CONFUSED) {
            playSound(SoundEvents.VILLAGER_NO, .8f, .55f);
            sl.sendParticles(ParticleTypes.SMOKE, getX(), getY() + 2.2, getZ(), 6, .15, .1, .15, .01);
        } else if (m == HAPPY) {
            happyFor = 70;
            playSound(SoundEvents.VILLAGER_CELEBRATE, 1, .7f);
            playSound(SoundEvents.NOTE_BLOCK_CHIME.value(), .7f, 1.2f);
            sl.sendParticles(ParticleTypes.HAPPY_VILLAGER, getX(), getY() + 1.6, getZ(), 18, .6, .6, .6, .1);
            sl.sendParticles(ParticleTypes.FIREWORK, getX(), getY() + 2.4, getZ(), 14, .3, .2, .3, .08);
        }
    }

    /** Los engranajes de obra también le hacen caminar más deprisa (+20 % cada uno). */
    private void applyGears() {
        var speed = getAttribute(Attributes.MOVEMENT_SPEED);
        if (speed == null) return;
        speed.removeModifier(GEAR_SPEED);
        if (gears() > 0) speed.addTransientModifier(new AttributeModifier(GEAR_SPEED, .2 * gears(), AttributeModifier.Operation.ADD_MULTIPLIED_BASE));
    }

    // ── plano ──
    /** El plano que lleva, cargado del mundo; null si no lleva o si no existe aquí. */
    Plan plan() {
        BlueprintInfo info = planItem().get(Content.PLAN.get());
        if (info == null || !(level() instanceof ServerLevel sl)) { plan = null; planId = null; return null; }
        if (!info.id().equals(planId)) { planId = info.id(); plan = Plan.get(sl.getServer(), planId); }
        return plan;
    }

    String planTitle() { BlueprintInfo i = planItem().get(Content.PLAN.get()); return i == null ? "" : i.title(); }

    Player ownerPlayer() { return owner == null ? null : level().getPlayerByUUID(owner); }

    public void claim(UUID id) { owner = id; }

    void tellOwner(Component c) { Player p = ownerPlayer(); if (p != null) p.sendSystemMessage(c); }

    // ── cofres ──
    /** Abre la tapa de un cofre un momento, como haría un jugador. */
    void openLid(BlockPos pos) {
        BlockState s = level().getBlockState(pos);
        level().blockEvent(pos, s.getBlock(), 1, 1);
        level().playSound(null, pos, SoundEvents.CHEST_OPEN, SoundSource.BLOCKS, .5f, 1.1f);
        openChest = pos; closeChestIn = 14;
    }

    @Override
    protected void customServerAiStep() {
        super.customServerAiStep();
        if (waitTicks > 0) waitTicks--;
        if (openChest != null && --closeChestIn <= 0) {
            level().blockEvent(openChest, level().getBlockState(openChest).getBlock(), 1, 0);
            level().playSound(null, openChest, SoundEvents.CHEST_CLOSE, SoundSource.BLOCKS, .5f, 1.1f);
            openChest = null;
        }
        if (happyFor > 0 && --happyFor == 0 && mood() == HAPPY) setMood(IDLE);
        if (tickCount % 20 == 0 && level() instanceof ServerLevel sl) watchForeman(sl);
        if (!hasPlan()) { setStatus("noplan"); setReading(false); if (mood() != HAPPY) setMood(IDLE); }
        else if (paused) { setStatus("paused"); setReading(true); if (mood() != HAPPY) setMood(IDLE); }
    }

    // ── interacción ──
    @Override
    protected InteractionResult mobInteract(Player player, InteractionHand hand) {
        ItemStack held = player.getItemInHand(hand);
        if (level().isClientSide) return InteractionResult.SUCCESS;
        if (owner != null && !owner.equals(player.getUUID()) && !player.hasPermissions(2)) {
            Player o = ownerPlayer();
            player.sendSystemMessage(Component.translatable("buildgolem.msg.notyours", o != null ? o.getName() : Component.literal("?")));
            return InteractionResult.CONSUME;
        }
        if (held.is(Items.IRON_INGOT) && getHealth() < getMaxHealth()) {
            heal(20);
            if (!player.getAbilities().instabuild) held.shrink(1);
            playSound(SoundEvents.IRON_GOLEM_REPAIR, 1, 1.1f);
            return InteractionResult.CONSUME;
        }
        if (held.is(Content.WORK_GEAR.get())) {
            if (gears() >= MAX_GEARS) { player.sendSystemMessage(Component.translatable("buildgolem.msg.maxgears", MAX_GEARS)); return InteractionResult.CONSUME; }
            entityData.set(GEARS, gears() + 1);
            applyGears();
            if (!player.getAbilities().instabuild) held.shrink(1);
            playSound(SoundEvents.SMITHING_TABLE_USE, 1, 1.2f);
            playSound(SoundEvents.BEACON_POWER_SELECT, .5f, 1.6f);
            if (level() instanceof ServerLevel sl) sl.sendParticles(ParticleTypes.WAX_ON, getX(), getY() + 2.1, getZ(), 16, .3, .2, .3, .5);
            player.sendSystemMessage(Component.translatable("buildgolem.msg.gear", gears(), MAX_GEARS, placeEvery(), String.format(java.util.Locale.ROOT, "%.1f", reach())));
            return InteractionResult.CONSUME;
        }
        if (held.is(Content.BLUEPRINT.get())) {
            ItemStack old = planItem();
            entityData.set(PLAN_ITEM, held.copyWithCount(1));
            if (!player.getAbilities().instabuild) held.shrink(1);
            if (!old.isEmpty() && !player.getInventory().add(old)) spawnAtLocation(old);
            waitTicks = 0; paused = false; plan = null; planId = null;
            if (plan() == null) player.sendSystemMessage(Component.translatable("buildgolem.msg.planmissing"));
            else player.sendSystemMessage(Component.translatable("buildgolem.msg.gotplan", planTitle()));
            playSound(SoundEvents.BOOK_PAGE_TURN, 1, 1);
            return InteractionResult.CONSUME;
        }
        if (held.is(Content.BINDER.get())) {
            List<GlobalPos> list = held.getOrDefault(Content.CHESTS.get(), List.of());
            chests.clear();
            chests.addAll(list);
            waitTicks = 0;
            player.sendSystemMessage(Component.translatable("buildgolem.msg.gotchests", list.size()));
            playSound(SoundEvents.ITEM_FRAME_ADD_ITEM, 1, 1);
            return InteractionResult.CONSUME;
        }
        if (held.isEmpty() && player.isSecondaryUseActive()) { packUp(player); return InteractionResult.CONSUME; }
        if (held.isEmpty()) {
            paused = !paused;
            waitTicks = 0;
            getNavigation().stop();
            player.sendSystemMessage(Component.translatable(paused ? "buildgolem.msg.paused" : "buildgolem.msg.resumed", status()));
            if (!lastMissing.isEmpty()) {
                net.minecraft.network.chat.MutableComponent line = Component.translatable("buildgolem.msg.needs");
                int n = 0;
                for (var en : lastMissing.entrySet()) {
                    if (n++ == 6) { line.append(" …"); break; }
                    line.append(n == 1 ? " " : ", ").append(en.getValue() + "× ").append(en.getKey().getDescription());
                }
                player.sendSystemMessage(line);
            }
            return InteractionResult.CONSUME;
        }
        return InteractionResult.PASS;
    }

    /** Agachado con la mano vacía: vuelve a ser un objeto, y suelta su plano y lo que llevaba. */
    private void packUp(Player player) {
        dropAll();
        ItemStack self = new ItemStack(Content.BUILDER_GOLEM.get());
        if (!player.getInventory().add(self)) spawnAtLocation(self);
        playSound(SoundEvents.IRON_GOLEM_DAMAGE, 1, 1.3f);
        if (level() instanceof ServerLevel sl) sl.sendParticles(ParticleTypes.POOF, getX(), getY() + 1, getZ(), 16, .4, .6, .4, .02);
        discard();
    }

    private void dropAll() {
        if (hasPlan()) { spawnAtLocation(planItem()); entityData.set(PLAN_ITEM, ItemStack.EMPTY); }
        for (ItemStack s : inventory.removeAllItems()) spawnAtLocation(s);
        if (gears() > 0) { spawnAtLocation(new ItemStack(Content.WORK_GEAR.get(), gears())); entityData.set(GEARS, 0); }
    }

    @Override
    protected void dropCustomDeathLoot(ServerLevel level, DamageSource source, boolean recentlyHit) {
        super.dropCustomDeathLoot(level, source, recentlyHit);
        dropAll();
        spawnAtLocation(new ItemStack(Content.GOLEM_CORE.get()));
    }

    @Override
    public boolean causeFallDamage(float distance, float mult, DamageSource source) { return false; }

    @Override
    protected SoundEvent getHurtSound(DamageSource source) { return SoundEvents.IRON_GOLEM_HURT; }

    @Override
    protected SoundEvent getDeathSound() { return SoundEvents.IRON_GOLEM_DEATH; }

    @Override
    protected void playStepSound(BlockPos pos, BlockState state) { playSound(SoundEvents.IRON_GOLEM_STEP, .6f, 1.2f); }

    @Override
    public boolean removeWhenFarAway(double distance) { return false; }

    // ── guardar ──
    @Override
    public void addAdditionalSaveData(CompoundTag t) {
        super.addAdditionalSaveData(t);
        if (owner != null) t.putUUID("Owner", owner);
        t.putBoolean("Paused", paused);
        t.putInt("Gears", gears());
        CHESTS_CODEC.encodeStart(NbtOps.INSTANCE, chests).result().ifPresent(n -> t.put("Chests", n));
        if (hasPlan()) t.put("Plan", planItem().save(registryAccess()));
        t.put("Carry", inventory.createTag(registryAccess()));
    }

    @Override
    public void readAdditionalSaveData(CompoundTag t) {
        super.readAdditionalSaveData(t);
        owner = t.hasUUID("Owner") ? t.getUUID("Owner") : null;
        paused = t.getBoolean("Paused");
        entityData.set(GEARS, Math.max(0, Math.min(MAX_GEARS, t.getInt("Gears"))));
        applyGears();
        chests.clear();
        if (t.contains("Chests")) CHESTS_CODEC.parse(NbtOps.INSTANCE, t.get("Chests")).result().ifPresent(chests::addAll);
        Optional<ItemStack> p = t.contains("Plan") ? ItemStack.parse(registryAccess(), t.getCompound("Plan")) : Optional.empty();
        entityData.set(PLAN_ITEM, p.orElse(ItemStack.EMPTY));
        inventory.fromTag(t.getList("Carry", 10), registryAccess());
    }
}
