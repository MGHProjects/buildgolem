// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import com.mojang.blaze3d.platform.InputConstants;
import net.minecraft.client.KeyMapping;
import net.minecraft.client.Minecraft;
import net.neoforged.neoforge.client.event.InputEvent;
import net.neoforged.neoforge.client.event.RegisterKeyMappingsEvent;
import net.neoforged.neoforge.client.settings.KeyConflictContext;
import net.neoforged.neoforge.client.settings.KeyModifier;
import org.lwjgl.glfw.GLFW;

import java.util.HashMap;
import java.util.Map;

/**
 * Teclas (Opciones → Controles → BuildGolem). Se leen directamente de la pulsación, no de los "clics" acumulados de
 * Minecraft: una pulsación = un paso; si la mantienes, tras 0,35 s repite a ritmo fijo, y al soltar para en seco.
 */
public final class Keys {
    private static final String CAT = "key.categories.buildgolem_link";
    private static KeyMapping key(String name, int code) { return new KeyMapping("key.buildgolem_link." + name, KeyConflictContext.IN_GAME, InputConstants.Type.KEYSYM, code, CAT); }
    private static KeyMapping shift(String name, int code) { return new KeyMapping("key.buildgolem_link." + name, KeyConflictContext.IN_GAME, KeyModifier.SHIFT, InputConstants.Type.KEYSYM, code, CAT); }

    public static final KeyMapping MENU = key("menu", GLFW.GLFW_KEY_K);
    public static final KeyMapping LAYER_UP = key("layer_up", GLFW.GLFW_KEY_PAGE_UP);
    public static final KeyMapping LAYER_DOWN = key("layer_down", GLFW.GLFW_KEY_PAGE_DOWN);
    public static final KeyMapping MOVE_FWD = key("move_forward", GLFW.GLFW_KEY_UP);
    public static final KeyMapping MOVE_BACK = key("move_back", GLFW.GLFW_KEY_DOWN);
    public static final KeyMapping MOVE_LEFT = key("move_left", GLFW.GLFW_KEY_LEFT);
    public static final KeyMapping MOVE_RIGHT = key("move_right", GLFW.GLFW_KEY_RIGHT);
    public static final KeyMapping MOVE_UP = shift("move_up", GLFW.GLFW_KEY_UP);
    public static final KeyMapping MOVE_DOWN = shift("move_down", GLFW.GLFW_KEY_DOWN);
    public static final KeyMapping ROTATE = key("rotate", InputConstants.UNKNOWN.getValue());
    public static final KeyMapping AUTO = key("auto_place", InputConstants.UNKNOWN.getValue());
    public static final KeyMapping TOGGLE = key("toggle", InputConstants.UNKNOWN.getValue());
    private static final KeyMapping[] ALL = { MENU, LAYER_UP, LAYER_DOWN, MOVE_UP, MOVE_DOWN, MOVE_FWD, MOVE_BACK, MOVE_LEFT, MOVE_RIGHT, ROTATE, AUTO, TOGGLE };
    private static final Map<KeyMapping, Runnable> DO = new HashMap<>();
    private static final Map<KeyMapping, Long> HELD = new HashMap<>();
    private static final long FIRST_REPEAT = 350, EVERY = 110;   // ms

    static {
        DO.put(MENU, () -> Minecraft.getInstance().setScreen(new LinkScreen()));
        DO.put(LAYER_UP, () -> Actions.layerStep(1));
        DO.put(LAYER_DOWN, () -> Actions.layerStep(-1));
        DO.put(MOVE_FWD, () -> Actions.nudgeView(0, 0, 1));
        DO.put(MOVE_BACK, () -> Actions.nudgeView(0, 0, -1));
        DO.put(MOVE_LEFT, () -> Actions.nudgeView(-1, 0, 0));
        DO.put(MOVE_RIGHT, () -> Actions.nudgeView(1, 0, 0));
        DO.put(MOVE_UP, () -> Actions.nudgeView(0, 1, 0));
        DO.put(MOVE_DOWN, () -> Actions.nudgeView(0, -1, 0));
        DO.put(ROTATE, Actions::rotate);
        DO.put(AUTO, Printer::toggle);
        DO.put(TOGGLE, Actions::toggle);
    }

    static void register(RegisterKeyMappingsEvent e) { for (KeyMapping k : ALL) e.register(k); }

    /** Pulsación real: la primera actúa al momento; mantener repite desde tick(). */
    static void input(InputEvent.Key e) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.screen != null || mc.player == null || e.getAction() == GLFW.GLFW_REPEAT) return;
        InputConstants.Key k = InputConstants.getKey(e.getKey(), e.getScanCode());
        for (KeyMapping m : ALL) {
            if (!m.getKey().equals(k)) continue;
            if (e.getAction() == GLFW.GLFW_RELEASE) { HELD.remove(m); continue; }
            if (!m.isActiveAndMatches(k)) continue;                 // con Mayús gana la versión con Mayús, y al revés
            HELD.put(m, System.currentTimeMillis() + FIRST_REPEAT);
            DO.get(m).run();
            if (m == MENU) HELD.remove(m);
            break;
        }
    }

    static void tick() {
        Minecraft mc = Minecraft.getInstance();
        if (mc.screen != null) { HELD.clear(); return; }
        long now = System.currentTimeMillis();
        for (var en : HELD.entrySet()) {
            if (now < en.getValue()) continue;
            en.setValue(now + EVERY);
            DO.get(en.getKey()).run();
        }
        for (KeyMapping k : ALL) while (k.consumeClick()) { /* se gestionan arriba; vaciar evita dobles */ }
    }

    private Keys() {}
}
