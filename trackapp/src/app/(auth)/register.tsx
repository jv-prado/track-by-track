import { Pressable, ScrollView, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { Link, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLoginMutation, useRegisterMutation } from "@/queries/auth";
import { isApiError } from "@/shared/api/errors";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { FormField } from "@/components/ui/FormField";
import { toast } from "@/components/ui/toast-store";
import Logo from "@/assets/images/logo.svg";

// Porta 1:1 de src/features/auth/components/RegisterForm.tsx (web). Mensagens
// de validação/erro do web são literais (não passam por `t()` lá) —
// mantidas literais aqui de propósito, pra bater 1:1.
const registerSchema = z
  .object({
    displayName: z.string().min(1, "Informe seu nome"),
    email: z.string().email("E-mail inválido"),
    password: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string(),
    consentimento: z.literal(true, {
      errorMap: () => ({ message: "Você precisa aceitar os termos" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const { t } = useTranslation();
  const registerMutation = useRegisterMutation();
  const loginMutation = useLoginMutation();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { consentimento: undefined },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerMutation.mutateAsync(values);
      await loginMutation.mutateAsync({ email: values.email, password: values.password });
      router.replace("/feed");
    } catch (error) {
      toast.error(
        isApiError(error) && error.code === "USER_EMAIL_ALREADY_TAKEN"
          ? "Este e-mail já está em uso."
          : "Erro ao criar conta. Tente novamente.",
      );
    }
  });

  const isSubmitting = registerMutation.isPending || loginMutation.isPending;

  return (
    <ScrollView
      className="flex-1 bg-grafite"
      contentContainerClassName="flex-grow items-center justify-center p-4"
    >
      <View className="mb-6 w-full max-w-md items-center">
        <Logo width={140} height={70} />
      </View>

      <View className="w-full max-w-md rounded-xl bg-cinza-escuro p-5">
        <Text
          className="mb-6 text-center text-white"
          style={{ fontFamily: "SFProDisplay-Bold", fontSize: 22 }}
        >
          {t("auth.createAccount")}
        </Text>

        <Controller
          control={control}
          name="displayName"
          render={({ field }) => (
            <FormField label={t("profile.displayNameLabel")} error={errors.displayName?.message}>
              <Input value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
            </FormField>
          )}
        />

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
                autoComplete="new-password"
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field }) => (
            <FormField label={t("auth.confirmPassword")} error={errors.confirmPassword?.message}>
              <PasswordInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                autoComplete="new-password"
              />
            </FormField>
          )}
        />

        <Controller
          control={control}
          name="consentimento"
          render={({ field }) => (
            <View className="mb-6">
              <Pressable
                onPress={() => field.onChange(!field.value)}
                className="flex-row items-start gap-2"
              >
                <View
                  className={`mt-0.5 h-4 w-4 rounded ${field.value ? "bg-dourado" : "border border-white/20"}`}
                />
                {/* Links de política/termos (rotas estáticas ainda não portadas)
                    — texto simples por enquanto, sem link quebrado. */}
                <Text className="flex-1 text-sm text-gray-300">
                  {t("auth.acceptTerms", "Aceito a")} {t("privacyPolicy.title")}{" "}
                  {t("auth.andThe", "e os")} {t("termsOfUse.title")}.
                </Text>
              </Pressable>
              {errors.consentimento && (
                <Text className="mt-1 text-sm text-red-400">{errors.consentimento.message}</Text>
              )}
            </View>
          )}
        />

        <Button onPress={onSubmit} isLoading={isSubmitting} className="w-full">
          {isSubmitting ? t("auth.registeringAccount") : t("auth.registerButton")}
        </Button>

        <View className="mt-6 flex-row justify-center gap-1">
          <Text className="text-sm text-gray-300">{t("auth.alreadyAccount")}</Text>
          <Link href="/login" className="text-sm font-medium text-dourado">
            {t("auth.loginHere")}
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}
