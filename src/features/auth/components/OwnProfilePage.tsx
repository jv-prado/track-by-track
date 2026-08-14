import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Loader2, Save } from "lucide-react";
import { useUpdateProfileMutation, useUploadAvatarMutation } from "@/queries/auth";
import { useAuthStore } from "@/shared/auth/auth.store";
import { isApiError } from "@/shared/api/errors";
import { toast } from "@/shared/ui/toast-store";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { FormField } from "@/shared/ui/FormField";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function OwnProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfileMutation();
  const uploadAvatar = useUploadAvatarMutation();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    updateProfile.mutate(
      { displayName: displayName.trim() },
      {
        onSuccess: () => toast.success(t("profile.saved")),
        onError: (error) => {
          const message =
            isApiError(error) && error.code === "USER_DISPLAY_NAME_ALREADY_TAKEN"
              ? error.message
              : t("profile.saveError");
          toast.error(message);
        },
      },
    );
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!ACCEPTED_AVATAR_TYPES.includes(file.type)) {
      setAvatarError(t("profile.avatarInvalidType"));
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setAvatarError(t("profile.avatarTooLarge"));
      return;
    }

    setAvatarError(null);
    uploadAvatar.mutate(file, {
      onError: () => setAvatarError(t("profile.avatarUploadFailed")),
    });
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-white text-xl font-bold mb-4">{t("profile.title")}</h1>

      <div className="flex items-center gap-4 mb-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadAvatar.isPending}
          className="relative w-16 h-16 rounded-full overflow-hidden bg-cinza-escuro shrink-0 disabled:opacity-60"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.displayName} className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-white text-lg">
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          )}
        </button>
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="secondary"
            disabled={uploadAvatar.isPending}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadAvatar.isPending ? t("common.saving") : t("profile.changeAvatar")}
          </Button>
          {avatarError && <p className="text-red-400 text-sm">{avatarError}</p>}
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_AVATAR_TYPES.join(",")}
          onChange={handleAvatarChange}
          className="hidden"
        />
      </div>

      <form onSubmit={handleSubmit} className="bg-cinza-escuro rounded-xl p-4 flex flex-col gap-3">
        <p className="text-gray-400 text-sm">{user.email}</p>

        <FormField label={t("profile.displayNameLabel")} htmlFor="displayName">
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </FormField>

        <Button type="submit" disabled={updateProfile.isPending} className="self-end gap-2">
          {updateProfile.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {updateProfile.isPending ? t("common.saving") : t("common.save")}
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link to="/delete-account" className="text-red-400 text-sm hover:underline">
          {t("profile.deleteAccountLink")}
        </Link>
      </div>
    </div>
  );
}
