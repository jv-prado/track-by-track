import { Image, Pressable, Text, View } from "react-native";
import { Link } from "expo-router";
import { Music } from "lucide-react-native";
import type { AlbumSummary } from "@/shared/api/types";

// Porta 1:1 de src/features/album-catalog/components/AlbumCard.tsx (web).
export function AlbumCard({ album }: { album: AlbumSummary }) {
  const year = album.releaseDate?.slice(0, 4);
  const image = album.imageUrl ?? album.imageUrlSmall;

  return (
    <Link href={`/search/${album.spotifyId}`} asChild>
      <Pressable className="flex-1 rounded-xl border border-white/5 bg-cinza-escuro">
        {image ? (
          <Image source={{ uri: image }} className="aspect-square w-full rounded-t-xl bg-cinza-medio" />
        ) : (
          <View className="aspect-square w-full items-center justify-center rounded-t-xl bg-cinza-medio">
            <Music size={32} color="#6b7280" />
          </View>
        )}
        <View className="min-w-0 flex-1 p-3">
          <Text className="text-base font-semibold leading-tight text-white" numberOfLines={2}>
            {album.name}
          </Text>
          <Text className="text-sm text-gray-400" numberOfLines={1}>
            {album.artist}
          </Text>
          {year && <Text className="mt-auto pt-2 text-sm text-gray-500">{year}</Text>}
        </View>
      </Pressable>
    </Link>
  );
}
