// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.item;

import net.minecraft.ChatFormatting;
import net.minecraft.core.Holder;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.TooltipFlag;
import java.util.List;
import net.minecraft.sounds.SoundEvent;
import net.minecraft.sounds.SoundEvents;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResultHolder;
import net.minecraft.world.entity.EquipmentSlot;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.item.Equipable;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.level.Level;

/**
 * Casco de obra: pieza del gólem, y también te lo puedes poner (como cualquier cosa en la cabeza, quita un 25 % del daño de
 * lo que cae encima). Con el chaleco reflectante, eres el capataz.
 */
public class HardHatItem extends Item implements Equipable {
    public HardHatItem(Properties p) { super(p); }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext ctx, List<Component> tip, TooltipFlag flag) {
        tip.add(Component.translatable("item.buildgolem.foreman.tip").withStyle(ChatFormatting.GRAY));
    }

    @Override
    public EquipmentSlot getEquipmentSlot() { return EquipmentSlot.HEAD; }

    @Override
    public Holder<SoundEvent> getEquipSound() { return SoundEvents.ARMOR_EQUIP_IRON; }

    @Override
    public InteractionResultHolder<ItemStack> use(Level level, Player player, InteractionHand hand) { return swapWithEquipmentSlot(this, level, player, hand); }
}
