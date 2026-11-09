// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.link;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.mojang.brigadier.CommandDispatcher;
import com.mojang.brigadier.arguments.IntegerArgumentType;
import com.mojang.brigadier.arguments.StringArgumentType;
import net.minecraft.client.Minecraft;
import net.minecraft.commands.CommandSourceStack;
import net.minecraft.commands.Commands;
import net.minecraft.network.chat.ClickEvent;
import net.minecraft.network.chat.Component;
import net.minecraft.network.chat.HoverEvent;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.neoforged.neoforge.client.event.ClientTickEvent;
import net.neoforged.neoforge.client.event.RegisterClientCommandsEvent;
import net.neoforged.neoforge.common.NeoForge;

/** Eventos del juego: teclas, comparación con el mundo, auto-colocar, construir, holograma, comandos y recuperar la proyección. */
final class ClientEvents {
    private static int ticks;

    static void init() {
        NeoForge.EVENT_BUS.addListener(ClientEvents::tick);
        NeoForge.EVENT_BUS.addListener(Keys::input);
        NeoForge.EVENT_BUS.addListener(Ghost::render);
        NeoForge.EVENT_BUS.addListener(ClientEvents::commands);
        NeoForge.EVENT_BUS.addListener(ClientEvents::loggedIn);
        NeoForge.EVENT_BUS.addListener(ClientEvents::loggedOut);
    }

    private static void tick(ClientTickEvent.Post e) {
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null) return;
        Keys.tick();
        Projection p = Projection.active;
        if (p != null && p.anchor != null && (++ticks % 5 == 0 || p.fresh)) {
            p.scan(mc.level, mc.player.blockPosition());
            if (LinkConfig.AUTO_NEXT_LAYER.get() && p.layerDone() && p.layer < p.sizeY - 1) {
                Actions.layer(p.layer + 1);
                Actions.say(Actions.t("layer.next", p.layer + 1, p.sizeY));
            }
        }
        Printer.tick(mc);
        Builder.tick(mc);
    }

    private static void loggedIn(ClientPlayerNetworkEvent.LoggingIn e) {
        JsonObject s = Projection.saved();
        if (s != null && Projection.active == null) Actions.load(s.get("id").getAsString(), s.get("title").getAsString(), s);
    }

    private static void loggedOut(ClientPlayerNetworkEvent.LoggingOut e) { Printer.stop(); Builder.cancel(); Projection.active = null; GhostMesh.clear(); }

    private static int run(Runnable r) { Minecraft.getInstance().execute(r); return 1; }

    private static void commands(RegisterClientCommandsEvent e) {
        CommandDispatcher<CommandSourceStack> d = e.getDispatcher();
        d.register(Commands.literal("buildgolem")
            .executes(c -> run(() -> Minecraft.getInstance().setScreen(new LinkScreen())))
            .then(Commands.literal("menu").executes(c -> run(() -> Minecraft.getInstance().setScreen(new LinkScreen()))))
            .then(Commands.literal("unlink").executes(c -> run(() -> { LinkConfig.unlink(); Actions.say(Actions.t("unlinked")); })))
            .then(Commands.literal("designs").executes(c -> run(ClientEvents::listDesigns)))
            .then(Commands.literal("load").then(Commands.argument("id", StringArgumentType.word())
                .executes(c -> { String id = StringArgumentType.getString(c, "id"); return run(() -> Actions.load(id, Actions.titles.getOrDefault(id, id), null)); })))
            .then(Commands.literal("here").executes(c -> run(Actions::anchorHere)))
            .then(Commands.literal("look").executes(c -> run(Actions::anchorLook)))
            .then(Commands.literal("center").executes(c -> run(Actions::centerOnMe)))
            .then(Commands.literal("rotate").executes(c -> run(Actions::rotate)))
            .then(Commands.literal("layer")
                .then(Commands.literal("all").executes(c -> run(() -> Actions.layer(-1))))
                .then(Commands.literal("up").executes(c -> run(() -> Actions.layerStep(1))))
                .then(Commands.literal("down").executes(c -> run(() -> Actions.layerStep(-1))))
                .then(Commands.argument("n", IntegerArgumentType.integer(1, 512)).executes(c -> { int n = IntegerArgumentType.getInteger(c, "n"); return run(() -> Actions.layer(n - 1)); })))
            .then(Commands.literal("auto").executes(c -> run(Printer::toggle)))
            .then(Commands.literal("build").executes(c -> run(() -> LinkScreen.confirmBuild(null, false)))
                .then(Commands.literal("layer").executes(c -> run(() -> LinkScreen.confirmBuild(null, true)))))
            .then(Commands.literal("undo").executes(c -> run(Builder::undo)))
            .then(Commands.literal("stop").executes(c -> run(() -> { Builder.cancel(); Printer.stop(); })))
            .then(Commands.literal("toggle").executes(c -> run(Actions::toggle)))
            .then(Commands.literal("materials").executes(c -> run(() -> { if (Actions.need()) Minecraft.getInstance().setScreen(new MaterialsScreen(null)); })))
            .then(Commands.literal("clear").executes(c -> run(Actions::clear))));
    }

    /** /buildgolem designs: lista en el chat; clic en uno para cargarlo. */
    private static void listDesigns() {
        if (!LinkConfig.linked()) { Actions.say(Actions.t("notlinked")); return; }
        Api.myDesigns().thenAccept(arr -> Minecraft.getInstance().execute(() -> {
            if (arr.isEmpty()) { Actions.say(Actions.t("nodesigns")); return; }
            for (JsonElement el : arr) {
                JsonObject o = el.getAsJsonObject();
                String id = o.get("id").getAsString(), title = o.get("title").getAsString();
                Actions.titles.put(id, title);
                Component line = Component.literal("› " + title).withStyle(s -> s.withColor(0xEEF1F4)
                    .withClickEvent(new ClickEvent(ClickEvent.Action.RUN_COMMAND, "/buildgolem load " + id))
                    .withHoverEvent(new HoverEvent(HoverEvent.Action.SHOW_TEXT, Actions.t("clicktoload"))));
                Actions.say(line);
            }
        })).exceptionally(t -> { Actions.fail(t); return null; });
    }

    private ClientEvents() {}
}
