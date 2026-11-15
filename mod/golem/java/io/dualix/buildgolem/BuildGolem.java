// SPDX-License-Identifier: MIT
package io.dualix.buildgolem;

import net.minecraft.resources.ResourceLocation;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.event.entity.EntityAttributeCreationEvent;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * BuildGolem: el Gólem Constructor. Mod común (cliente y servidor): registra los objetos, el gólem y el canal por el que
 * el cliente sube un plano copiado del holograma de BuildGolem Link. El gólem construye ese plano solo, a ritmo de
 * jugador, sacando los bloques de hasta 5 cofres que le asignas con el vinculador.
 */
@Mod(BuildGolem.MOD_ID)
public final class BuildGolem {
    public static final String MOD_ID = "buildgolem";
    public static final Logger LOG = LoggerFactory.getLogger("BuildGolem");

    public static ResourceLocation id(String path) { return ResourceLocation.fromNamespaceAndPath(MOD_ID, path); }

    public BuildGolem(IEventBus modBus) {
        Content.register(modBus);
        modBus.addListener(BuildGolem::attributes);
        modBus.addListener(BuildGolem::payloads);
    }

    private static void attributes(EntityAttributeCreationEvent e) {
        e.put(Content.GOLEM.get(), BuilderGolem.attributes().build());
    }

    private static void payloads(RegisterPayloadHandlersEvent e) {
        var r = e.registrar("1").optional();
        r.playToServer(PlanUpload.TYPE, PlanUpload.STREAM_CODEC, PlanUpload::handle);
        r.playToServer(Stock.Request.TYPE, Stock.Request.STREAM_CODEC, Stock::handle);
        // la respuesta solo se usa en el cliente con BuildGolem Link; la clase se carga al llegar el primer paquete
        r.playToClient(Stock.Reply.TYPE, Stock.Reply.STREAM_CODEC, (msg, ctx) -> io.dualix.buildgolem.client.StockClient.apply(msg));
    }
}
