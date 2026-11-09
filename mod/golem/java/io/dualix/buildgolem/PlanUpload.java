// SPDX-License-Identifier: MIT
package io.dualix.buildgolem;

import com.mojang.brigadier.exceptions.CommandSyntaxException;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.chat.Component;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.block.state.BlockState;
import net.neoforged.neoforge.network.handling.IPayloadContext;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.zip.DeflaterOutputStream;
import java.util.zip.InflaterInputStream;

/**
 * Subida de un plano del cliente al servidor, en trozos (un paquete del cliente no puede pasar de 32 KB).
 * Todo lo que llega del cliente se valida: tamaño, número de trozos, medidas, distancia y que lleve un plano en blanco.
 */
public record PlanUpload(long nonce, int index, int total, boolean offhand, byte[] data) implements CustomPacketPayload {
    public static final int CHUNK = 30_000, MAX_CHUNKS = 160, MAX_BLOCKS = 262_144, MAX_SIDE = 512, MAX_PALETTE = 4096, MAX_RAW = 8 << 20, VERSION = 1;
    public static final Type<PlanUpload> TYPE = new Type<>(BuildGolem.id("plan_upload"));
    public static final StreamCodec<RegistryFriendlyByteBuf, PlanUpload> STREAM_CODEC = StreamCodec.composite(
        ByteBufCodecs.VAR_LONG, PlanUpload::nonce,
        ByteBufCodecs.VAR_INT, PlanUpload::index,
        ByteBufCodecs.VAR_INT, PlanUpload::total,
        ByteBufCodecs.BOOL, PlanUpload::offhand,
        ByteBufCodecs.byteArray(CHUNK), PlanUpload::data,
        PlanUpload::new);

    @Override
    public Type<? extends CustomPacketPayload> type() { return TYPE; }

    /** Lo que manda el cliente, antes de comprimir y trocear. */
    public record Draft(String title, String dimension, BlockPos anchor, BlockPos size, String[] palette, int[] dx, int[] dy, int[] dz, int[] idx) {}

    public static byte[] encode(Draft d) throws IOException {
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (DataOutputStream out = new DataOutputStream(new DeflaterOutputStream(bytes))) {
            out.writeInt(VERSION);
            out.writeUTF(d.title());
            out.writeUTF(d.dimension());
            out.writeLong(d.anchor().asLong());
            out.writeLong(d.size().asLong());
            out.writeInt(d.palette().length);
            for (String s : d.palette()) out.writeUTF(s);
            out.writeInt(d.idx().length);
            for (int i = 0; i < d.idx().length; i++) { out.writeShort(d.dx()[i]); out.writeShort(d.dy()[i]); out.writeShort(d.dz()[i]); out.writeShort(d.idx()[i]); }
        }
        return bytes.toByteArray();
    }

    // ── servidor ──
    private static final class Partial { long nonce; int total, got, bytes; long started; byte[][] parts; }
    private static final Map<UUID, Partial> PARTIAL = new HashMap<>();
    private static final Map<UUID, Long> LAST = new HashMap<>();

    static void handle(PlanUpload msg, IPayloadContext ctx) {
        if (!(ctx.player() instanceof ServerPlayer player)) return;
        UUID who = player.getUUID();
        long now = System.currentTimeMillis();
        if (msg.total() < 1 || msg.total() > MAX_CHUNKS || msg.index() < 0 || msg.index() >= msg.total()) { PARTIAL.remove(who); return; }
        Partial p = PARTIAL.get(who);
        if (p == null || p.nonce != msg.nonce() || now - p.started > 60_000) {
            if (msg.index() != 0) return;
            if (now - LAST.getOrDefault(who, 0L) < 3000) { player.sendSystemMessage(Component.translatable("buildgolem.msg.slow")); return; }
            p = new Partial();
            p.nonce = msg.nonce(); p.total = msg.total(); p.started = now; p.parts = new byte[msg.total()][];
            PARTIAL.put(who, p);
        }
        if (p.total != msg.total() || p.parts[msg.index()] != null) return;
        p.parts[msg.index()] = msg.data();
        p.got++; p.bytes += msg.data().length;
        if (p.got < p.total) return;
        PARTIAL.remove(who);
        LAST.put(who, now);
        ByteArrayOutputStream all = new ByteArrayOutputStream(p.bytes);
        for (byte[] b : p.parts) all.writeBytes(b);
        try {
            finish(player, all.toByteArray(), msg.offhand() ? InteractionHand.OFF_HAND : InteractionHand.MAIN_HAND);
        } catch (Exception e) {
            BuildGolem.LOG.warn("Plano rechazado de {}: {}", player.getGameProfile().getName(), e.toString());
            player.sendSystemMessage(Component.translatable("buildgolem.msg.badplan", e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage()));
        }
    }

    /** Lee como mucho MAX_RAW bytes descomprimidos: un paquete pequeño no puede inflarse hasta llenar la memoria. */
    private static final class Capped extends InputStream {
        private final InputStream in; private long left = MAX_RAW;
        Capped(InputStream in) { this.in = in; }
        @Override public int read() throws IOException { if (left-- <= 0) throw new IOException("demasiado grande"); return in.read(); }
        @Override public int read(byte[] b, int off, int len) throws IOException {
            if (left <= 0) throw new IOException("demasiado grande");
            int n = in.read(b, off, (int) Math.min(len, left));
            if (n > 0) left -= n;
            return n;
        }
    }

    private static void finish(ServerPlayer player, byte[] blob, InteractionHand hand) throws IOException, CommandSyntaxException {
        ItemStack blank = player.getItemInHand(hand);
        if (!blank.is(Content.BLANK_BLUEPRINT.get())) { player.sendSystemMessage(Component.translatable("buildgolem.msg.noblank")); return; }
        Plan plan = new Plan();
        try (DataInputStream in = new DataInputStream(new Capped(new InflaterInputStream(new ByteArrayInputStream(blob))))) {
            if (in.readInt() != VERSION) throw new IOException("versión de plano desconocida");
            plan.title = clip(in.readUTF(), 80);
            plan.dimension = in.readUTF();
            plan.anchor = BlockPos.of(in.readLong());
            plan.size = BlockPos.of(in.readLong());
            if (plan.size.getX() < 1 || plan.size.getY() < 1 || plan.size.getZ() < 1 || plan.size.getX() > MAX_SIDE || plan.size.getY() > MAX_SIDE || plan.size.getZ() > MAX_SIDE)
                throw new IOException("medidas fuera de rango");
            int np = in.readInt();
            if (np < 1 || np > MAX_PALETTE) throw new IOException("paleta fuera de rango");
            var blocks = player.serverLevel().holderLookup(Registries.BLOCK);
            int[] remap = new int[np];
            Map<BlockState, Integer> seen = new HashMap<>();
            for (int i = 0; i < np; i++) {
                String s = clip(in.readUTF(), 1024);
                BlockState st;
                try { st = Plan.sanitize(BlockStateParser.parseForBlock(blocks, s, false).blockState()); }
                catch (CommandSyntaxException ex) { st = null; }           // bloque de un mod que el servidor no tiene: se salta
                if (st == null || st.isAir()) { remap[i] = -1; continue; }
                Integer at = seen.get(st);
                if (at == null) { at = plan.palette.size(); plan.palette.add(st); seen.put(st, at); }
                remap[i] = at;
            }
            int n = in.readInt();
            if (n < 1 || n > MAX_BLOCKS) throw new IOException("número de bloques fuera de rango");
            long[] pos = new long[n];
            int[] idx = new int[n];
            int k = 0;
            for (int i = 0; i < n; i++) {
                int dx = in.readShort(), dy = in.readShort(), dz = in.readShort(), pi = in.readShort();
                if (Math.abs(dx) > MAX_SIDE || dy < 0 || dy > MAX_SIDE || Math.abs(dz) > MAX_SIDE || pi < 0 || pi >= np) throw new IOException("bloque fuera del plano");
                if (remap[pi] < 0) continue;
                BlockPos at = plan.anchor.offset(dx, dy, dz);
                if (player.serverLevel().isOutsideBuildHeight(at)) continue;
                pos[k] = at.asLong(); idx[k] = remap[pi]; k++;
            }
            plan.pos = java.util.Arrays.copyOf(pos, k);
            plan.idx = java.util.Arrays.copyOf(idx, k);
        }
        if (plan.count() == 0) throw new IOException("el plano no tiene bloques que este servidor conozca");
        if (!plan.dimension.equals(player.level().dimension().location().toString())) { player.sendSystemMessage(Component.translatable("buildgolem.msg.otherdim")); return; }
        double dx = plan.anchor.getX() + .5 - player.getX(), dz = plan.anchor.getZ() + .5 - player.getZ();
        if (dx * dx + dz * dz > 160 * 160) { player.sendSystemMessage(Component.translatable("buildgolem.msg.toofar")); return; }

        UUID id = UUID.randomUUID();
        Plan.put(player.server, id, plan);
        ItemStack filled = new ItemStack(Content.BLUEPRINT.get());
        filled.set(Content.PLAN.get(), new BlueprintInfo(id, plan.title, plan.count(), plan.size, plan.anchor, plan.dimension));
        if (!player.getAbilities().instabuild) blank.shrink(1);
        if (blank.isEmpty()) player.setItemInHand(hand, filled);
        else if (!player.getInventory().add(filled)) player.drop(filled, false);
        player.sendSystemMessage(Component.translatable("buildgolem.msg.recorded", plan.title, plan.count()));
    }

    private static String clip(String s, int max) { return s.length() <= max ? s : s.substring(0, max); }
}
