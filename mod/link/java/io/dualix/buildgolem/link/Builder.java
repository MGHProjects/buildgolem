// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import net.minecraft.client.Minecraft;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.world.Clearable;
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

    /** Un comando de chat no puede pasar de 256 caracteres: el servidor echaría al jugador. */
    private static final int MAX_CMD = 250;

    /** Prepara los comandos. Solo bloques que faltan o están mal; nunca toca lo que ya está bien puesto. */
    static int start(Projection p, boolean layerOnly) {
        Minecraft mc = Minecraft.getInstance();
        Level level = mc.level;
        record Cell(BlockPos pos, String state) {}
        List<Cell> cells = new ArrayList<>();
        List<String> before = new ArrayList<>(), withData = new ArrayList<>(), last = new ArrayList<>();
        int n = 0;
        for (int i = 0; i < p.entries.size(); i++) {
            byte s = p.status[i];
            if (s == Projection.PLACED || (layerOnly && p.layer >= 0 && p.y(i) != p.layer) || (p.filter != null && !p.want(i).is(p.filter))) continue;
            BlockState want = p.want(i);
            if (want.isAir()) continue;
            BlockPos pos = p.world(i);
            if (!level.isLoaded(pos)) continue;
            // girado pero con cosas dentro (un cofre, un horno): /setblock lo vaciaría; se queda en amarillo para girarlo a mano
            if (s == Projection.TURNED && level.getBlockEntity(pos) instanceof Clearable) continue;
            n++;
            if (p.bus(i)) {
                // cable de AE2 con piezas y fachadas: el bloque y sus datos en el mismo comando (un cable vacío se borra solo);
                // si ya está, solo se añaden las piezas que le faltan
                if (s == Projection.PARTIAL) dataCommands(withData, pos, null, p.missingNbt(level, i));
                else dataCommands(withData, pos, BlockStateParser.serialize(want), p.nbt(i));
            } else {
                // un bloque con datos propios (pantalla de CC unida a sus vecinas): el bloque ahora y sus datos al final, cuando ya
                // están todas las de su grupo; si sus datos llegaran antes, CC: Tweaked la daría por rota y la dejaría suelta
                if (!(s == Projection.PARTIAL && level.getBlockState(pos).equals(want))) cells.add(new Cell(pos, BlockStateParser.serialize(want)));
                if (p.nbt(i) != null) {
                    CompoundTag d = s == Projection.PARTIAL ? p.missingNbt(level, i) : p.nbt(i);
                    if (!d.isEmpty()) last.add(String.format("data merge block %d %d %d %s", pos.getX(), pos.getY(), pos.getZ(), d));
                }
            }
            // shortcut: deshacer devuelve el bloque de antes pero no sus datos (ni quita piezas añadidas a un cable que ya estaba)
            if (s != Projection.PARTIAL)
                before.add(String.format("setblock %d %d %d %s", pos.getX(), pos.getY(), pos.getZ(), BlockStateParser.serialize(level.getBlockState(pos))));
        }
        if (n == 0) return 0;
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
        cmds.addAll(withData);
        cmds.addAll(last);
        undo = before;
        queue(cmds, false);
        return n;
    }

    /**
     * Comandos para un bloque con datos: "setblock … bloque{cable, …}" con lo que quepa y "data merge block" con el resto
     * (al fundir, el cable conserva las piezas que ya tenía). state null: el bloque ya está, solo data merge.
     */
    static void dataCommands(List<String> out, BlockPos pos, String state, CompoundTag tag) {
        if (tag.isEmpty()) return;
        String at = pos.getX() + " " + pos.getY() + " " + pos.getZ();
        String head = state == null ? null : "setblock " + at + " " + state;
        List<String> keys = new ArrayList<>(tag.getAllKeys());
        keys.sort(Comparator.comparing((String k) -> !k.equals("cable")).thenComparing(k -> k));   // el cable, primero
        CompoundTag batch = new CompoundTag();
        for (String k : keys) {
            String prefix = head != null ? head : "data merge block " + at + " ";
            CompoundTag next = batch.copy();
            next.put(k, tag.get(k).copy());
            if (!batch.isEmpty() && (prefix + next).length() > MAX_CMD) {
                out.add(prefix + batch);
                head = null;
                next = new CompoundTag();
                next.put(k, tag.get(k).copy());
            }
            batch = next;
        }
        out.add((head != null ? head : "data merge block " + at + " ") + batch);
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

    private static int verifyIn;
    private static boolean report;

    /** Tras construir, la primera comparación entera con el mundo se cuenta en el chat: así se ve al momento si algo no entró. */
    static void afterScan(Projection p) {
        if (!report || p.fresh) return;
        report = false;
        int pct = p.total == 0 ? 100 : p.placed * 100 / p.total, missing = p.total - p.placed - p.wrong - p.turned - p.partial;
        if (missing + p.wrong + p.turned + p.partial == 0) Actions.say(Actions.t("build.verified", pct));
        else Actions.say(Actions.t("build.issues", pct, missing, p.wrong, p.turned, p.partial));
    }

    static void tick(Minecraft mc) {
        if (verifyIn > 0 && --verifyIn == 0 && Projection.active != null) { Projection.active.changed(); report = true; }   // 2 s: que el servidor acabe y mande los datos
        if (QUEUE.isEmpty() || mc.player == null) return;
        if (!allowed()) { QUEUE.clear(); Actions.say(Actions.t("build.noperm")); return; }
        for (int n = LinkConfig.COMMANDS_PER_TICK.get(); n > 0 && !QUEUE.isEmpty(); n--) {
            String c = QUEUE.poll();
            if (c.length() <= 256) mc.player.connection.sendCommand(c);          // uno más largo haría que el servidor te echara
            else BuildGolemLink.LOG.warn("Comando demasiado largo, no se envía: {}…", c.substring(0, 80));
            sent++;
        }
        if (QUEUE.isEmpty()) { Actions.say(Actions.t(undoing ? "build.undone" : "build.done")); if (!undoing) verifyIn = 40; }
    }

    private Builder() {}
}
