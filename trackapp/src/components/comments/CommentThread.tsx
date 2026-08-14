import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { MessageCircle, Pencil, Trash2 } from "lucide-react-native";
import {
  useCommentsByRankingQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from "@/queries/comments";
import { useAuthStore } from "@/shared/auth/auth.store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { toast } from "@/components/ui/toast-store";
import { colors } from "@/lib/colors";

/**
 * Porta 1:1 de src/features/comments/components/CommentThread.tsx (web).
 * Nota: essa tela não está montada em nenhuma rota do web hoje (componente
 * existe mas está órfão no código-fonte atual) — portado aqui pra paridade de
 * inventário, sem forçar exibição em nenhuma tela onde o web também não mostra.
 */
export function CommentThread({ rankingId }: { rankingId: string }) {
  const { t } = useTranslation();
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { data, isLoading } = useCommentsByRankingQuery(rankingId, { page: 1, perPage: 50 });
  const createComment = useCreateCommentMutation(rankingId);
  const updateComment = useUpdateCommentMutation(rankingId);
  const deleteComment = useDeleteCommentMutation(rankingId);

  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  const handleCreate = () => {
    if (!newText.trim()) return;
    createComment.mutate(newText.trim(), {
      onSuccess: () => {
        setNewText("");
        toast.success(t("comments.createSuccess"));
      },
      onError: () => toast.error(t("comments.createError")),
    });
  };

  const handleUpdate = (commentId: string) => {
    if (!editingText.trim()) return;
    updateComment.mutate(
      { commentId, text: editingText.trim() },
      {
        onSuccess: () => {
          setEditingId(null);
          toast.success(t("comments.updateSuccess"));
        },
        onError: () => toast.error(t("comments.updateError")),
      },
    );
  };

  const handleDelete = (commentId: string) => {
    deleteComment.mutate(commentId, {
      onSuccess: () => toast.success(t("comments.deleteSuccess")),
      onError: () => toast.error(t("comments.deleteError")),
    });
  };

  return (
    <View>
      <View className="mb-3 flex-row items-center gap-2">
        <MessageCircle size={16} color={colors.dourado} />
        <Text className="font-semibold text-white">{t("comments.title")}</Text>
      </View>

      <Card className="gap-4">
        <View className="flex-row gap-2">
          <Input value={newText} onChangeText={setNewText} placeholder={t("comments.placeholder")} containerClassName="flex-1" />
          <Button size="sm" onPress={handleCreate} isLoading={createComment.isPending}>
            {t("common.send")}
          </Button>
        </View>

        {isLoading && (
          <View className="items-center py-4">
            <Spinner size={20} />
          </View>
        )}

        <View className="gap-3">
          {data?.data.map((comment) => (
            <View key={comment.id} className="gap-1 border-b border-white/5 pb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  {comment.authorAvatarUrl && (
                    <Image source={{ uri: comment.authorAvatarUrl }} className="h-5 w-5 rounded-full" />
                  )}
                  <Text className="text-sm font-medium text-white">{comment.authorDisplayName}</Text>
                  {comment.editedAt && <Text className="text-xs text-gray-500">{t("comments.edited")}</Text>}
                </View>
                {comment.authorId === currentUserId && (
                  <View className="flex-row items-center gap-3">
                    <Pressable
                      onPress={() => {
                        setEditingId(comment.id);
                        setEditingText(comment.text);
                      }}
                      disabled={updateComment.isPending || deleteComment.isPending}
                      accessibilityLabel={t("comments.editAria")}
                    >
                      <Pencil size={14} color={colors.cinzaMedio} />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(comment.id)}
                      disabled={deleteComment.isPending}
                      accessibilityLabel={t("comments.deleteAria")}
                    >
                      <Trash2 size={14} color={colors.cinzaMedio} />
                    </Pressable>
                  </View>
                )}
              </View>

              {editingId === comment.id ? (
                <View className="mt-1 gap-2">
                  <Input value={editingText} onChangeText={setEditingText} />
                  <View className="flex-row justify-end gap-2">
                    <Button size="sm" onPress={() => handleUpdate(comment.id)} isLoading={updateComment.isPending}>
                      {t("common.save")}
                    </Button>
                    <Button size="sm" variant="ghost" onPress={() => setEditingId(null)} disabled={updateComment.isPending}>
                      {t("common.cancel")}
                    </Button>
                  </View>
                </View>
              ) : (
                <Text className="mt-1 text-sm text-gray-300">{comment.text}</Text>
              )}
            </View>
          ))}

          {data?.data.length === 0 && <Text className="text-sm text-gray-500">{t("comments.empty")}</Text>}
        </View>
      </Card>
    </View>
  );
}
