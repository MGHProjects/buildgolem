// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.item;

import io.dualix.buildgolem.BuilderGolem;
import io.dualix.buildgolem.Content;
import net.minecraft.core.BlockPos;
import net.minecraft.core.particles.ParticleTypes;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerLevel;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.context.UseOnContext;

import java.util.List;

/** El gólem dormido. Úsalo sobre el suelo y despierta a tus órdenes. */
public class GolemItem extends Item {
    public GolemItem(Properties p) { super(p); }

    @Override
    public InteractionResult useOn(UseOnContext ctx) {
        if (!(ctx.getLevel() instanceof ServerLevel level)) return InteractionResult.SUCCESS;
        Player player = ctx.getPlayer();
        BlockPos at = level.getBlockState(ctx.getClickedPos()).canBeReplaced() ? ctx.getClickedPos() : ctx.getClickedPos().relative(ctx.getClickedFace());
        BuilderGolem golem = Content.GOLEM.get().create(level);
        if (golem == null) return InteractionResult.FAIL;
        float yaw = player != null ? player.getYRot() + 180 : 0;
        golem.moveTo(at.getX() + .5, at.getY(), at.getZ() + .5, yaw, 0);
        golem.setYHeadRot(yaw);
        golem.setYBodyRot(yaw);
        if (!level.noCollision(golem)) {
            if (player != null) player.displayClientMessage(Component.translatable("buildgolem.msg.nospace"), true);
            return InteractionResult.FAIL;
        }
        if (player != null) golem.claim(player.getUUID());
        if (ctx.getItemInHand().has(net.minecraft.core.component.DataComponents.CUSTOM_NAME)) golem.setCustomName(ctx.getItemInHand().getHoverName());
        level.addFreshEntity(golem);
        level.playSound(null, at, SoundEvents.IRON_GOLEM_REPAIR, SoundSource.NEUTRAL, 1, .8f);
        level.playSound(null, at, SoundEvents.ANVIL_PLACE, SoundSource.NEUTRAL, .4f, 1.6f);
        level.sendParticles(ParticleTypes.WAX_ON, at.getX() + .5, at.getY() + 1, at.getZ() + .5, 20, .4, .8, .4, .5);
        if (player == null || !player.getAbilities().instabuild) ctx.getItemInHand().shrink(1);
        return InteractionResult.CONSUME;
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext ctx, List<Component> lines, TooltipFlag flag) {
        lines.add(Component.translatable("item.buildgolem.builder_golem.tip").withStyle(s -> s.withColor(0x9AA4AE)));
    }
}
