// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import net.minecraft.client.Minecraft;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.world.level.Level;
import net.minecraft.world.level.block.state.BlockState;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Construir todo (o la capa) de golpe con comandos, si el servidor te da permisos de operador (o en un mundo con trucos).
 * Junta en un /fill cada tramo de bloques iguales seguidos y guarda lo que había para poder deshacerlo.
 * Los comandos los ejecuta el servidor con tus permisos: el mod solo los envía, poco a poco.
 */
final class Builder {
    private static final Deque<String> QUEUE = new ArrayDeque<>();
    private static List<String> undo = List.of();
    private static int total, sent;
    private static boolean undoing;

    static boolean allowed() { Minecraft mc = Minecraft.getInstance(); return mc.player != null && mc.player.hasPermissions(2); }

    static boolean running() { return !QUEUE.isEmpty(); }

    static boolean canUndo() { return !undo.isEmpty() && !running(); }

    static int progress() { return total == 0 ? 0 : (int) Math.round(100.0 * sent / total); }

    static void forgetUndo() { if (!running()) undo = List.of(); }

    /** Prepara los comandos. Solo bloques que faltan o están mal; nunca toca lo que ya está bien puesto. */
    static int start(Projection p, boolean layerOnly) {
        Minecraft mc = Minecraft.getInstance();
        Level level = mc.level;
        record Cell(BlockPos pos, String state) {}
        List<Cell> cells = new ArrayList<>();
        List<String> before = new ArrayList<>();
        for (int i = 0; i < p.entries.size(); i++) {
            byte s = p.status[i];
            if (s == Projection.PLACED || (layerOnly && p.layer >= 0 && p.y(i) != p.layer) || (p.filter != null && !p.want(i).is(p.filter))) continue;
            BlockState want = p.want(i);
            if (want.isAir()) continue;
            BlockPos pos = p.world(i);
            if (!level.isLoaded(pos)) continue;
            cells.add(new Cell(pos, BlockStateParser.serialize(want)));
            before.add(String.format("setblock %d %d %d %s", pos.getX(), pos.getY(), pos.getZ(), BlockStateParser.serialize(level.getBlockState(pos))));
        }
        if (cells.isEmpty()) return 0;
        // tramos en x de bloques iguales, por filas (y, z), de abajo arriba
        Map<String, List<Cell>> rows = new LinkedHashMap<>();
        cells.sort(Comparator.comparingInt((Cell c) -> c.pos().getY()).thenComparingInt(c -> c.pos().getZ()).thenComparingInt(c -> c.pos().getX()));
        for (Cell c : cells) rows.computeIfAbsent(c.pos().getY() + "|" + c.pos().getZ() + "|" + c.state(), k -> new ArrayList<>()).add(c);
        List<String> cmds = new ArrayList<>();
        for (List<Cell> row : rows.values()) {
            for (int a = 0; a < row.size(); ) {
                int b = a;
                while (b + 1 < row.size() && row.get(b + 1).pos().getX() == row.get(b).pos().getX() + 1) b++;
                BlockPos s = row.get(a).pos(), e = row.get(b).pos();
                cmds.add(a == b ? String.format("setblock %d %d %d %s", s.getX(), s.getY(), s.getZ(), row.get(a).state())
                                : String.format("fill %d %d %d %d %d %d %s", s.getX(), s.getY(), s.getZ(), e.getX(), e.getY(), e.getZ(), row.get(a).state()));
                a = b + 1;
            }
        }
        undo = before;
        queue(cmds, false);
        return cells.size();
    }

    static void undo() {
        if (!canUndo()) return;
        List<String> u = undo;
        undo = List.of();
        queue(u, true);
    }

    private static void queue(List<String> cmds, boolean isUndo) {
        QUEUE.clear();
        QUEUE.add("gamerule sendCommandFeedback false");             // sin un mensaje por comando en el chat
        QUEUE.addAll(cmds);
        QUEUE.add("gamerule sendCommandFeedback true");
        total = QUEUE.size(); sent = 0; undoing = isUndo;
        Actions.say(Actions.t(isUndo ? "build.undoing" : "build.start", cmds.size()));
    }

    static void cancel() {
        if (!running()) return;
        QUEUE.clear();
        Minecraft.getInstance().player.connection.sendCommand("gamerule sendCommandFeedback true");
        Actions.say(Actions.t("build.cancelled"));
    }

    static void tick(Minecraft mc) {
        if (QUEUE.isEmpty() || mc.player == null) return;
        if (!allowed()) { QUEUE.clear(); Actions.say(Actions.t("build.noperm")); return; }
        for (int n = LinkConfig.COMMANDS_PER_TICK.get(); n > 0 && !QUEUE.isEmpty(); n--) { mc.player.connection.sendCommand(QUEUE.poll()); sent++; }
        if (QUEUE.isEmpty()) Actions.say(Actions.t(undoing ? "build.undone" : "build.done"));
    }

    private Builder() {}
}
