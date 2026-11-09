// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import com.google.gson.JsonObject;
import net.minecraft.client.Minecraft;
import net.minecraft.core.BlockPos;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;
import net.minecraft.world.level.block.Rotation;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;

import java.util.HashMap;
import java.util.Map;

/** Lo que hacen el menú, las teclas y los comandos: cargar, anclar, mover, girar, cambiar de capa, ocultar y quitar. */
public final class Actions {
    /** Títulos de los diseños vistos en listas, para que /buildgolem load muestre el nombre y no el id. */
    public static final Map<String, String> titles = new HashMap<>();

    public static Component t(String key, Object... args) { return Component.translatable("buildgolem_link." + key, args); }

    public static void say(Component c) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player != null) mc.player.displayClientMessage(Component.literal("[BuildGolem] ").withStyle(s -> s.withColor(0xFFC21A)).append(c), false);
    }

    /** Aviso corto encima de la barra de objetos (para lo que se repite: mover, capas). */
    public static void bar(Component c) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player != null) mc.player.displayClientMessage(c, true);
    }

    public static void fail(Throwable t) { Minecraft.getInstance().execute(() -> say(t("error", Api.message(t)))); }

    private static BlockPos feet() { return Minecraft.getInstance().player.blockPosition(); }

    /** Descarga un diseño y lo ancla donde estás (la esquina del diseño en tus pies). */
    public static void load(String id, String title, JsonObject restore) {
        say(t("loading", title));
        Api.nbt(id).thenAccept(bytes -> Minecraft.getInstance().execute(() -> {
            try {
                Projection p = Projection.fromNbt(id, title, bytes);
                if (restore != null) p.restore(restore);
                else { p.anchor = feet(); p.dimension = Minecraft.getInstance().level.dimension().location().toString(); }
                Printer.stop(); Builder.forgetUndo();
                Projection.active = p;
                p.save();
                say(t("loaded", title, p.sizeX, p.sizeY, p.sizeZ, p.entries.size()));
                if (!p.missingMods.isEmpty()) say(t("missingmods", String.join(", ", p.missingMods)));
            } catch (Exception e) { fail(e); }
        })).exceptionally(e -> { fail(e); return null; });
    }

    public static boolean need() {
        if (Projection.active != null) return true;
        say(t("none"));
        return false;
    }

    private static void moved() {
        Projection p = Projection.active;
        p.changed(); p.save();
        bar(t("anchored", p.anchor.getX(), p.anchor.getY(), p.anchor.getZ()));
    }

    public static void anchorHere() {
        if (!need()) return;
        Projection p = Projection.active;
        p.anchor = feet(); p.dimension = Minecraft.getInstance().level.dimension().location().toString();
        moved();
    }

    /** La esquina del diseño en el bloque que miras (encima o al lado de la cara que apuntas). */
    public static void anchorLook() {
        if (!need()) return;
        HitResult h = Minecraft.getInstance().hitResult;
        if (!(h instanceof BlockHitResult b) || h.getType() != HitResult.Type.BLOCK) { bar(t("lookblock")); return; }
        Projection p = Projection.active;
        p.anchor = b.getBlockPos().relative(b.getDirection()); p.dimension = Minecraft.getInstance().level.dimension().location().toString();
        moved();
    }

    /** El diseño centrado en ti, con su base a la altura de tus pies. */
    public static void centerOnMe() {
        if (!need()) return;
        Projection p = Projection.active;
        BlockPos s = p.rotatedSize(), sign = new BlockPos(1, 1, 1).rotate(p.rotation), f = feet();
        int loX = Math.min(0, sign.getX() * (s.getX() - 1)), loZ = Math.min(0, sign.getZ() * (s.getZ() - 1));
        p.anchor = f.offset(-loX - s.getX() / 2, 0, -loZ - s.getZ() / 2);
        p.dimension = Minecraft.getInstance().level.dimension().location().toString();
        moved();
    }

    /** Mueve el ancla un bloque según hacia dónde miras: adelante/atrás, izquierda/derecha y arriba/abajo. */
    public static void nudgeView(int right, int up, int forward) {
        if (!need()) return;
        Direction f = Minecraft.getInstance().player.getDirection(), r = f.getClockWise();
        Projection p = Projection.active;
        p.anchor = p.anchor.relative(f, forward).relative(r, right).above(up);
        moved();
    }

    public static void rotate() {
        if (!need()) return;
        Projection p = Projection.active;
        p.setRotation(p.rotation.getRotated(Rotation.CLOCKWISE_90)); p.save();
        bar(t("rotated", switch (p.rotation) { case NONE -> 0; case CLOCKWISE_90 -> 90; case CLOCKWISE_180 -> 180; case COUNTERCLOCKWISE_90 -> 270; }));
    }

    public static void layer(int to) {
        if (!need()) return;
        Projection p = Projection.active;
        int v = to < 0 ? -1 : Math.min(p.sizeY - 1, to);
        if (v == p.layer) return;
        p.layer = v; p.changed(); p.save();
        bar(p.layer < 0 ? t("layer.all") : t("layer", p.layer + 1, p.sizeY, p.anchor.getY() + p.layer));
    }

    public static void layerStep(int d) {
        if (!need()) return;
        Projection p = Projection.active;
        layer(p.layer < 0 ? (d > 0 ? 0 : p.sizeY - 1) : Math.max(0, Math.min(p.sizeY - 1, p.layer + d)));
    }

    public static void filter(net.minecraft.world.level.block.Block b) {
        if (!need()) return;
        Projection p = Projection.active;
        p.filter = p.filter == b ? null : b; p.changed();
        bar(p.filter == null ? t("filter.off") : t("filter.on", b.getName()));
    }

    public static void toggle() {
        if (!need()) return;
        Projection.active.visible = !Projection.active.visible;
        bar(Projection.active.visible ? t("shown") : t("hidden"));
    }

    public static void clear() {
        Printer.stop();
        Projection.active = null;
        Projection.forget();
        GhostMesh.clear();
        say(t("cleared"));
    }

    private Actions() {}
}
