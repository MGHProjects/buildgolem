// SPDX-License-Identifier: MIT
package io.dualix.buildgolem;

import io.dualix.buildgolem.item.BinderItem;
import io.dualix.buildgolem.item.BlankBlueprintItem;
import io.dualix.buildgolem.item.BlueprintItem;
import io.dualix.buildgolem.item.GolemItem;
import io.dualix.buildgolem.item.HardHatItem;
import net.minecraft.core.GlobalPos;
import net.minecraft.core.component.DataComponentType;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.MobCategory;
import net.minecraft.world.item.CreativeModeTab;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Rarity;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.neoforge.registries.DeferredHolder;
import net.neoforged.neoforge.registries.DeferredItem;
import net.neoforged.neoforge.registries.DeferredRegister;

import java.util.List;

/** Todo lo que registra el mod: objetos, el gólem, los datos que guardan los objetos y la pestaña del creativo. */
public final class Content {
    public static final int MAX_CHESTS = 5;

    private static final DeferredRegister.Items ITEMS = DeferredRegister.createItems(BuildGolem.MOD_ID);
    private static final DeferredRegister<EntityType<?>> ENTITIES = DeferredRegister.create(Registries.ENTITY_TYPE, BuildGolem.MOD_ID);
    private static final DeferredRegister.DataComponents COMPONENTS = DeferredRegister.createDataComponents(Registries.DATA_COMPONENT_TYPE, BuildGolem.MOD_ID);
    private static final DeferredRegister<CreativeModeTab> TABS = DeferredRegister.create(Registries.CREATIVE_MODE_TAB, BuildGolem.MOD_ID);

    // ── datos en los objetos ──
    /** Cofres que lleva apuntados el vinculador (máximo 5). */
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<List<GlobalPos>>> CHESTS = COMPONENTS.registerComponentType("chests",
        b -> b.persistent(GlobalPos.CODEC.listOf(0, MAX_CHESTS)).networkSynchronized(GlobalPos.STREAM_CODEC.apply(ByteBufCodecs.list(MAX_CHESTS))));
    /** Qué plano lleva un plano relleno. */
    public static final DeferredHolder<DataComponentType<?>, DataComponentType<BlueprintInfo>> PLAN = COMPONENTS.registerComponentType("plan",
        b -> b.persistent(BlueprintInfo.CODEC).networkSynchronized(BlueprintInfo.STREAM_CODEC));

    // ── la cadena de fabricación: polvo → aleación (alto horno) → núcleo (con estrella del Nether) ──
    public static final DeferredItem<Item> BUILDER_DUST = ITEMS.registerSimpleItem("builder_dust");
    public static final DeferredItem<Item> BLUEPRINT_ALLOY = ITEMS.registerSimpleItem("blueprint_alloy", new Item.Properties().fireResistant());
    public static final DeferredItem<Item> GOLEM_CORE = ITEMS.registerSimpleItem("golem_core", new Item.Properties().rarity(Rarity.EPIC).fireResistant().stacksTo(16));
    public static final DeferredItem<HardHatItem> HARD_HAT = ITEMS.register("hard_hat", () -> new HardHatItem(new Item.Properties().stacksTo(1)));
    public static final DeferredItem<Item> HI_VIS_VEST = ITEMS.registerSimpleItem("hi_vis_vest", new Item.Properties().stacksTo(1));
    public static final DeferredItem<GolemItem> BUILDER_GOLEM = ITEMS.register("builder_golem", () -> new GolemItem(new Item.Properties().rarity(Rarity.EPIC).stacksTo(1).fireResistant()));
    // ── herramientas ──
    public static final DeferredItem<BinderItem> BINDER = ITEMS.register("binder", () -> new BinderItem(new Item.Properties().stacksTo(1)));
    public static final DeferredItem<BlankBlueprintItem> BLANK_BLUEPRINT = ITEMS.register("blank_blueprint", () -> new BlankBlueprintItem(new Item.Properties().stacksTo(16)));
    public static final DeferredItem<BlueprintItem> BLUEPRINT = ITEMS.register("blueprint", () -> new BlueprintItem(new Item.Properties().stacksTo(1).rarity(Rarity.UNCOMMON)));

    public static final DeferredHolder<EntityType<?>, EntityType<BuilderGolem>> GOLEM = ENTITIES.register("builder_golem",
        () -> EntityType.Builder.of(BuilderGolem::new, MobCategory.MISC).sized(0.9F, 1.9F).eyeHeight(1.55F).clientTrackingRange(10).fireImmune().build("builder_golem"));

    public static final DeferredHolder<CreativeModeTab, CreativeModeTab> TAB = TABS.register("main", () -> CreativeModeTab.builder()
        .title(Component.translatable("itemGroup.buildgolem"))
        .icon(() -> new ItemStack(BUILDER_GOLEM.get()))
        .displayItems((params, out) -> {
            out.accept(BUILDER_GOLEM.get());
            out.accept(GOLEM_CORE.get());
            out.accept(HARD_HAT.get());
            out.accept(HI_VIS_VEST.get());
            out.accept(BLUEPRINT_ALLOY.get());
            out.accept(BUILDER_DUST.get());
            out.accept(BINDER.get());
            out.accept(BLANK_BLUEPRINT.get());
        }).build());

    static void register(IEventBus bus) {
        ITEMS.register(bus);
        ENTITIES.register(bus);
        COMPONENTS.register(bus);
        TABS.register(bus);
    }

    private Content() {}
}
