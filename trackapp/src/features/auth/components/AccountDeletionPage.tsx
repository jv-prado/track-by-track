import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useDeleteAccountMutation } from "@/queries/auth";
import { isApiError } from "@/shared/api/errors";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { toast } from "@/components/ui/toast-store";

// Porta 1:1 de src/features/auth/components/AccountDeletionPage.tsx (web).
export function AccountDeletionPage() {
  const deleteAccount = useDeleteAccountMutation();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);

  const handleSubmit = async () => {
    try {
      await deleteAccount.mutateAsync({ password });
      toast.success("Conta excluída.");
      router.replace("/login");
    } catch (err) {
      toast.error(
        isApiError(err) && err.code === "INVALID_CREDENTIALS"
          ? "Senha incorreta."
          : "Não foi possível excluir a conta.",
      );
    }
  };

  return (
    <ScrollView className="flex-1 bg-grafite" contentContainerClassName="p-4 pt-16">
      <Text className="mb-2 text-xl font-bold text-white">Excluir conta</Text>
      <Text className="mb-4 text-sm text-gray-400">
        Essa ação é permanente. Todos os seus rankings, reviews e comentários serão apagados.
      </Text>

      <View className="gap-3 rounded-xl bg-cinza-escuro p-4">
        <FormField label="Senha">
          <PasswordInput value={password} onChangeText={setPassword} />
        </FormField>

        {confirming ? (
          <View className="flex-row gap-2">
            <Button
              variant="danger"
              disabled={!password}
              isLoading={deleteAccount.isPending}
              onPress={handleSubmit}
              className="flex-1"
            >
              {deleteAccount.isPending ? "Excluindo..." : "Sim, excluir"}
            </Button>
            <Button variant="ghost" onPress={() => setConfirming(false)}>
              Cancelar
            </Button>
          </View>
        ) : (
          <Button variant="secondary" disabled={!password} onPress={() => setConfirming(true)}>
            Excluir minha conta
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
