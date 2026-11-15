// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.screens.ChatScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.neoforge.client.event.RegisterGuiLayersEvent;

import java.util.ArrayList;
import java.util.List;

/**
 * Letrero con el progreso del diseño proyectado: capa, siguiente bloque, errores y lo que está en marcha.
 * Se configura en Opciones (completo, compacto u oculto; rincón y tamaño) y no sale con el holograma oculto ni con un menú abierto.
 */
final class Hud {
    static void register(RegisterGuiLayersEvent e) {
        e.registerAboveAll(ResourceLocation.fromNamespaceAndPath(BuildGolemLink.MOD_ID, "hud"), Hud::render);
    }

    private static void render(GuiGraphics g, DeltaTracker dt) {
        Minecraft mc = Minecraft.getInstance();
        Projection p = Projection.active;
        LinkConfig.HudMode mode = LinkConfig.HUD.get();
        if (p == null || p.anchor == null || !p.visible || mode == LinkConfig.HudMode.OFF || mc.player == null || mc.level == null
            || mc.options.hideGui || mc.getDebugOverlay().showDebugScreen()) return;
        if (mc.screen != null && !(mc.screen instanceof ChatScreen)) return;          // encima de un menú pisaría sus textos
        if (p.dimension != null && !p.dimension.equals(mc.level.dimension().location().toString())) return;
        List<Component> lines = new ArrayList<>();
        lines.add(Component.literal(p.title));
        int pct = p.total == 0 ? 0 : p.placed * 100 / p.total;
        lines.add(p.layer < 0 ? Actions.t("hud.all", pct)
            : Actions.t("hud.layer", p.layer + 1, p.sizeY, p.anchor.getY() + p.layer, p.layerPlaced, p.layerTotal, pct));
        if (mode == LinkConfig.HudMode.FULL) {
            if (p.filter != null) lines.add(Actions.t("hud.filter", p.filter.getName()));
            if (p.wrong + p.turned > 0) lines.add(Actions.t("hud.wrong", p.wrong, p.turned));
            if (p.partial > 0) lines.add(Actions.t("hud.partial", p.partial));
            if (p.layerDone()) lines.add(Actions.t("hud.layerdone"));
            else if (p.nextIndex >= 0 && p.nextPos != null)
                lines.add(Actions.t("hud.next", p.label(p.nextIndex), p.nextPos.getX(), p.nextPos.getY(), p.nextPos.getZ()));
            if (Printer.on) lines.add(Actions.t("hud.auto", Printer.placed()));
            if (Builder.running()) lines.add(Actions.t("hud.build", Builder.progress()));
            lines.add(Actions.t("hud.keys", Keys.LAYER_UP.getTranslatedKeyMessage(), Keys.LAYER_DOWN.getTranslatedKeyMessage(), Keys.MENU.getTranslatedKeyMessage()));
        } else if (Builder.running()) lines.add(Actions.t("hud.build", Builder.progress()));

        float s = LinkConfig.HUD_SCALE.get() / 100f;
        int w = 0;
        for (Component c : lines) w = Math.max(w, mc.font.width(c));
        int h = lines.size() * 10, sw = (int) (g.guiWidth() / s), sh = (int) (g.guiHeight() / s);
        LinkConfig.Corner corner = LinkConfig.HUD_CORNER.get();
        boolean right = corner == LinkConfig.Corner.TOP_RIGHT || corner == LinkConfig.Corner.BOTTOM_RIGHT;
        boolean bottom = corner == LinkConfig.Corner.BOTTOM_LEFT || corner == LinkConfig.Corner.BOTTOM_RIGHT;
        int x = right ? sw - w - 6 : 6, y = bottom ? sh - h - 6 : 6;
        if (bottom && x < sw / 2 + 100 / s && x + w > sw / 2 - 100 / s) y -= (int) (52 / s);   // por encima de la barra de objetos y la vida
        g.pose().pushPose();
        g.pose().scale(s, s, 1);
        g.fill(x - 4, y - 4, x + w + 4, y + h + 2, 0xB0121518);
        g.fill(x - 4, y - 4, x + w + 4, y - 2, 0xFFFFC21A);
        for (int i = 0; i < lines.size(); i++) {
            int color = i == 0 ? 0xFFFFC21A : i == lines.size() - 1 && mode == LinkConfig.HudMode.FULL ? 0xFF9AA4AE : 0xFFEEF1F4;
            g.drawString(mc.font, lines.get(i), x, y + i * 10, color, false);
        }
        g.pose().popPose();
    }

    private Hud() {}
}
