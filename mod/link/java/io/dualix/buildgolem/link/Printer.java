// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import net.minecraft.client.Minecraft;
import net.minecraft.client.multiplayer.ClientLevel;
import net.minecraft.client.player.LocalPlayer;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.network.protocol.game.ServerboundMovePlayerPacket;
import net.minecraft.network.protocol.game.ServerboundPlayerCommandPacket;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.inventory.ClickType;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.level.GameType;
import net.minecraft.world.level.block.Block;
import net.minecraft.world.level.block.state.BlockState;
import net.minecraft.world.level.block.state.properties.BlockStateProperties;
import net.minecraft.world.level.block.state.properties.Half;
import net.minecraft.world.level.block.state.properties.SlabType;
import net.minecraft.world.phys.AABB;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.Vec3;

import java.util.HashMap;
import java.util.Map;

/**
 * Auto-colocar: mientras está encendido, pone el siguiente bloque que falta a tu alcance si lo llevas encima
 * (en creativo, cualquiera). Coloca como lo harías tú: mira hacia donde toca para que la máquina quede orientada,
 * hace clic en la cara de un bloque vecino y, si ese vecino tiene interfaz, lo hace agachado para no abrirla.
 * Construye de abajo arriba. Cada servidor decide si lo permite: no salta ninguna regla del juego.
 */
final class Printer {
    static boolean on;
    private static int cooldown, placedCount;
    /** Bloques que miran hacia ti al ponerlos (horno, máquinas) o en tu misma dirección (escaleras): se aprende al primer fallo. */
    private static final Map<Block, Boolean> SAME_AS_LOOK = new HashMap<>();
    private static Block lastBlock;
    private static int lastIndex = -1, checkIn;
    private static boolean lastSame;

    static void toggle() {
        if (!Actions.need()) return;
        on = !on; placedCount = 0;
        Actions.say(on ? Actions.t("auto.on") : Actions.t("auto.off"));
    }

    static void stop() { on = false; lastIndex = -1; }

    static int placed() { return placedCount; }

    static void tick(Minecraft mc) {
        Projection p = Projection.active;
        if (!on || p == null || p.anchor == null || mc.player == null || mc.level == null || mc.gameMode == null || mc.screen != null) return;
        learn(p);
        if (--cooldown > 0) return;
        LocalPlayer pl = mc.player;
        boolean creative = mc.gameMode.getPlayerMode() == GameType.CREATIVE;
        if (mc.gameMode.getPlayerMode() == GameType.SPECTATOR || mc.gameMode.getPlayerMode() == GameType.ADVENTURE) return;
        double reach = pl.blockInteractionRange() - .25, r2 = reach * reach;
        Vec3 eye = pl.getEyePosition();
        AABB me = pl.getBoundingBox();
        int best = -1; double bestScore = Double.MAX_VALUE; Direction bestFace = null;
        for (int i = 0; i < p.entries.size(); i++) {
            if (p.status[i] != Projection.MISSING || !p.shown(i)) continue;
            BlockPos pos = p.world(i);
            double d = eye.distanceToSqr(Vec3.atCenterOf(pos));
            if (d > r2 || me.intersects(new AABB(pos))) continue;
            Item item = p.want(i).getBlock().asItem();
            if (item == Items.AIR || (!creative && slotOf(pl.getInventory(), item) < 0)) continue;
            Direction face = support(mc.level, pos, p.want(i));
            if (face == null) continue;
            double score = pos.getY() * 4096.0 + d;                 // de abajo arriba y, en la misma altura, lo más cercano
            if (score < bestScore) { bestScore = score; best = i; bestFace = face; }
        }
        if (best < 0) return;
        if (place(mc, pl, p, best, bestFace, creative)) { placedCount++; cooldown = LinkConfig.PLACE_DELAY.get(); }
        else cooldown = 10;
    }

    /** Tras poner un bloque con orientación, comprueba cómo quedó y aprende la convención de ese bloque. */
    private static void learn(Projection p) {
        if (lastIndex < 0 || --checkIn > 0) return;
        byte s = lastIndex < p.status.length ? p.status[lastIndex] : Projection.UNKNOWN;
        if (s == Projection.TURNED) { SAME_AS_LOOK.put(lastBlock, !lastSame); Actions.bar(Actions.t("auto.learned", lastBlock.getName())); }
        lastIndex = -1;
    }

    private static int slotOf(Inventory inv, Item item) {
        for (int s = 0; s < 9; s++) if (inv.getItem(s).is(item)) return s;
        for (int s = 9; s < 36; s++) if (inv.getItem(s).is(item)) return s;
        return -1;
    }

    /** La cara del vecino en la que hacer clic: un bloque sólido al lado; con eje (troncos) o mitad de arriba, el que encaja. */
    private static Direction support(ClientLevel level, BlockPos pos, BlockState want) {
        Direction best = null; int bestScore = -1;
        for (Direction d : Direction.values()) {
            BlockPos n = pos.relative(d);
            BlockState ns = level.getBlockState(n);
            if (ns.isAir() || ns.canBeReplaced()) continue;
            int score = 1;
            if (level.getBlockEntity(n) == null) score += 2;          // mejor no hacer clic sobre una máquina
            if (want.hasProperty(BlockStateProperties.AXIS) && d.getAxis() == want.getValue(BlockStateProperties.AXIS)) score += 4;
            if (upper(want) ? d == Direction.UP : d == Direction.DOWN) score += 1;
            if (score > bestScore) { bestScore = score; best = d; }
        }
        return best;
    }

    private static boolean upper(BlockState s) {
        return s.hasProperty(BlockStateProperties.HALF) && s.getValue(BlockStateProperties.HALF) == Half.TOP
            || s.hasProperty(BlockStateProperties.SLAB_TYPE) && s.getValue(BlockStateProperties.SLAB_TYPE) == SlabType.TOP;
    }

    private static boolean place(Minecraft mc, LocalPlayer pl, Projection p, int i, Direction toNeighbor, boolean creative) {
        BlockState want = p.want(i);
        Item item = want.getBlock().asItem();
        Inventory inv = pl.getInventory();
        // 1. el bloque en la mano
        if (!inv.getItem(inv.selected).is(item)) {
            int slot = slotOf(inv, item);
            if (slot < 0 && creative) {
                inv.setItem(inv.selected, new ItemStack(item));
                mc.gameMode.handleCreativeModeItemAdd(inv.getItem(inv.selected), 36 + inv.selected);
            } else if (slot >= 0 && slot < 9) inv.selected = slot;
            else if (slot >= 9) mc.gameMode.handleInventoryMouseClick(pl.inventoryMenu.containerId, slot, inv.selected, ClickType.SWAP, pl);
            else return false;
        }
        // 2. mirar hacia donde toca para que quede orientado
        BlockPos pos = p.world(i), neighbor = pos.relative(toNeighbor);
        float yaw = pl.getYRot(), pitch = pl.getXRot();
        Direction f = Projection.facing(want);
        if (f != null) {
            boolean same = SAME_AS_LOOK.getOrDefault(want.getBlock(), false);
            Direction look = same ? f : f.getOpposite();
            if (look.getAxis().isHorizontal()) { yaw = look.toYRot(); pitch = 0; } else pitch = look == Direction.DOWN ? 90 : -90;
            lastBlock = want.getBlock(); lastSame = same; lastIndex = i; checkIn = 12;
        }
        // 3. clic en la cara del vecino que da al hueco (agachado si el vecino tiene interfaz)
        Direction face = toNeighbor.getOpposite();
        Vec3 hit = Vec3.atCenterOf(neighbor).add(face.getStepX() * .5, face.getStepY() * .5, face.getStepZ() * .5);
        if (face.getAxis().isHorizontal()) hit = hit.add(0, upper(want) ? .25 : -.25, 0);
        boolean sneak = mc.level.getBlockEntity(neighbor) != null && !pl.isShiftKeyDown();
        float oldYaw = pl.getYRot(), oldPitch = pl.getXRot();
        if (f != null) { pl.connection.send(new ServerboundMovePlayerPacket.Rot(yaw, pitch, pl.onGround())); pl.setYRot(yaw); pl.setXRot(pitch); }
        if (sneak) { pl.connection.send(new ServerboundPlayerCommandPacket(pl, ServerboundPlayerCommandPacket.Action.PRESS_SHIFT_KEY)); pl.setShiftKeyDown(true); }
        InteractionResult r = mc.gameMode.useItemOn(pl, InteractionHand.MAIN_HAND, new BlockHitResult(hit, face, neighbor, false));
        if (sneak) { pl.connection.send(new ServerboundPlayerCommandPacket(pl, ServerboundPlayerCommandPacket.Action.RELEASE_SHIFT_KEY)); pl.setShiftKeyDown(false); }
        if (f != null) { pl.setYRot(oldYaw); pl.setXRot(oldPitch); }
        if (r.consumesAction()) pl.swing(InteractionHand.MAIN_HAND);
        return r.consumesAction();
    }

    private Printer() {}
}
