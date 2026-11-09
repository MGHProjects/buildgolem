// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.config.ModConfig;
import net.neoforged.fml.event.config.ModConfigEvent;
import net.neoforged.fml.loading.FMLPaths;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * BuildGolem Link: mod solo de cliente. Vincula la cuenta de BuildGolem con un código, descarga diseños
 * y los proyecta en el mundo como holograma para construirlos capa a capa. No registra bloques, objetos
 * ni canales de red, así que entra en cualquier servidor sin instalar nada allí.
 * El Gólem Constructor va aparte, en el mod "buildgolem" (que sí necesita estar también en el servidor).
 */
@Mod(value = BuildGolemLink.MOD_ID, dist = Dist.CLIENT)
public final class BuildGolemLink {
    public static final String MOD_ID = "buildgolem_link";
    public static final Logger LOG = LoggerFactory.getLogger("BuildGolem Link");

    public BuildGolemLink(IEventBus modBus, ModContainer container) {
        container.registerConfig(ModConfig.Type.CLIENT, LinkConfig.SPEC);
        modBus.addListener(Keys::register);
        modBus.addListener(Hud::register);
        modBus.addListener(BuildGolemLink::migrate);
        ClientEvents.init();
    }

    /** Antes el mod se llamaba Craftometry Link: si había una cuenta vinculada, se conserva. */
    private static void migrate(ModConfigEvent.Loading e) {
        if (e.getConfig().getSpec() != LinkConfig.SPEC || LinkConfig.linked()) return;
        Path old = FMLPaths.CONFIGDIR.get().resolve("craftometry_link-client.toml");
        try {
            if (!Files.exists(old)) return;
            String s = Files.readString(old);
            Matcher token = Pattern.compile("(?m)^\\s*token\\s*=\\s*\"(cmt_[A-Za-z0-9_-]+)\"").matcher(s), user = Pattern.compile("(?m)^\\s*user\\s*=\\s*\"([^\"]*)\"").matcher(s);
            if (token.find()) LinkConfig.link(token.group(1), user.find() ? user.group(1) : "");
        } catch (Exception ex) {
            LOG.warn("No se pudo leer la configuración antigua de Craftometry Link", ex);
        }
    }
}
