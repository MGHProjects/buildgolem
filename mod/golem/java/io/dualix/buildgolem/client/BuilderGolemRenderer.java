// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.math.Axis;
import io.dualix.buildgolem.BuildGolem;
import io.dualix.buildgolem.BuilderGolem;
import net.minecraft.client.Minecraft;
import net.minecraft.client.renderer.ItemInHandRenderer;
import net.minecraft.client.renderer.MultiBufferSource;
import net.minecraft.client.renderer.entity.EntityRendererProvider;
import net.minecraft.client.renderer.entity.MobRenderer;
import net.minecraft.client.renderer.entity.RenderLayerParent;
import net.minecraft.client.renderer.entity.layers.RenderLayer;
import net.minecraft.network.chat.Component;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.item.ItemDisplayContext;
import net.minecraft.world.item.ItemStack;

/** Dibuja el gólem, el bloque que lleva en la mano derecha y, si estás cerca, lo que está haciendo encima de su cabeza. */
public class BuilderGolemRenderer extends MobRenderer<BuilderGolem, BuilderGolemModel> {
    private static final ResourceLocation TEXTURE = BuildGolem.id("textures/entity/builder_golem.png");

    public BuilderGolemRenderer(EntityRendererProvider.Context ctx) {
        super(ctx, new BuilderGolemModel(ctx.bakeLayer(BuilderGolemModel.LAYER)), .55F);
        addLayer(new Carry(this, ctx.getItemInHandRenderer()));
    }

    @Override
    public ResourceLocation getTextureLocation(BuilderGolem e) { return TEXTURE; }

    @Override
    protected boolean shouldShowName(BuilderGolem e) {
        Entity cam = Minecraft.getInstance().getCameraEntity();
        return !e.status().getString().isEmpty() && cam != null && cam.distanceToSqr(e) < 12 * 12 && !e.isInvisible();
    }

    @Override
    protected void renderNameTag(BuilderGolem e, Component name, PoseStack ps, MultiBufferSource buf, int light, float pt) {
        Component line = e.hasCustomName() ? e.getCustomName().copy().append(" · ").append(e.status()) : e.status();
        super.renderNameTag(e, line, ps, buf, light, pt);
    }

    /** El bloque que va a poner, en la mano derecha (mientras trabaja). */
    private static final class Carry extends RenderLayer<BuilderGolem, BuilderGolemModel> {
        private final ItemInHandRenderer items;

        Carry(RenderLayerParent<BuilderGolem, BuilderGolemModel> parent, ItemInHandRenderer items) { super(parent); this.items = items; }

        @Override
        public void render(PoseStack ps, MultiBufferSource buf, int light, BuilderGolem e, float limb, float amount, float pt, float age, float yaw, float pitch) {
            ItemStack s = e.carried();
            if (s.isEmpty() || e.isReading()) return;
            ps.pushPose();
            getParentModel().rightArm().translateAndRotate(ps);
            ps.translate(-2 / 16F, 0, 0);
            ps.mulPose(Axis.XP.rotationDegrees(-90));
            ps.mulPose(Axis.YP.rotationDegrees(180));
            ps.translate(0, .1F, -14.5F / 16F);
            items.renderItem(e, s, ItemDisplayContext.THIRD_PERSON_RIGHT_HAND, false, ps, buf, light);
            ps.popPose();
        }
    }
}
