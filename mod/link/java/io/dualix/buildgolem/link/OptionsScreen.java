// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import net.neoforged.neoforge.common.ModConfigSpec;

import java.util.List;
import java.util.Locale;
import java.util.function.Function;

/**
 * Opciones del jugador (se guardan en config/buildgolem_link-client.toml): el letrero, las flechas, el holograma y el ritmo
 * de auto-colocar y de construir. Cada botón pasa al valor siguiente. Pantalla propia para no enseñar el token de la cuenta.
 */
final class OptionsScreen extends Screen {
    private static final int ACCENT = 0xFFFFC21A, MUTED = 0xFF9AA4AE;
    private final Screen back;

    OptionsScreen(Screen back) { super(Actions.t("opt.title")); this.back = back; }

    private static <E extends Enum<E>> Function<E, Component> named(String key) {
        return v -> Actions.t("opt." + key + "." + v.name().toLowerCase(Locale.ROOT));
    }

    @Override
    protected void init() {
        int l = width / 2 - 155, r = width / 2 + 5, y = height >= 260 ? 40 : 30, step = 24;
        cycle(l, y, "hud", LinkConfig.HUD, List.of(LinkConfig.HudMode.values()), named("hud"));
        cycle(r, y, "corner", LinkConfig.HUD_CORNER, List.of(LinkConfig.Corner.values()), named("corner"));
        y += step;
        cycle(l, y, "scale", LinkConfig.HUD_SCALE, List.of(50, 75, 100, 125, 150), v -> Component.literal(v + " %"));
        cycle(r, y, "arrows", LinkConfig.MOVE_MODE, List.of(LinkConfig.MoveMode.values()), named("arrows"));
        y += step;
        cycle(l, y, "alpha", LinkConfig.GHOST_ALPHA, List.of(15, 30, 45, 60, 75, 90), v -> Component.literal(v + " %"));
        cycle(r, y, "range", LinkConfig.GHOST_RANGE, List.of(32, 64, 128, 256, 512), v -> Actions.t("opt.blocks", v));
        y += step;
        cycle(l, y, "nextlayer", LinkConfig.AUTO_NEXT_LAYER, List.of(true, false), v -> Actions.t(v ? "opt.yes" : "opt.no"));
        cycle(r, y, "delay", LinkConfig.PLACE_DELAY, List.of(1, 2, 3, 5, 10, 20), v -> Actions.t("opt.ticks", v));
        y += step;
        cycle(l, y, "commands", LinkConfig.COMMANDS_PER_TICK, List.of(10, 30, 100, 400), v -> Component.literal(String.valueOf(v)));
        addRenderableWidget(Button.builder(Actions.t("back"), b -> onClose()).bounds(width / 2 - 100, height - 28, 200, 20).build());
    }

    /** Un botón "Nombre: valor"; el clic pasa al siguiente valor de la lista (si el del archivo no está en ella, al primero). */
    private <T> void cycle(int x, int y, String key, ModConfigSpec.ConfigValue<T> cfg, List<T> values, Function<T, Component> name) {
        Button b = Button.builder(Actions.t("opt." + key, name.apply(cfg.get())), btn -> {
            cfg.set(values.get((values.indexOf(cfg.get()) + 1) % values.size()));
            LinkConfig.SPEC.save();
            if (key.equals("alpha") && Projection.active != null) Projection.active.changed();   // la opacidad va dentro de la malla
            rebuildWidgets();
        }).bounds(x, y, 150, 20).build();
        b.setTooltip(Tooltip.create(Actions.t("opt." + key + ".tip")));
        addRenderableWidget(b);
    }

    @Override
    public void onClose() { minecraft.setScreen(back); }

    @Override
    public void render(GuiGraphics g, int mx, int my, float pt) {
        super.render(g, mx, my, pt);
        g.drawCenteredString(font, title, width / 2, height >= 260 ? 14 : 8, ACCENT);
        g.drawCenteredString(font, Actions.t("opt.hint"), width / 2, height - 42, MUTED);
    }

    @Override
    public boolean isPauseScreen() { return false; }
}
