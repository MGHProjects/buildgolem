// SPDX-License-Identifier: MIT
package io.dualix.buildgolem;

import com.mojang.serialization.Codec;
import com.mojang.serialization.codecs.RecordCodecBuilder;
import io.netty.buffer.ByteBuf;
import net.minecraft.core.BlockPos;
import net.minecraft.core.UUIDUtil;
import net.minecraft.network.codec.ByteBufCodecs;
import net.minecraft.network.codec.StreamCodec;

import java.util.UUID;

/** Lo que enseña un plano relleno: a qué plano guardado apunta, su nombre, tamaño, cuántos bloques y dónde va. */
public record BlueprintInfo(UUID id, String title, int blocks, BlockPos size, BlockPos anchor, String dimension) {
    public static final Codec<BlueprintInfo> CODEC = RecordCodecBuilder.create(i -> i.group(
        UUIDUtil.CODEC.fieldOf("id").forGetter(BlueprintInfo::id),
        Codec.STRING.fieldOf("title").forGetter(BlueprintInfo::title),
        Codec.INT.fieldOf("blocks").forGetter(BlueprintInfo::blocks),
        BlockPos.CODEC.fieldOf("size").forGetter(BlueprintInfo::size),
        BlockPos.CODEC.fieldOf("anchor").forGetter(BlueprintInfo::anchor),
        Codec.STRING.fieldOf("dimension").forGetter(BlueprintInfo::dimension)
    ).apply(i, BlueprintInfo::new));

    public static final StreamCodec<ByteBuf, BlueprintInfo> STREAM_CODEC = StreamCodec.composite(
        UUIDUtil.STREAM_CODEC, BlueprintInfo::id,
        ByteBufCodecs.STRING_UTF8, BlueprintInfo::title,
        ByteBufCodecs.VAR_INT, BlueprintInfo::blocks,
        BlockPos.STREAM_CODEC, BlueprintInfo::size,
        BlockPos.STREAM_CODEC, BlueprintInfo::anchor,
        ByteBufCodecs.STRING_UTF8, BlueprintInfo::dimension,
        BlueprintInfo::new);
}
