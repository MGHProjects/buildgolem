// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import net.minecraft.client.DeltaTracker;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.neoforged.neoforge.client.event.RegisterGuiLayersEvent;

import java.util.ArrayList;
import java.util.List;

/** Caja arriba a la izquierda con el progreso del diseño proyectado: capa, siguiente bloque, errores y lo que está en marcha. */
final class Hud {
    static void register(RegisterGuiLayersEvent e) {
        e.registerAboveAll(ResourceLocation.fromNamespaceAndPath(BuildGolemLink.MOD_ID, "hud"), Hud::render);
    }

    private static void render(GuiGraphics g, DeltaTracker dt) {
        Minecraft mc = Minecraft.getInstance();
        Projection p = Projection.active;
        if (p == null || p.anchor == null || mc.player == null || mc.options.hideGui || mc.getDebugOverlay().showDebugScreen()) return;
        List<Component> lines = new ArrayList<>();
        Component title = Component.literal(p.title);
        if (!p.visible) title = title.copy().append(" · ").append(Actions.t("hidden.short"));
        lines.add(title);
        int pct = p.total == 0 ? 0 : p.placed * 100 / p.total;
        lines.add(p.layer < 0 ? Actions.t("hud.all", pct)
            : Actions.t("hud.layer", p.layer + 1, p.sizeY, p.anchor.getY() + p.layer, p.layerPlaced, p.layerTotal, pct));
        if (p.filter != null) lines.add(Actions.t("hud.filter", p.filter.getName()));
        if (p.wrong + p.turned > 0) lines.add(Actions.t("hud.wrong", p.wrong, p.turned));
        if (p.layerDone()) lines.add(Actions.t("hud.layerdone"));
        else if (p.nextIndex >= 0 && p.nextPos != null)
            lines.add(Actions.t("hud.next", p.want(p.nextIndex).getBlock().getName(), p.nextPos.getX(), p.nextPos.getY(), p.nextPos.getZ()));
        if (Printer.on) lines.add(Actions.t("hud.auto", Printer.placed()));
        if (Builder.running()) lines.add(Actions.t("hud.build", Builder.progress()));
        lines.add(Actions.t("hud.keys", Keys.LAYER_UP.getTranslatedKeyMessage(), Keys.LAYER_DOWN.getTranslatedKeyMessage(), Keys.MENU.getTranslatedKeyMessage()));
        int w = 0;
        for (Component c : lines) w = Math.max(w, mc.font.width(c));
        int x = 6, y = 6, h = lines.size() * 10;
        g.fill(x - 4, y - 4, x + w + 4, y + h + 2, 0xB0121518);
        g.fill(x - 4, y - 4, x + w + 4, y - 2, 0xFFFFC21A);
        for (int i = 0; i < lines.size(); i++) {
            int color = i == 0 ? 0xFFFFC21A : i == lines.size() - 1 ? 0xFF9AA4AE : 0xFFEEF1F4;
            g.drawString(mc.font, lines.get(i), x, y + i * 10, color, false);
        }
    }

    private Hud() {}
}
