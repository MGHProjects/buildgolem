// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import io.dualix.buildgolem.BuildGolem;
import io.dualix.buildgolem.Content;
import io.dualix.buildgolem.item.BlankBlueprintItem;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.LevelRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.RenderType;
import net.minecraft.core.GlobalPos;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.phys.Vec3;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModList;
import net.neoforged.fml.common.Mod;
import net.neoforged.neoforge.client.event.EntityRenderersEvent;
import net.neoforged.neoforge.client.event.RenderLevelStageEvent;
import net.neoforged.neoforge.common.NeoForge;

import java.util.List;

/** Lado cliente: el modelo del gólem, el puente con BuildGolem Link y el contorno de los cofres del vinculador. */
@Mod(value = BuildGolem.MOD_ID, dist = Dist.CLIENT)
public final class ClientSetup {
    public ClientSetup(IEventBus modBus) {
        modBus.addListener(ClientSetup::layers);
        modBus.addListener(ClientSetup::renderers);
        NeoForge.EVENT_BUS.addListener(ClientSetup::outline);
        if (ModList.get().isLoaded("buildgolem_link")) BlankBlueprintItem.clientRecord = LinkBridge::record;
    }

    private static void layers(EntityRenderersEvent.RegisterLayerDefinitions e) { e.registerLayerDefinition(BuilderGolemModel.LAYER, BuilderGolemModel::create); }

    private static void renderers(EntityRenderersEvent.RegisterRenderers e) { e.registerEntityRenderer(Content.GOLEM.get(), BuilderGolemRenderer::new); }

    /** Con el vinculador en la mano, sus cofres se ven recuadrados en amarillo (a través de las paredes no). */
    private static void outline(RenderLevelStageEvent e) {
        if (e.getStage() != RenderLevelStageEvent.Stage.AFTER_PARTICLES) return;
        Minecraft mc = Minecraft.getInstance();
        if (mc.player == null || mc.level == null) return;
        ItemStack held = mc.player.getItemInHand(InteractionHand.MAIN_HAND);
        if (!held.is(Content.BINDER.get())) held = mc.player.getItemInHand(InteractionHand.OFF_HAND);
        if (!held.is(Content.BINDER.get())) return;
        List<GlobalPos> list = held.getOrDefault(Content.CHESTS.get(), List.of());
        if (list.isEmpty()) return;
        Vec3 cam = e.getCamera().getPosition();
        PoseStack ps = e.getPoseStack();
        ps.pushPose();
        ps.translate(-cam.x, -cam.y, -cam.z);
        MultiBufferSource.BufferSource buf = mc.renderBuffers().bufferSource();
        VertexConsumer lines = buf.getBuffer(RenderType.lines());
        for (GlobalPos gp : list) {
            if (!gp.dimension().equals(mc.level.dimension())) continue;
            var p = gp.pos();
            LevelRenderer.renderLineBox(ps, lines, p.getX() - .02, p.getY() - .02, p.getZ() - .02, p.getX() + 1.02, p.getY() + 1.02, p.getZ() + 1.02, 1f, .76f, .1f, 1f);
        }
        buf.endBatch(RenderType.lines());
        ps.popPose();
    }
}
