// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.client;

import io.dualix.buildgolem.PlanUpload;
import io.dualix.buildgolem.link.Projection;
import net.minecraft.client.Minecraft;
import net.minecraft.commands.arguments.blocks.BlockStateParser;
import net.minecraft.core.BlockPos;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.level.block.state.BlockState;
import net.neoforged.neoforge.network.PacketDistributor;

import java.util.Arrays;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Copia el holograma activo de BuildGolem Link (tal como está colocado y girado) y lo sube al servidor por trozos.
 * Solo se carga si BuildGolem Link está instalado.
 */
final class LinkBridge {
    static void record(Player player, InteractionHand hand) {
        Projection p = Projection.active;
        if (p == null || p.anchor == null) { player.displayClientMessage(Component.translatable("buildgolem.msg.noholo"), false); return; }
        String dim = player.level().dimension().location().toString();
        if (p.dimension != null && !p.dimension.equals(dim)) { player.displayClientMessage(Component.translatable("buildgolem.msg.otherdim"), false); return; }
        int n = p.entries.size();
        if (n > PlanUpload.MAX_BLOCKS) { player.displayClientMessage(Component.translatable("buildgolem.msg.toobig", PlanUpload.MAX_BLOCKS), false); return; }
        // un cable de AE2 con sus piezas y fachadas es una entrada propia de la paleta: mismo bloque, datos distintos
        record Key(BlockState state, CompoundTag data) {}
        Map<Key, Integer> ids = new HashMap<>();
        String[] palette = new String[Math.min(n, PlanUpload.MAX_PALETTE)], data = new String[palette.length];
        int[] dx = new int[n], dy = new int[n], dz = new int[n], idx = new int[n];
        for (int i = 0; i < n; i++) {
            BlockState s = p.want(i);
            Key key = new Key(s, p.bus(i) ? p.nbt(i) : null);           // el servidor solo acepta datos de cables de AE2
            Integer id = ids.get(key);
            if (id == null) {
                if (ids.size() >= PlanUpload.MAX_PALETTE) { player.displayClientMessage(Component.translatable("buildgolem.msg.toobig", PlanUpload.MAX_BLOCKS), false); return; }
                id = ids.size();
                ids.put(key, id);
                palette[id] = BlockStateParser.serialize(s);
                data[id] = key.data() == null ? "" : key.data().toString();
            }
            BlockPos w = p.world(i);
            dx[i] = w.getX() - p.anchor.getX(); dy[i] = w.getY() - p.anchor.getY(); dz[i] = w.getZ() - p.anchor.getZ(); idx[i] = id;
        }
        byte[] blob;
        try {
            blob = PlanUpload.encode(new PlanUpload.Draft(p.title, dim, p.anchor, p.rotatedSize(), Arrays.copyOf(palette, ids.size()), Arrays.copyOf(data, ids.size()), dx, dy, dz, idx));
        } catch (Exception e) {
            player.displayClientMessage(Component.literal(e.toString()), false);
            return;
        }
        int total = (blob.length + PlanUpload.CHUNK - 1) / PlanUpload.CHUNK;
        if (total > PlanUpload.MAX_CHUNKS) { player.displayClientMessage(Component.translatable("buildgolem.msg.toobig", PlanUpload.MAX_BLOCKS), false); return; }
        long nonce = ThreadLocalRandom.current().nextLong();
        for (int k = 0; k < total; k++) {
            byte[] part = Arrays.copyOfRange(blob, k * PlanUpload.CHUNK, Math.min(blob.length, (k + 1) * PlanUpload.CHUNK));
            PacketDistributor.sendToServer(new PlanUpload(nonce, k, total, hand == InteractionHand.OFF_HAND, part));
        }
        Minecraft.getInstance().player.displayClientMessage(Component.translatable("buildgolem.msg.copying", p.title, n), true);
    }

    private LinkBridge() {}
}
