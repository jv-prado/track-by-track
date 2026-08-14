import { FlatList, Image, Text, View } from "react-native";
import { Users } from "lucide-react-native";
import { useAlbumReviewsInfiniteQuery } from "@/queries/discovery";
import { getInitials } from "@/lib/initials";
import { Spinner } from "@/components/ui/Spinner";
import { colors } from "@/lib/colors";
import type { AlbumReviewItem } from "@/shared/api/types";

/**
 * Porta de src/shared/album/AlbumReviewsList.tsx (web). Web usa CSS
 * multi-column (`columns-2 sm:columns-3`, masonry por altura de conteúdo) +
 * `IntersectionObserver` pro infinite scroll — RN não tem nem um nem outro.
 * Aqui: `FlatList numColumns={2}` (grid regular, não masonry balanceado por
 * altura — mais simples, mas mesma densidade visual) + `onEndReached` no
 * lugar do observer (mesma troca documentada no plan.md §6.6 pra
 * use-infinite-scroll).
 *
 * Link pro perfil público (`/profile/$userId/album/$albumId`) não navega
 * ainda — essas rotas são Fase 5 do plan.md.
 */
export function AlbumReviewsList({ albumId }: { albumId: string }) {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useAlbumReviewsInfiniteQuery(albumId);

  const items = data?.pages.flatMap((page) => page.data) ?? [];

  if (isLoading || items.length === 0) return null;

  return (
    <View>
      <View className="mb-3 flex-row items-center gap-2">
        <Users size={16} color={colors.dourado} />
        <Text className="font-semibold text-white">Reviews de outros usuários</Text>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.rankingId}
        numColumns={2}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12 }}
        scrollEnabled={false}
        renderItem={({ item }) => <ReviewCard review={item} />}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View className="items-center py-6">
              <Spinner size={24} />
            </View>
          ) : null
        }
      />
    </View>
  );
}

function ReviewCard({ review }: { review: AlbumReviewItem }) {
  return (
    <View className="flex-1 gap-1 rounded-xl border border-white/5 bg-cinza-escuro p-3">
      <View className="flex-row items-center gap-2">
        {review.userAvatarUrl ? (
          <Image source={{ uri: review.userAvatarUrl }} className="h-6 w-6 rounded-full" />
        ) : (
          <View className="h-6 w-6 items-center justify-center rounded-full bg-cinza-medio">
            <Text className="text-[10px] font-semibold text-gray-300">
              {getInitials(review.userDisplayName)}
            </Text>
          </View>
        )}
        <Text className="flex-1 text-sm font-medium text-white" numberOfLines={1}>
          {review.userDisplayName}
        </Text>
      </View>
      <Text className="text-sm font-bold text-dourado">{review.averageScore.toFixed(1)}</Text>
      {review.reviewText ? (
        <Text className="text-sm text-gray-300">{review.reviewText}</Text>
      ) : (
        <Text className="text-sm italic text-gray-500">Avaliou sem deixar review</Text>
      )}
    </View>
  );
}
