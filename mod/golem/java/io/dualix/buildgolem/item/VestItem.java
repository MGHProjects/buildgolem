// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.item;

import net.minecraft.ChatFormatting;
import net.minecraft.core.Holder;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.ArmorItem;
import net.minecraft.world.item.ArmorMaterial;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;

import java.util.List;

/** Chaleco reflectante: pieza del gólem y prenda de pecho (1 de armadura, no se gasta). Con el casco, eres el capataz. */
public class VestItem extends ArmorItem {
    public VestItem(Holder<ArmorMaterial> material, Properties p) { super(material, Type.CHESTPLATE, p); }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext ctx, List<Component> tip, TooltipFlag flag) {
        tip.add(Component.translatable("item.buildgolem.foreman.tip").withStyle(ChatFormatting.GRAY));
    }
}
