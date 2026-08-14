import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import { Save } from "lucide-react-native";
import { useUpdateProfileMutation, useUploadAvatarMutation } from "@/queries/auth";
import { useAuthStore } from "@/shared/auth/auth.store";
import { isApiError } from "@/shared/api/errors";
import { toast } from "@/components/ui/toast-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";
import { Spinner } from "@/components/ui/Spinner";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Porta 1:1 de src/features/auth/components/OwnProfilePage.tsx (web) —
// upload de avatar via expo-image-picker (RN não tem <input type="file">).
export function OwnProfilePage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfileMutation();
  const uploadAvatar = useUploadAvatarMutation();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");

  if (!user) return null;

  const handleSubmit = () => {
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

  const handlePickAvatar = async () => {
    // Permissão de galeria não existe no fluxo web (input file não pede
    // permissão de SO) — mensagem sem chave de tradução equivalente.
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      toast.error("Precisa de permissão pra acessar suas fotos.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9,
      allowsEditing: true,
      aspect: [1, 1],
    });
    if (result.canceled) return;

    const asset = result.assets[0];
    if (!asset) return;

    const type = asset.mimeType ?? "image/jpeg";
    if (!ACCEPTED_AVATAR_TYPES.includes(type)) {
      toast.error(t("profile.avatarInvalidType"));
      return;
    }
    if (asset.fileSize && asset.fileSize > MAX_AVATAR_BYTES) {
      toast.error(t("profile.avatarTooLarge"));
      return;
    }

    uploadAvatar.mutate(
      { uri: asset.uri, name: asset.fileName ?? "avatar.jpg", type },
      {
        onSuccess: () => toast.success(t("profile.avatarSaved")),
        onError: () => toast.error(t("profile.avatarUploadFailed")),
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-grafite" contentContainerClassName="p-4 pt-16">
      <Text className="mb-4 text-xl font-bold text-white">{t("profile.title")}</Text>

      <View className="mb-4 flex-row items-center gap-4">
        <Pressable
          onPress={handlePickAvatar}
          disabled={uploadAvatar.isPending}
          className="h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-cinza-escuro"
        >
          {uploadAvatar.isPending ? (
            <Spinner size={20} />
          ) : user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} className="h-full w-full" />
          ) : (
            <Text className="text-lg text-white">{user.displayName.charAt(0).toUpperCase()}</Text>
          )}
        </Pressable>
        <Button variant="secondary" isLoading={uploadAvatar.isPending} onPress={handlePickAvatar}>
          {uploadAvatar.isPending ? t("common.saving") : t("profile.changeAvatar")}
        </Button>
      </View>

      <View className="gap-3 rounded-xl bg-cinza-escuro p-4">
        <Text className="text-sm text-gray-400">{user.email}</Text>

        <FormField label={t("profile.displayNameLabel")}>
          <Input value={displayName} onChangeText={setDisplayName} />
        </FormField>

        <Button onPress={handleSubmit} isLoading={updateProfile.isPending} className="self-end">
          <View className="flex-row items-center gap-2">
            {!updateProfile.isPending && <Save size={16} color="#ffffff" />}
            <Text className="text-sm font-semibold text-white">
              {updateProfile.isPending ? t("common.saving") : t("common.save")}
            </Text>
          </View>
        </Button>
      </View>

      <Pressable className="mt-6 items-center">
        <Link href="/delete-account">
          <Text className="text-sm text-red-400">{t("profile.deleteAccountLink")}</Text>
        </Link>
      </Pressable>
    </ScrollView>
  );
}
