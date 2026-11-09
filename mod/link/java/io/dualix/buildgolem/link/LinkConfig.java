// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import net.neoforged.neoforge.common.ModConfigSpec;

/** config/buildgolem_link-client.toml: servidor, cuenta vinculada y ajustes del holograma, de la colocación y de la construcción. */
public final class LinkConfig {
    private static final ModConfigSpec.Builder B = new ModConfigSpec.Builder();

    public static final ModConfigSpec.ConfigValue<String> SERVER = B
        .comment("Dirección de BuildGolem (https). Solo cámbiala si usas otra instalación.")
        .define("server", "https://buildgolem.dualix.io");
    public static final ModConfigSpec.ConfigValue<String> TOKEN = B
        .comment("Token personal de solo lectura que pone el mod al vincular la cuenta. Bórralo (o usa /buildgolem unlink) para desvincular.",
                 "Se puede revocar en BuildGolem: Ajustes → Tokens personales.")
        .define("token", "");
    public static final ModConfigSpec.ConfigValue<String> USER = B
        .comment("Nombre de la cuenta vinculada (solo para mostrarlo).")
        .define("user", "");
    public static final ModConfigSpec.IntValue GHOST_RANGE = B
        .comment("Distancia, en bloques, a la que se dibuja el holograma.")
        .defineInRange("ghostRange", 128, 16, 512);
    public static final ModConfigSpec.IntValue GHOST_ALPHA = B
        .comment("Opacidad de los bloques fantasma, en %.")
        .defineInRange("ghostOpacity", 45, 10, 90);
    public static final ModConfigSpec.IntValue PLACE_DELAY = B
        .comment("Auto-colocar: ticks entre un bloque y el siguiente (20 = 1 por segundo). Súbelo si el servidor te expulsa por ir rápido.")
        .defineInRange("placeDelay", 3, 1, 40);
    public static final ModConfigSpec.IntValue COMMANDS_PER_TICK = B
        .comment("Construir todo: comandos /fill o /setblock por tick.")
        .defineInRange("commandsPerTick", 30, 1, 400);
    public static final ModConfigSpec.BooleanValue AUTO_NEXT_LAYER = B
        .comment("Al terminar una capa, pasar sola a la siguiente.")
        .define("autoNextLayer", true);

    public static final ModConfigSpec SPEC = B.build();

    public static boolean linked() { return !TOKEN.get().isBlank(); }

    public static void link(String token, String user) { TOKEN.set(token); USER.set(user); SPEC.save(); }

    public static void unlink() { TOKEN.set(""); USER.set(""); SPEC.save(); }

    private LinkConfig() {}
}
