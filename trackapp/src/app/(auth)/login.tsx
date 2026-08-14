import { useState } from "react";
import { Image, Pressable, ScrollView, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react-native";
import { useLoginMutation } from "@/queries/auth";
import { isApiError } from "@/shared/api/errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { toast } from "@/components/ui/toast-store";
import { colors } from "@/lib/colors";
import Logo from "@/assets/images/logo.webp";

// Porta 1:1 de src/features/auth/components/LoginForm.tsx (web). Mensagens
// de validação/erro do web são literais (não passam por `t()` lá também) —
// mantidas literais aqui de propósito, pra bater 1:1.
const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { t } = useTranslation();
  const loginMutation = useLoginMutation();
  // no-op igual ao web — checkbox visual, não é enviado pro backend (ver
  // LoginForm.tsx original: `rememberMe` existe mas nunca é usado na mutation).
  const [rememberMe, setRememberMe] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await loginMutation.mutateAsync(values);
      // web manda pro redirect da query string ou /feed — mobile ainda não
      // tem deep link de redirect, sempre cai no feed.
      router.replace("/feed");
    } catch (error) {
      toast.error(
        isApiError(error) && error.code === "INVALID_CREDENTIALS"
          ? "E-mail ou senha incorretos."
          : "Erro ao fazer login. Tente novamente.",
      );
    }
  });

  return (
    <ScrollView
      className="flex-1 bg-grafite"
      contentContainerClassName="flex-grow items-center justify-center p-4"
    >
      <View className="mb-6 w-full max-w-md items-center">
        <Image source={Logo} style={{ width: 140, height: 140 }} resizeMode="contain" />
      </View>

      <View className="w-full max-w-md rounded-xl bg-cinza-escuro p-5">
        <Text
          className="mb-6 text-center text-dourado"
          style={{ fontFamily: "SFProDisplay-Bold", fontSize: 22 }}
        >
          {t("app.login")}
        </Text>

        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <FormField label={t("auth.email")} error={errors.email?.message}>
              <Input
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                icon={<Mail size={16} color={colors.cinzaMedio} />}
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <FormField label={t("auth.password")} error={errors.password?.message}>
              <PasswordInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoComplete="current-password"
              />
            </FormField>
          )}
        />

        <Pressable
          onPress={() => setRememberMe((v) => !v)}
          className="mb-4 flex-row items-center justify-end gap-2"
        >
          <Text className="text-sm text-gray-300">{t("auth.rememberMe")}</Text>
          <View
            className={`h-4 w-4 rounded ${rememberMe ? "bg-dourado" : "border border-white/20"}`}
          />
        </Pressable>

        <Button
          onPress={onSubmit}
          isLoading={loginMutation.isPending}
          className="mt-2 w-full"
        >
          {loginMutation.isPending ? t("auth.loggingIn") : t("app.login")}
        </Button>

        <View className="mt-6 flex-row justify-center gap-1">
          <Text className="text-sm text-gray-300">{t("auth.noAccount")}</Text>
          <Link href="/register" className="text-sm font-medium text-dourado">
            {t("auth.registerHere", "Registre-se aqui")}
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
