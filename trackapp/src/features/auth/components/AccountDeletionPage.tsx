import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useDeleteAccountMutation } from "@/queries/auth";
import { isApiError } from "@/shared/api/errors";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { toast } from "@/components/ui/toast-store";

// Porta 1:1 de src/features/auth/components/AccountDeletionPage.tsx (web).
export function AccountDeletionPage() {
  const { t } = useTranslation();
  const deleteAccount = useDeleteAccountMutation();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);

  const handleSubmit = async () => {
    try {
      await deleteAccount.mutateAsync({ password });
      toast.success(t("accountDeletion.success"));
      router.replace("/login");
    } catch (err) {
      toast.error(
        isApiError(err) && err.code === "INVALID_CREDENTIALS"
          ? t("accountDeletion.wrongPassword")
          : t("accountDeletion.genericError"),
      );
    }
  };

  return (
    <ScrollView className="flex-1 bg-grafite" contentContainerClassName="p-4 pt-16">
      <Text className="mb-2 text-xl font-bold text-white">{t("accountDeletion.title")}</Text>
      <Text className="mb-4 text-sm text-gray-400">{t("accountDeletion.warning")}</Text>

      <View className="gap-3 rounded-xl bg-cinza-escuro p-4">
        <FormField label={t("accountDeletion.passwordLabel")}>
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
              {deleteAccount.isPending ? t("accountDeletion.deleting") : t("accountDeletion.confirmYes")}
            </Button>
            <Button variant="ghost" onPress={() => setConfirming(false)}>
              {t("common.cancel")}
            </Button>
          </View>
        ) : (
          <Button variant="secondary" disabled={!password} onPress={() => setConfirming(true)}>
            {t("accountDeletion.cta")}
          </Button>
        )}
      </View>
    </ScrollView>
  );
}
