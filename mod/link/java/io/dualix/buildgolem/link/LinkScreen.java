// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import net.minecraft.Util;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.ConfirmScreen;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.core.Direction;
import net.minecraft.network.chat.Component;

/**
 * Menú de BuildGolem (tecla K o /buildgolem): vincular la cuenta con un código, elegir un diseño (tuyo o de la galería)
 * y, si hay uno proyectado, el panel para colocarlo: anclar, mover, girar, capas, auto-colocar, materiales y construir.
 * La disposición se ajusta a pantallas bajas o estrechas (escala de interfaz grande) para que nada se pise.
 */
public final class LinkScreen extends Screen {
    private enum Mode { START, CODE, LIST }
    private static final int PER_PAGE = 6, PANEL_ROWS = 8, ACCENT = 0xFFFFC21A, MUTED = 0xFF9AA4AE, TEXT = 0xFFEEF1F4;

    private Mode mode;
    private String deviceCode, userCode, verifyUrl, status = "";
    private int interval = 5, pollIn;
    private boolean gallery, polling;
    private JsonArray designs;
    private int page;

    public LinkScreen() {
        super(Actions.t("title"));
        mode = LinkConfig.linked() || Projection.active != null ? Mode.LIST : Mode.START;
        gallery = !LinkConfig.linked();
        if (mode == Mode.LIST) loadList();
    }

    private boolean panelOn() { return Projection.active != null && mode != Mode.CODE; }

    private boolean tall() { return height >= 290; }

    private int top() { return tall() ? 44 : 30; }

    private int step() { return tall() ? 22 : 21; }

    private int panelW() { return 212; }

    /** En una pantalla muy estrecha no caben la lista y el panel: se ve solo el panel (al quitar el diseño vuelve la lista). */
    private boolean listOn() { return !panelOn() || width >= 400; }

    private int panelX() { return listOn() ? Math.min(width / 2 + 8, width - panelW() - 8) : (width - panelW()) / 2; }

    private int listW() { return panelOn() ? Math.max(120, Math.min(200, panelX() - 30)) : 200; }

    private int listX() { return panelOn() ? panelX() - 22 - listW() : width / 2 - 100; }

    private int panelBottom() { return top() + 26 + (PANEL_ROWS - 1) * step() + 20; }

    @Override
    protected void init() {
        switch (mode) {
            case START -> {
                int x = listX(), y = top() + 32;
                addRenderableWidget(Button.builder(Actions.t("link"), b -> startLink()).bounds(x, y, listW(), 20).build());
                addRenderableWidget(Button.builder(Actions.t("gallery"), b -> { gallery = true; mode = Mode.LIST; loadList(); rebuildWidgets(); }).bounds(x, y + 24, listW(), 20).build());
            }
            case CODE -> {
                int x = width / 2 - 100, y = height / 2 + 30;
                Button open = Button.builder(Actions.t("openweb"), b -> { copyCode(); Util.getPlatform().openUri(verifyUrl + "?code=" + userCode); })
                    .bounds(x, y, 200, 20).build();
                open.active = userCode != null;
                addRenderableWidget(open);
                Button copy = Button.builder(Actions.t("copycode"), b -> copyCode()).bounds(x, y + 24, 98, 20).build();
                copy.active = userCode != null;
                addRenderableWidget(copy);
                addRenderableWidget(Button.builder(Actions.t("cancel"), b -> { deviceCode = null; userCode = null; status = ""; mode = Mode.START; rebuildWidgets(); })
                    .bounds(x + 102, y + 24, 98, 20).build());
            }
            case LIST -> { if (listOn()) list(); }
        }
        if (panelOn()) panel(panelX(), top());
        addRenderableWidget(Button.builder(Actions.t("options"), b -> minecraft.setScreen(new OptionsScreen(this))).bounds(width - 86, 4, 80, 20).build());
    }

    private void list() {
        int x = listX(), y = top(), w = listW(), half = (w - 4) / 2;
        if (LinkConfig.linked()) {
            addRenderableWidget(Button.builder(gallery ? Actions.t("mine") : Actions.t("gallery"), b -> { gallery = !gallery; loadList(); rebuildWidgets(); })
                .bounds(x, y, half, 20).build());
            addRenderableWidget(Button.builder(Actions.t("unlink.btn"), b -> { LinkConfig.unlink(); Actions.say(Actions.t("unlinked")); gallery = true; loadList(); rebuildWidgets(); })
                .bounds(x + w - half, y, half, 20).build());
        } else {
            addRenderableWidget(Button.builder(Actions.t("link"), b -> startLink()).bounds(x, y, w, 20).build());
        }
        if (designs == null) return;
        int from = page * PER_PAGE;
        for (int i = from; i < Math.min(designs.size(), from + PER_PAGE); i++) {
            JsonObject o = designs.get(i).getAsJsonObject();
            String id = o.get("id").getAsString(), title = o.get("title").getAsString();
            Actions.titles.put(id, title);
            String label = font.plainSubstrByWidth(title, w - 14);
            Button b = Button.builder(Component.literal(label), btn -> { onClose(); Actions.load(id, title, null); }).bounds(x, rowY(i - from), w, 20).build();
            if (o.has("author") && o.get("author").isJsonObject()) b.setTooltip(Tooltip.create(Component.literal(title + "\n@" + o.getAsJsonObject("author").get("handle").getAsString())));
            else if (!label.equals(title)) b.setTooltip(Tooltip.create(Component.literal(title)));
            addRenderableWidget(b);
        }
        int pages = (designs.size() + PER_PAGE - 1) / PER_PAGE;
        if (pages > 1) {
            int py = rowY(PER_PAGE) + 2;
            Button prev = Button.builder(Component.literal("‹"), b -> { page--; rebuildWidgets(); }).bounds(x, py, 30, 20).build();
            prev.active = page > 0;
            Button next = Button.builder(Component.literal("›"), b -> { page++; rebuildWidgets(); }).bounds(x + w - 30, py, 30, 20).build();
            next.active = page < pages - 1;
            addRenderableWidget(prev);
            addRenderableWidget(next);
        }
    }

    /** Altura de la fila n de la lista de diseños. */
    private int rowY(int n) { return top() + 30 + n * step(); }

    private Button small(String label, Runnable r, int x, int y, int w, Component tip) {
        Button b = Button.builder(Component.literal(label), btn -> r.run()).bounds(x, y, w, 20).build();
        if (tip != null) b.setTooltip(Tooltip.create(tip));
        return addRenderableWidget(b);
    }

    private Button half(Component label, Runnable r, int x, int y) {
        return addRenderableWidget(Button.builder(label, btn -> { r.run(); rebuildWidgets(); }).bounds(x, y, 104, 20).build());
    }

    /** Ayuda de una flecha: la dirección en que mueve (en modo brújula) y su tecla. */
    private static Component arrowTip(Direction compass, Component key) {
        Component dir = LinkConfig.MOVE_MODE.get() == LinkConfig.MoveMode.COMPASS || compass.getAxis().isVertical()
            ? Actions.t("dir." + compass.getName()) : Actions.t("dir.view");
        return Component.empty().append(dir).append(" · ").append(key);
    }

    /** Panel del diseño proyectado. Cada acción reconstruye los botones para que reflejen el estado nuevo. */
    private void panel(int x, int y) {
        Projection p = Projection.active;
        int r = x + 108, s = step();
        y += 26;
        half(Actions.t("here"), Actions::anchorHere, x, y);
        half(Actions.t("look"), Actions::anchorLook, r, y);
        y += s;
        half(Actions.t("center"), Actions::centerOnMe, x, y);
        half(Actions.t("rotate"), Actions::rotate, r, y);
        y += s;
        int w = 33, g = 2;
        small("←", () -> Actions.nudgeView(-1, 0, 0), x, y, w, arrowTip(Direction.WEST, Keys.MOVE_LEFT.getTranslatedKeyMessage()));
        small("↑", () -> Actions.nudgeView(0, 0, 1), x + (w + g), y, w, arrowTip(Direction.NORTH, Keys.MOVE_FWD.getTranslatedKeyMessage()));
        small("↓", () -> Actions.nudgeView(0, 0, -1), x + 2 * (w + g), y, w, arrowTip(Direction.SOUTH, Keys.MOVE_BACK.getTranslatedKeyMessage()));
        small("→", () -> Actions.nudgeView(1, 0, 0), x + 3 * (w + g), y, w, arrowTip(Direction.EAST, Keys.MOVE_RIGHT.getTranslatedKeyMessage()));
        small("▲", () -> Actions.nudgeView(0, 1, 0), x + 4 * (w + g), y, w, arrowTip(Direction.UP, Keys.MOVE_UP.getTranslatedKeyMessage()));
        small("▼", () -> Actions.nudgeView(0, -1, 0), x + 5 * (w + g), y, w, arrowTip(Direction.DOWN, Keys.MOVE_DOWN.getTranslatedKeyMessage()));
        y += s;
        half(Actions.t("layerdown"), () -> Actions.layerStep(-1), x, y);
        half(Actions.t("layerup"), () -> Actions.layerStep(1), r, y);
        y += s;
        half(p.layer < 0 ? Actions.t("onelayer") : Actions.t("layerall"), () -> Actions.layer(p.layer < 0 ? 0 : -1), x, y);
        half(p.visible ? Actions.t("hide") : Actions.t("show"), Actions::toggle, r, y);
        y += s;
        Button auto = half(Printer.on ? Actions.t("auto.btn.on") : Actions.t("auto.btn.off"), Printer::toggle, x, y);
        auto.setTooltip(Tooltip.create(Actions.t("auto.tip")));
        addRenderableWidget(Button.builder(Actions.t("materials"), b -> minecraft.setScreen(new MaterialsScreen(this))).bounds(r, y, 104, 20).build());
        y += s;
        Button build = Builder.running()
            ? half(Actions.t("build.stop"), Builder::cancel, x, y)
            : addRenderableWidget(Button.builder(Actions.t("build.btn"), b -> confirmBuild(this, p.layer >= 0)).bounds(x, y, 104, 20).build());
        build.active = Builder.allowed();
        build.setTooltip(Tooltip.create(Builder.allowed() ? Actions.t("build.tip") : Actions.t("build.noperm")));
        Button undo = half(Actions.t("build.undo"), Builder::undo, r, y);
        undo.active = Builder.canUndo();
        y += s;
        addRenderableWidget(Button.builder(Actions.t("clear"), b -> { Actions.clear(); mode = LinkConfig.linked() ? Mode.LIST : Mode.START; rebuildWidgets(); })
            .bounds(x, y, panelW(), 20).build());
    }

    /** Confirmación antes de construir con comandos. back: pantalla a la que volver (null = cerrar). */
    static void confirmBuild(Screen back, boolean layerOnly) {
        if (!Actions.need()) return;
        if (!Builder.allowed()) { Actions.say(Actions.t("build.noperm")); return; }
        Minecraft mc = Minecraft.getInstance();
        Projection p = Projection.active;
        boolean lo = layerOnly && p.layer >= 0;
        int n = 0;
        for (int i = 0; i < p.entries.size(); i++)
            if (p.status[i] != Projection.PLACED && (!lo || p.y(i) == p.layer) && (p.filter == null || p.want(i).is(p.filter))) n++;
        if (n == 0) { Actions.say(Actions.t("build.nothing")); return; }
        Component msg = lo ? Actions.t("build.confirm.layer", p.layer + 1) : Actions.t("build.confirm.all", n);
        mc.setScreen(new ConfirmScreen(ok -> { mc.setScreen(back); if (ok && Projection.active != null) Builder.start(Projection.active, lo); },
            Actions.t("build.confirm.title"), msg));
    }

    private void startLink() {
        mode = Mode.CODE; status = Actions.t("asking").getString(); userCode = null; deviceCode = null;
        rebuildWidgets();
        Api.startLink().thenAccept(j -> minecraft.execute(() -> {
            if (mode != Mode.CODE) return;
            deviceCode = j.get("device_code").getAsString();
            userCode = j.get("user_code").getAsString();
            verifyUrl = j.get("verification_uri").getAsString();
            interval = j.has("interval") ? j.get("interval").getAsInt() : 5;
            pollIn = interval * 20;
            copyCode();
            rebuildWidgets();
        })).exceptionally(t -> { minecraft.execute(() -> status = Actions.t("error", Api.message(t)).getString()); return null; });
    }

    private void copyCode() {
        if (userCode == null) return;
        minecraft.keyboardHandler.setClipboard(userCode);
        status = Actions.t("copied", userCode).getString();
    }

    private void loadList() {
        designs = null; page = 0;
        (gallery || !LinkConfig.linked() ? Api.gallery() : Api.myDesigns()).thenAccept(a -> Minecraft.getInstance().execute(() -> {
            designs = a;
            if (minecraft != null && minecraft.screen == this) rebuildWidgets();
        })).exceptionally(t -> {
            Minecraft.getInstance().execute(() -> { status = Actions.t("error", Api.message(t)).getString(); designs = new JsonArray(); });
            return null;
        });
    }

    @Override
    public void tick() {
        if (mode != Mode.CODE || deviceCode == null || polling || --pollIn > 0) return;
        pollIn = interval * 20;
        polling = true;
        String dc = deviceCode;
        Api.pollLink(dc).thenAccept(j -> minecraft.execute(() -> {
            polling = false;
            if (j == null || !dc.equals(deviceCode)) return;
            JsonObject u = j.getAsJsonObject("user");
            String name = u.has("name") ? u.get("name").getAsString() : u.get("handle").getAsString();
            LinkConfig.link(j.get("token").getAsString(), name);
            Actions.say(Actions.t("linked", name));
            deviceCode = null; userCode = null; status = "";
            mode = Mode.LIST; gallery = false;
            loadList();
            rebuildWidgets();
        })).exceptionally(t -> {
            minecraft.execute(() -> {
                polling = false;
                Throwable c = t.getCause() != null ? t.getCause() : t;
                if (c instanceof Api.ApiError e && e.status == 410) { deviceCode = null; userCode = null; status = ""; mode = Mode.START; rebuildWidgets(); }
                else status = Actions.t("error", Api.message(t)).getString();
            });
            return null;
        });
    }

    @Override
    public void renderBackground(GuiGraphics g, int mx, int my, float pt) {
        super.renderBackground(g, mx, my, pt);
        if (panelOn()) {
            int x = panelX(), t = top();
            g.fill(x - 6, t - 6, x + panelW() + 6, panelBottom() + 6, 0xC0121518);
            g.fill(x - 6, t - 6, x + panelW() + 6, t - 4, ACCENT);
        }
    }

    @Override
    public void render(GuiGraphics g, int mx, int my, float pt) {
        super.render(g, mx, my, pt);
        int t = top();
        g.drawCenteredString(font, title, width / 2, tall() ? 14 : 6, ACCENT);
        int cx = listX() + listW() / 2, w = listW();
        switch (mode) {
            case START -> {
                drawClipped(g, Actions.t("intro1"), cx, t, w + 24, TEXT);
                drawClipped(g, Actions.t("intro2"), cx, t + 12, w + 24, MUTED);
            }
            case CODE -> {
                int y = height / 2 - 50;
                if (verifyUrl != null) g.drawCenteredString(font, Actions.t("codehelp", verifyUrl), width / 2, y, TEXT);
                if (userCode != null) {
                    g.pose().pushPose();
                    g.pose().scale(3, 3, 1);
                    g.drawCenteredString(font, userCode, width / 6, (y + 16) / 3, ACCENT);
                    g.pose().popPose();
                    g.drawCenteredString(font, Actions.t("waiting"), width / 2, y + 50, MUTED);
                }
            }
            case LIST -> {
                if (!listOn()) break;
                Component head = gallery || !LinkConfig.linked() ? Actions.t("gallery.title") : Actions.t("mine.title", LinkConfig.USER.get());
                drawClipped(g, head, cx, t - 12, w, TEXT);
                if (designs == null) g.drawCenteredString(font, Actions.t("loadinglist"), cx, rowY(1), MUTED);
                else if (designs.isEmpty()) drawClipped(g, gallery ? Actions.t("emptygallery") : Actions.t("nodesigns"), cx, rowY(1), w, MUTED);
                else if (designs.size() > PER_PAGE) {
                    int pages = (designs.size() + PER_PAGE - 1) / PER_PAGE;
                    g.drawCenteredString(font, (page + 1) + " / " + pages, cx, rowY(PER_PAGE) + 8, MUTED);
                }
            }
        }
        if (!status.isEmpty() && listOn()) {
            int sy = Math.max(height - 22, mode == Mode.LIST && designs != null && designs.size() > PER_PAGE ? rowY(PER_PAGE) + 26 : 0);
            drawClipped(g, Component.literal(status), mode == Mode.CODE ? width / 2 : cx, sy, mode == Mode.CODE ? width - 20 : w + 24, MUTED);
        }
        if (panelOn()) {
            Projection p = Projection.active;
            int x = panelX();
            g.drawString(font, font.plainSubstrByWidth(Actions.t("active", p.title).getString(), panelW()), x, t + 2, ACCENT, false);
            int pct = p.total == 0 ? 0 : p.placed * 100 / p.total;
            Component layer = p.layer < 0 ? Actions.t("panel.all") : Component.literal((p.layer + 1) + "/" + p.sizeY);
            g.drawString(font, Actions.t("panel.stats", pct, layer), x, t + 13, MUTED, false);
        }
    }

    /** Texto centrado que se corta (con …) si no cabe, para que no pise el panel de al lado. */
    private void drawClipped(GuiGraphics g, Component c, int cx, int y, int maxW, int color) {
        String s = c.getString();
        if (font.width(s) > maxW) s = font.plainSubstrByWidth(s, maxW - font.width("…")) + "…";
        g.drawCenteredString(font, s, cx, y, color);
    }

    @Override
    public boolean isPauseScreen() { return false; }
}
