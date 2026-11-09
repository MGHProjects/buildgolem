// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;

import java.util.List;

/** Lo que falta por poner contra lo que llevas. Clic en un bloque: el holograma enseña solo ese. */
final class MaterialsScreen extends Screen {
    private static final int TOP = 40, ROW = 20, ACCENT = 0xFFFFC21A, MUTED = 0xFF9AA4AE, TEXT = 0xFFEEF1F4;
    private final Screen back;
    private List<Projection.Material> rows = List.of();
    private int scroll;

    MaterialsScreen(Screen back) { super(Actions.t("materials.title")); this.back = back; }

    @Override
    protected void init() {
        rows = Projection.active == null || minecraft.player == null ? List.of() : Projection.active.materials(minecraft.player.getInventory());
        scroll = Math.min(scroll, Math.max(0, rows.size() - visible()));
        int y = height - 28;
        addRenderableWidget(Button.builder(Actions.t("back"), b -> onClose()).bounds(width / 2 - 154, y, 100, 20).build());
        Button copy = addRenderableWidget(Button.builder(Actions.t("materials.copy"), b -> copy()).bounds(width / 2 - 50, y, 100, 20).build());
        copy.active = rows.stream().anyMatch(m -> m.missing() > 0);
        Button clear = addRenderableWidget(Button.builder(Actions.t("filter.clear"), b -> { Actions.filter(Projection.active.filter); rebuildWidgets(); })
            .bounds(width / 2 + 54, y, 100, 20).build());
        clear.active = Projection.active != null && Projection.active.filter != null;
    }

    private int left() { return width / 2 - 180; }

    private int visible() { return Math.max(1, (height - 50 - TOP) / ROW); }

    @Override
    public void onClose() { minecraft.setScreen(back); }

    private void copy() {
        StringBuilder sb = new StringBuilder();
        int n = 0;
        for (Projection.Material m : rows) if (m.missing() > 0) { sb.append(m.missing()).append('\t').append(m.name()).append('\n'); n++; }
        minecraft.keyboardHandler.setClipboard(sb.toString());
        Actions.bar(Actions.t("materials.copied", n));
    }

    private int rowAt(double mx, double my) {
        if (mx < left() || mx > left() + 360 || my < TOP) return -1;
        int r = (int) ((my - TOP) / ROW);
        if (r >= visible()) return -1;
        int i = scroll + r;
        return i < rows.size() ? i : -1;
    }

    @Override
    public boolean mouseScrolled(double mx, double my, double sx, double sy) {
        scroll = Math.max(0, Math.min(Math.max(0, rows.size() - visible()), scroll - (int) Math.signum(sy)));
        return true;
    }

    @Override
    public boolean mouseClicked(double mx, double my, int button) {
        if (super.mouseClicked(mx, my, button)) return true;
        int i = rowAt(mx, my);
        if (i < 0) return false;
        Actions.filter(rows.get(i).block());
        minecraft.setScreen(null);
        return true;
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float pt) {
        super.render(g, mx, my, pt);
        int x = left();
        g.drawCenteredString(font, title, width / 2, 8, ACCENT);
        g.drawCenteredString(font, Actions.t("materials.hint"), width / 2, 19, MUTED);
        if (rows.isEmpty()) { g.drawCenteredString(font, Actions.t("materials.done"), width / 2, TOP + 20, TEXT); return; }
        g.drawString(font, Actions.t("materials.need"), x + 230, TOP - 10, MUTED, false);
        g.drawString(font, Actions.t("materials.have"), x + 278, TOP - 10, MUTED, false);
        g.drawString(font, Actions.t("materials.missing"), x + 322, TOP - 10, MUTED, false);
        int hover = rowAt(mx, my);
        Projection p = Projection.active;
        for (int r = 0; r < visible() && scroll + r < rows.size(); r++) {
            Projection.Material m = rows.get(scroll + r);
            int y = TOP + r * ROW;
            if (p != null && p.filter == m.block()) g.fill(x, y, x + 360, y + ROW - 1, 0x44FFC21A);
            else if (scroll + r == hover) g.fill(x, y, x + 360, y + ROW - 1, 0x33FFFFFF);
            if (m.item() != Items.AIR) g.renderItem(new ItemStack(m.item()), x + 2, y + 1);
            g.drawString(font, font.plainSubstrByWidth(m.name(), 200), x + 22, y + 6, TEXT, false);
            g.drawString(font, String.valueOf(m.need()), x + 230, y + 6, TEXT, false);
            g.drawString(font, String.valueOf(m.have()), x + 278, y + 6, TEXT, false);
            g.drawString(font, String.valueOf(m.missing()), x + 322, y + 6, m.missing() > 0 ? 0xFFFF8A80 : 0xFF7CFC9A, false);
        }
        int total = rows.stream().mapToInt(Projection.Material::missing).sum();
        g.drawCenteredString(font, Actions.t("materials.total", total), width / 2, height - 42, MUTED);
    }

    @Override
    public boolean isPauseScreen() { return false; }
}
