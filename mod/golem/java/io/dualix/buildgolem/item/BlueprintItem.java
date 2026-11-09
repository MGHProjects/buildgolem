// SPDX-License-Identifier: MIT
package io.dualix.buildgolem.item;

import io.dualix.buildgolem.BlueprintInfo;
import io.dualix.buildgolem.Content;
import net.minecraft.network.chat.Component;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.TooltipFlag;

import java.util.List;

/** Plano copiado de un holograma. Dáselo a tu gólem (clic sobre él) para que lo construya. */
public class BlueprintItem extends Item {
    public BlueprintItem(Properties p) { super(p); }

    @Override
    public Component getName(ItemStack stack) {
        BlueprintInfo info = stack.get(Content.PLAN.get());
        return info == null ? super.getName(stack) : Component.translatable("item.buildgolem.blueprint.named", info.title());
    }

    @Override
    public void appendHoverText(ItemStack stack, TooltipContext ctx, List<Component> lines, TooltipFlag flag) {
        BlueprintInfo info = stack.get(Content.PLAN.get());
        if (info == null) return;
        int muted = 0x9AA4AE;
        lines.add(Component.translatable("item.buildgolem.blueprint.size", info.size().getX(), info.size().getY(), info.size().getZ(), info.blocks()).withStyle(s -> s.withColor(muted)));
        lines.add(Component.translatable("item.buildgolem.blueprint.at", info.anchor().getX(), info.anchor().getY(), info.anchor().getZ()).withStyle(s -> s.withColor(muted)));
        lines.add(Component.translatable("item.buildgolem.blueprint.tip").withStyle(s -> s.withColor(0xFFC21A)));
    }
}
