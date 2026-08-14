import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";
import { Save } from "lucide-react-native";
import { useUpdateProfileMutation } from "@/queries/auth";
import { useAuthStore } from "@/shared/auth/auth.store";
import { isApiError } from "@/shared/api/errors";
import { toast } from "@/components/ui/toast-store";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FormField } from "@/components/ui/FormField";

/**
 * Porta de src/features/auth/components/OwnProfilePage.tsx (web). Upload de
 * avatar (`useUploadAvatarMutation`) não foi portado — precisa de
 * `expo-image-picker`, deferido desde a Fase 2 (não bloqueia edição de
 * perfil). Avatar aqui é só exibição.
 */
export function OwnProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useUpdateProfileMutation();
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");

  if (!user) return null;

  const handleSubmit = () => {
    updateProfile.mutate(
      { displayName: displayName.trim() },
      {
        onSuccess: () => toast.success("Perfil salvo."),
        onError: (error) => {
          const message =
            isApiError(error) && error.code === "USER_DISPLAY_NAME_ALREADY_TAKEN"
              ? error.message
              : "Não foi possível salvar o perfil.";
          toast.error(message);
        },
      },
    );
  };

  return (
    <ScrollView className="flex-1 bg-grafite" contentContainerClassName="p-4 pt-16">
      <Text className="mb-4 text-xl font-bold text-white">Meu perfil</Text>

      <View className="mb-4 flex-row items-center gap-4">
        <View className="h-16 w-16 overflow-hidden rounded-full bg-cinza-escuro">
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} className="h-full w-full" />
          ) : (
            <View className="h-full w-full items-center justify-center">
              <Text className="text-lg text-white">{user.displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      <View className="gap-3 rounded-xl bg-cinza-escuro p-4">
        <Text className="text-sm text-gray-400">{user.email}</Text>

        <FormField label="Nome de exibição">
          <Input value={displayName} onChangeText={setDisplayName} />
        </FormField>

        <Button onPress={handleSubmit} isLoading={updateProfile.isPending} className="self-end">
          <View className="flex-row items-center gap-2">
            {!updateProfile.isPending && <Save size={16} color="#ffffff" />}
            <Text className="text-sm font-semibold text-white">
              {updateProfile.isPending ? "Salvando..." : "Salvar"}
            </Text>
          </View>
        </Button>
      </View>

      <Pressable className="mt-6 items-center">
        <Link href="/delete-account">
          <Text className="text-sm text-red-400">Excluir minha conta</Text>
        </Link>
      </Pressable>
    </ScrollView>
  );
}
