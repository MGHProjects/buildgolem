// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.item;

import net.minecraft.network.chat.Component;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;
import net.minecraft.world.level.Level;

import java.util.List;
import java.util.function.BiConsumer;

/**
 * Plano en blanco. Úsalo con un holograma de BuildGolem Link delante: copia el diseño tal como está colocado (sitio,
 * giro) y se convierte en un plano que puedes dar a tu gólem. La copia la hace el cliente, que es quien tiene el holograma.
 */
public class BlankBlueprintItem extends Item {
    /** Lo pone el lado cliente si BuildGolem Link está instalado. */
    public static BiConsumer<Player, InteractionHand> clientRecord;

    public BlankBlueprintItem(Properties p) { super(p); }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) {
        ItemStack stack = player.getItemInHand(hand);
        if (level.isClientSide) {
            if (clientRecord != null) clientRecord.accept(player, hand);
            else player.displayClientMessage(Component.translatable("buildgolem.msg.needlink"), false);
        }
        return InteractionResultHolder.sidedSuccess(stack, level.isClientSide);
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext ctx, List<Component> lines, TooltipFlag flag) {
        lines.add(Component.translatable("item.buildgolem.blank_blueprint.tip").withStyle(s -> s.withColor(0x9AA4AE)));
    }
}
