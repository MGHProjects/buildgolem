// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.item;

import io.dualix.buildgolem.Content;
import net.minecraft.core.BlockPos;
import net.minecraft.core.GlobalPos;
import net.minecraft.network.chat.Component;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.sounds.SoundSource;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.item.context.UseOnContext;
import net.minecraft.world.level.Level;
import net.neoforged.neoforge.capabilities.Capabilities;

import java.util.ArrayList;
import java.util.List;

/**
 * Vinculador de cofres: clic en un cofre (o barril, o cualquier almacén con inventario) para apuntarlo o quitarlo,
 * hasta 5. Agachado al aire, lo vacías. Luego clic con él en tu gólem y esos serán sus cofres.
 */
public class BinderItem extends Item {
    public BinderItem(Properties p) { super(p); }

    /** Antes de que el cofre se abra: así apuntarlo es un clic normal. */
    @Override
    public InteractionResult onItemUseFirst(ItemStack stack, UseOnContext ctx) {
        Level level = ctx.getLevel();
        BlockPos pos = ctx.getClickedPos();
        if (level.isClientSide) return level.getBlockEntity(pos) != null ? InteractionResult.SUCCESS : InteractionResult.PASS;
        if (level.getCapability(Capabilities.ItemHandler.BLOCK, pos, null) == null) return InteractionResult.PASS;
        Player player = ctx.getPlayer();
        GlobalPos gp = GlobalPos.of(level.dimension(), pos);
        List<GlobalPos> list = new ArrayList<>(stack.getOrDefault(Content.CHESTS.get(), List.of()));
        String msg;
        if (list.remove(gp)) msg = "buildgolem.msg.chestremoved";
        else if (list.size() >= Content.MAX_CHESTS) { if (player != null) player.displayClientMessage(Component.translatable("buildgolem.msg.chestfull", Content.MAX_CHESTS), true); return InteractionResult.FAIL; }
        else { list.add(gp); msg = "buildgolem.msg.chestadded"; }
        stack.set(Content.CHESTS.get(), List.copyOf(list));
        level.playSound(null, pos, SoundEvents.CHAIN_PLACE, SoundSource.PLAYERS, .7f, msg.endsWith("added") ? 1.4f : .8f);
        if (player != null) player.displayClientMessage(Component.translatable(msg, list.size(), Content.MAX_CHESTS), true);
        return InteractionResult.SUCCESS;
    }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (!player.isSecondaryUseActive() || !stack.has(Content.CHESTS.get())) return InteractionResultHolder.pass(stack);
        if (!level.isClientSide) {
            stack.remove(Content.CHESTS.get());
            player.displayClientMessage(Component.translatable("buildgolem.msg.chestcleared"), true);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
    }

    @Override
    public boolean isFoil(ItemStack stack) { return !stack.getOrDefault(Content.CHESTS.get(), List.of()).isEmpty(); }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext ctx, List<Component> lines, TooltipFlag flag) {
        List<GlobalPos> list = stack.getOrDefault(Content.CHESTS.get(), List.of());
        lines.add(Component.translatable("item.buildgolem.binder.count", list.size(), Content.MAX_CHESTS).withStyle(s -> s.withColor(0xFFC21A)));
        for (GlobalPos gp : list)
            lines.add(Component.literal("  " + gp.pos().getX() + " " + gp.pos().getY() + " " + gp.pos().getZ() + "  ·  " + gp.dimension().location().getPath()).withStyle(s -> s.withColor(0x9AA4AE)));
        lines.add(Component.translatable("item.buildgolem.binder.tip").withStyle(s -> s.withColor(0x9AA4AE)));
    }
}
