// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.item;

import net.minecraft.network.chat.Component;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;

import java.util.List;

/** Engranaje de obra: clic sobre tu gólem para que coloque más rápido, camine más deprisa y llegue más lejos (hasta 3). */
public class GearItem extends Item {
    public GearItem(Properties p) { super(p); }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext ctx, List<Component> lines, TooltipFlag flag) {
        lines.add(Component.translatable("item.buildgolem.work_gear.tip").withStyle(s -> s.withColor(0x9AA4AE)));
    }
}
