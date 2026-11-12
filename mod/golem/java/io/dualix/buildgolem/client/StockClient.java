// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.client;

import io.dualix.buildgolem.Stock;
import io.dualix.buildgolem.link.Projection;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.Items;
import net.neoforged.fml.ModList;
import net.neoforged.neoforge.network.PacketDistributor;

import java.util.HashMap;
import java.util.Map;

/** Pasa a BuildGolem Link lo que hay en los cofres de tus gólems, para que la lista de materiales lo cuente. */
public final class StockClient {
    /** Lo conecta con Link (solo se llama si Link está instalado). */
    static void install() { Projection.stockRefresh = () -> PacketDistributor.sendToServer(new Stock.Request()); }

    public static void apply(Stock.Reply msg) {
        if (!ModList.get().isLoaded("buildgolem_link")) return;
        Map<Item, Integer> m = new HashMap<>();
        for (var en : msg.counts().entrySet()) {
            ResourceLocation rl = ResourceLocation.tryParse(en.getKey());
            Item it = rl == null ? Items.AIR : BuiltInRegistries.ITEM.get(rl);
            if (it != Items.AIR) m.merge(it, Math.max(0, en.getValue()), Integer::sum);
        }
        Projection.extraStock = m;
        Projection.stockVersion++;
    }

    private StockClient() {}
}
