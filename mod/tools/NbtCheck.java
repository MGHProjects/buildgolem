// Comprueba, fuera del juego, que el .nbt que exporta Craftometry se lee con el mismo NbtIo que usa el mod.
// Uso: java -cp "<classpath>;build/tools" NbtCheck archivo.nbt
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.NbtAccounter;
import net.minecraft.nbt.NbtIo;
import net.minecraft.nbt.Tag;

import java.io.FileInputStream;

public class NbtCheck {
    public static void main(String[] a) throws Exception {
        CompoundTag t = NbtIo.readCompressed(new FileInputStream(a[0]), NbtAccounter.create(64L << 20));
        ListTag pal = t.getList("palette", Tag.TAG_COMPOUND), blocks = t.getList("blocks", Tag.TAG_COMPOUND), size = t.getList("size", Tag.TAG_INT);
        System.out.println("DataVersion " + t.getInt("DataVersion") + " · tamaño " + size.getInt(0) + "×" + size.getInt(1) + "×" + size.getInt(2) + " · paleta " + pal.size() + " · bloques " + blocks.size());
        for (int i = 0; i < Math.min(4, pal.size()); i++) System.out.println("  " + pal.getCompound(i).getString("Name") + " " + pal.getCompound(i).getCompound("Properties"));
        CompoundTag b0 = blocks.getCompound(0);
        ListTag pos = b0.getList("pos", Tag.TAG_INT);
        System.out.println("  primer bloque: " + pos.getInt(0) + " " + pos.getInt(1) + " " + pos.getInt(2) + " estado " + b0.getInt("state"));
    }
}
