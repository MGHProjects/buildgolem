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
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.SimpleContainer;
import net.minecraft.world.damagesource.DamageSource;
import net.minecraft.world.entity.EntityType;
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
 * El Gólem Constructor. Lleva un plano y hasta 5 cofres asignados; construye el plano de abajo arriba sacando los
 * bloques de esos cofres, a ritmo de jugador (≈1,6 bloques/s más lo que camina). Solo obedece a su dueño.
 * Clic con el plano: se lo das. Con el vinculador: le asignas sus cofres. Mano vacía: pausa/sigue.
 * Agachado con la mano vacía: lo recoges. Lingote de hierro: lo reparas.
 */
public class BuilderGolem extends AbstractGolem {
    private static final EntityDataAccessor<Component> STATUS = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.COMPONENT);
    private static final EntityDataAccessor<ItemStack> PLAN_ITEM = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.ITEM_STACK);
    private static final EntityDataAccessor<ItemStack> CARRY = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.ITEM_STACK);
    private static final EntityDataAccessor<Boolean> READING = SynchedEntityData.defineId(BuilderGolem.class, EntityDataSerializers.BOOLEAN);
    private static final Codec<List<GlobalPos>> CHESTS_CODEC = GlobalPos.CODEC.listOf();

    final SimpleContainer inventory = new SimpleContainer(18);
    final List<GlobalPos> chests = new ArrayList<>();
    /** Lo que faltaba en la última vuelta al plano, para contárselo al dueño. */
    final Map<Item, Integer> lastMissing = new LinkedHashMap<>();
    UUID owner;
    boolean paused;
    int waitTicks, cursor;
    private int closeChestIn;
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
        if (!hasPlan()) { setStatus("noplan"); setReading(false); }
        else if (paused) { setStatus("paused"); setReading(true); }
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
        if (held.is(Content.BLUEPRINT.get())) {
            ItemStack old = planItem();
            entityData.set(PLAN_ITEM, held.copyWithCount(1));
            if (!player.getAbilities().instabuild) held.shrink(1);
            if (!old.isEmpty() && !player.getInventory().add(old)) spawnAtLocation(old);
            cursor = 0; waitTicks = 0; paused = false; plan = null; planId = null;
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
        t.putInt("Cursor", cursor);
        CHESTS_CODEC.encodeStart(NbtOps.INSTANCE, chests).result().ifPresent(n -> t.put("Chests", n));
        if (hasPlan()) t.put("Plan", planItem().save(registryAccess()));
        t.put("Carry", inventory.createTag(registryAccess()));
    }

    @Override
    public void readAdditionalSaveData(CompoundTag t) {
        super.readAdditionalSaveData(t);
        owner = t.hasUUID("Owner") ? t.getUUID("Owner") : null;
        paused = t.getBoolean("Paused");
        cursor = t.getInt("Cursor");
        chests.clear();
        if (t.contains("Chests")) CHESTS_CODEC.parse(NbtOps.INSTANCE, t.get("Chests")).result().ifPresent(chests::addAll);
        Optional<ItemStack> p = t.contains("Plan") ? ItemStack.parse(registryAccess(), t.getCompound("Plan")) : Optional.empty();
        entityData.set(PLAN_ITEM, p.orElse(ItemStack.EMPTY));
        inventory.fromTag(t.getList("Carry", 10), registryAccess());
    }
}
