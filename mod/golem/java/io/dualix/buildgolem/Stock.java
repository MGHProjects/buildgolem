// SPDX-License-Identifier: MIT
package io.dualix.buildgolem;

import net.minecraft.core.GlobalPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.neoforged.neoforge.network.handling.IPayloadContext;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Lo que tienen tus gólems (sus cofres y lo que llevan encima), para la lista de materiales de BuildGolem Link.
 * El cliente lo pide al abrir la lista; el servidor contesta con un recuento por objeto. Una petición por segundo como mucho.
 */
public final class Stock {
    private static final int MAX = 4096, RADIUS = 256;
    private static final Map<UUID, Long> LAST = new HashMap<>();

    public record Request() implements CustomPacketPayload {
        public static final Type<Request> TYPE = new Type<>(BuildGolem.id("stock_request"));
        public static final StreamCodec<RegistryFriendlyByteBuf, Request> STREAM_CODEC = StreamCodec.unit(new Request());
        @Override public Type<? extends CustomPacketPayload> type() { return TYPE; }
    }

    /** Recuento por id de objeto. */
    public record Reply(Map<String, Integer> counts) implements CustomPacketPayload {
        public static final Type<Reply> TYPE = new Type<>(BuildGolem.id("stock_reply"));
        public static final StreamCodec<RegistryFriendlyByteBuf, Reply> STREAM_CODEC = StreamCodec.composite(
            ByteBufCodecs.map(HashMap::new, ByteBufCodecs.STRING_UTF8, ByteBufCodecs.VAR_INT, MAX), Reply::counts, Reply::new);
        @Override public Type<? extends CustomPacketPayload> type() { return TYPE; }
    }

    static void handle(Request msg, IPayloadContext ctx) {
        if (!(ctx.player() instanceof ServerPlayer player)) return;
        long now = System.currentTimeMillis();
        if (now - LAST.getOrDefault(player.getUUID(), 0L) < 1000) return;
        LAST.put(player.getUUID(), now);
        ServerLevel sl = player.serverLevel();
        Set<GlobalPos> chests = new HashSet<>();
        Map<Item, Integer> total = new HashMap<>();
        for (BuilderGolem g : sl.getEntities(Content.GOLEM.get(), player.getBoundingBox().inflate(RADIUS), g -> player.getUUID().equals(g.owner))) {
            chests.addAll(g.chests);
            for (int s = 0; s < g.inventory.getContainerSize(); s++) {
                ItemStack st = g.inventory.getItem(s);
                if (!st.isEmpty()) total.merge(st.getItem(), st.getCount(), Integer::sum);
            }
        }
        BuildGoal.stock(sl, chests, total);
        Map<String, Integer> out = new HashMap<>();
        for (var en : total.entrySet()) {
            if (out.size() >= MAX) break;
            out.put(BuiltInRegistries.ITEM.getKey(en.getKey()).toString(), en.getValue());
        }
        ctx.reply(new Reply(out));
    }

    private Stock() {}
}
