// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.client;

import com.mojang.blaze3d.vertex.PoseStack;
import com.mojang.blaze3d.vertex.VertexConsumer;
import io.dualix.buildgolem.BuildGolem;
import io.dualix.buildgolem.BuilderGolem;
import net.minecraft.client.model.HierarchicalModel;
import net.minecraft.client.model.geom.ModelLayerLocation;
import net.minecraft.client.model.geom.ModelPart;
import net.minecraft.client.model.geom.PartPose;
import net.minecraft.client.model.geom.builders.CubeDeformation;
import net.minecraft.client.model.geom.builders.CubeListBuilder;
import net.minecraft.client.model.geom.builders.LayerDefinition;
import net.minecraft.client.model.geom.builders.MeshDefinition;
import net.minecraft.client.model.geom.builders.PartDefinition;
import net.minecraft.client.renderer.LightTexture;
import net.minecraft.client.renderer.texture.OverlayTexture;
import net.minecraft.util.Mth;

/**
 * Gólem de hierro bajito (≈1,9 bloques, cabe por huecos de 1×2) con casco de obra, chaleco reflectante, cinturón con
 * bolsa y martillo y un lápiz en la oreja. Con engranajes de obra lleva una baliza ámbar en el casco que gira (más deprisa
 * cuantos más tiene) y brilla de noche. Poses: camina con el plano enrollado bajo el brazo, golpea al poner un bloque,
 * lee el plano desplegado cuando espera, se rasca la cabeza si le falta algo y lo celebra con los brazos arriba al terminar.
 * Las cajas y sus coordenadas de textura van a juego con tools/textures.mjs.
 */
public class BuilderGolemModel extends HierarchicalModel<BuilderGolem> {
    public static final ModelLayerLocation LAYER = new ModelLayerLocation(BuildGolem.id("builder_golem"), "main");

    private final ModelPart root, head, hat, beacon, lamp, body, rightArm, leftArm, rightLeg, leftLeg, roll, sheet;

    public BuilderGolemModel(ModelPart root) {
        this.root = root;
        this.head = root.getChild("head");
        this.hat = head.getChild("hat");
        this.beacon = hat.getChild("beacon");
        this.lamp = beacon.getChild("lamp");
        this.body = root.getChild("body");
        this.sheet = body.getChild("sheet");
        this.rightArm = root.getChild("right_arm");
        this.leftArm = root.getChild("left_arm");
        this.roll = leftArm.getChild("roll");
        this.rightLeg = root.getChild("right_leg");
        this.leftLeg = root.getChild("left_leg");
    }

    public static LayerDefinition create() {
        MeshDefinition mesh = new MeshDefinition();
        PartDefinition r = mesh.getRoot();
        PartDefinition head = r.addOrReplaceChild("head", CubeListBuilder.create()
            .texOffs(0, 0).addBox(-4, -9, -4, 8, 9, 8)
            .texOffs(32, 0).addBox(-1, -4, -6, 2, 4, 2)
            .texOffs(64, 82).addBox(-5, -6, -2, 1, 1, 4), PartPose.offset(0, 3, -1));   // lápiz en la oreja derecha
        PartDefinition hat = head.addOrReplaceChild("hat", CubeListBuilder.create()
            .texOffs(40, 0).addBox(-4.5F, -12, -4.5F, 9, 3, 9)
            .texOffs(76, 0).addBox(-5, -9, -6, 10, 1, 11)
            .texOffs(40, 12).addBox(-1, -13, -4, 2, 1, 8), PartPose.ZERO);
        PartDefinition beacon = hat.addOrReplaceChild("beacon", CubeListBuilder.create()
            .texOffs(0, 82).addBox(-1.5F, -1, -1.5F, 3, 1, 3), PartPose.offset(0, -13, 2));
        beacon.addOrReplaceChild("lamp", CubeListBuilder.create()
            .texOffs(16, 82).addBox(-1, -1, -1, 2, 2, 2), PartPose.offset(0, -2, 0));
        PartDefinition body = r.addOrReplaceChild("body", CubeListBuilder.create()
            .texOffs(0, 24).addBox(-7, 0, -4, 14, 10, 8)
            .texOffs(44, 24).addBox(-5, 10, -3, 10, 3, 6)
            .texOffs(0, 44).addBox(-7, 0, -4, 14, 9, 8, new CubeDeformation(.4F))
            .texOffs(28, 82).addBox(2, 10.5F, -5, 3, 3, 2)                                // bolsa de herramientas delante
            .texOffs(44, 82).addBox(-4, 11, 3.5F, 1, 5, 1)                                // martillo colgado atrás: mango…
            .texOffs(52, 82).addBox(-5, 10, 3, 3, 2, 2), PartPose.offset(0, 3, 0));       // …y cabeza
        body.addOrReplaceChild("sheet", CubeListBuilder.create()
            .texOffs(76, 64).addBox(-8, -10, 0, 16, 10, 1), PartPose.offsetAndRotation(0, 10, -12, -.9F, 0, 0));
        r.addOrReplaceChild("right_arm", CubeListBuilder.create()
            .texOffs(60, 36).addBox(-4, -2, -2.5F, 4, 17, 5), PartPose.offset(-7, 5, 0));
        PartDefinition left = r.addOrReplaceChild("left_arm", CubeListBuilder.create()
            .texOffs(80, 36).addBox(0, -2, -2.5F, 4, 17, 5), PartPose.offset(7, 5, 0));
        left.addOrReplaceChild("roll", CubeListBuilder.create()
            .texOffs(44, 64).addBox(.5F, 12, -7, 3, 3, 12), PartPose.ZERO);
        r.addOrReplaceChild("right_leg", CubeListBuilder.create()
            .texOffs(0, 64).addBox(-2.5F, 0, -2.5F, 5, 9, 5), PartPose.offset(-3.5F, 15, 0));
        r.addOrReplaceChild("left_leg", CubeListBuilder.create()
            .texOffs(22, 64).addBox(-2.5F, 0, -2.5F, 5, 9, 5), PartPose.offset(3.5F, 15, 0));
        return LayerDefinition.create(mesh, 128, 128);
    }

    @Override
    public ModelPart root() { return root; }

    public ModelPart rightArm() { return rightArm; }

    /** La luz de la baliza, a plena luminosidad (la dibuja el renderizador con un tipo de render que brilla). */
    public void glow(PoseStack ps, VertexConsumer vc) {
        if (!beacon.visible) return;
        ps.pushPose();
        root.translateAndRotate(ps);
        head.translateAndRotate(ps);
        hat.translateAndRotate(ps);
        beacon.translateAndRotate(ps);
        lamp.render(ps, vc, LightTexture.FULL_BRIGHT, OverlayTexture.NO_OVERLAY);
        ps.popPose();
    }

    @Override
    public void setupAnim(BuilderGolem e, float limbSwing, float amount, float age, float yaw, float pitch) {
        root.getAllParts().forEach(ModelPart::resetPose);
        float walk = Mth.triangleWave(limbSwing, 13.0F) * amount;
        rightLeg.xRot = 1.5F * walk;
        leftLeg.xRot = -1.5F * walk;
        head.yRot = yaw * Mth.DEG_TO_RAD;
        head.xRot = pitch * Mth.DEG_TO_RAD;
        body.y += Mth.sin(age * .08F) * .25F * (1 - amount);       // respira cuando está quieto
        int gears = e.gears();
        beacon.visible = gears > 0;
        lamp.yRot = age * (e.mood() == BuilderGolem.WORK ? .18F + .08F * gears : .04F);
        byte mood = e.mood();
        boolean plan = e.hasPlan(), reading = plan && e.isReading() && mood != BuilderGolem.HAPPY && mood != BuilderGolem.CONFUSED;
        roll.visible = plan && !reading && mood != BuilderGolem.HAPPY;
        sheet.visible = reading;
        if (mood == BuilderGolem.HAPPY) {                           // ¡terminado! brazos arriba y saltitos
            root.y -= Math.abs(Mth.sin(age * .35F)) * 2.5F;
            rightArm.xRot = -2.8F + Mth.sin(age * .7F) * .25F;
            leftArm.xRot = -2.8F + Mth.cos(age * .7F) * .25F;
            rightArm.zRot = .35F;
            leftArm.zRot = -.35F;
            head.xRot = -.35F;
        } else if (mood == BuilderGolem.CONFUSED) {                 // le falta algo: niega con la cabeza y se rasca el casco
            head.yRot = Mth.sin(age * .45F) * .35F;
            head.xRot = .15F;
            rightArm.xRot = -2.5F + Mth.sin(age * .9F) * .12F;
            rightArm.zRot = -.45F;
            leftArm.xRot = plan ? -.55F : 0;
        } else if (reading) {                                       // lee el plano desplegado: brazos al frente, cabeza baja
            float bob = Mth.sin(age * .08F) * .04F;
            rightArm.xRot = -1.0F + bob;
            leftArm.xRot = -1.0F - bob;
            rightArm.zRot = -.12F;
            leftArm.zRot = .12F;
            head.xRot = .45F + Mth.sin(age * .05F) * .06F;
            head.yRot = Mth.sin(age * .03F) * .25F;                 // repasa el plano de lado a lado
        } else {
            float swing = Mth.sin(attackTime * Mth.PI);
            rightArm.xRot = (-.2F + 1.5F * Mth.triangleWave(limbSwing, 13.0F)) * amount - swing * 1.7F;
            rightArm.zRot = swing * .25F;
            leftArm.xRot = plan ? -.55F + walk * .2F : (-.2F - 1.5F * Mth.triangleWave(limbSwing, 13.0F)) * amount;
            leftArm.zRot = plan ? -.15F : 0;
        }
    }
}
