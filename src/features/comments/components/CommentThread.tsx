import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import {
  useCommentsByRankingQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
} from "@/queries/comments";
import { useAuthStore } from "@/shared/auth/auth.store";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { Card } from "@/shared/ui/Card";
import { Spinner } from "@/shared/ui/Spinner";

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

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!newText.trim()) return;
    createComment.mutate(newText.trim(), { onSuccess: () => setNewText("") });
  };

  const startEditing = (commentId: string, text: string) => {
    setEditingId(commentId);
    setEditingText(text);
  };

  const handleUpdate = (commentId: string) => {
    if (!editingText.trim()) return;
    updateComment.mutate(
      { commentId, text: editingText.trim() },
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <div>
      <h2 className="text-white font-semibold mb-3 flex items-center gap-2">
        <MessageCircle size={16} className="text-dourado" /> {t("comments.title")}
      </h2>

      <Card className="p-4">
        <form onSubmit={handleCreate} className="flex gap-2 mb-4">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder={t("comments.placeholder")}
            containerClassName="flex-1"
          />
          <Button type="submit" size="sm" disabled={createComment.isPending}>
            {t("common.send")}
          </Button>
        </form>

        {isLoading && (
          <div className="flex justify-center py-4">
            <Spinner className="h-5 w-5" />
          </div>
        )}

        <div className="flex flex-col gap-3">
          {data?.data.map((comment) => (
            <div key={comment.id} className="border-b border-white/5 pb-2 last:border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {comment.authorAvatarUrl ? (
                    <img
                      src={comment.authorAvatarUrl}
                      alt=""
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : null}
                  <span className="text-white text-sm font-medium">{comment.authorDisplayName}</span>
                  {comment.editedAt && (
                    <span className="text-gray-500 text-xs">{t("comments.edited")}</span>
                  )}
                </div>
                {comment.authorId === currentUserId && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEditing(comment.id, comment.text)}
                      className="text-gray-400 hover:text-dourado cursor-pointer"
                      aria-label={t("comments.editAria")}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => deleteComment.mutate(comment.id)}
                      className="text-gray-400 hover:text-red-400 cursor-pointer"
                      aria-label={t("comments.deleteAria")}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {editingId === comment.id ? (
                <div className="flex flex-col sm:flex-row gap-2 mt-1">
                  <Input
                    value={editingText}
                    onChange={(e) => setEditingText(e.target.value)}
                    containerClassName="flex-1"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" onClick={() => handleUpdate(comment.id)}>
                      {t("common.save")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-300 text-sm mt-1">{comment.text}</p>
              )}
            </div>
          ))}

          {data?.data.length === 0 && (
            <p className="text-gray-500 text-sm">{t("comments.empty")}</p>
          )}
        </div>
      </Card>
    </div>
  );
}
