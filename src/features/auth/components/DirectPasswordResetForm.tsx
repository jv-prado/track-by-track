import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useDirectPasswordResetMutation, useLoginMutation } from "@/queries/auth";
import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { FormField } from "@/shared/ui/FormField";
import { toast } from "@/shared/ui/toast-store";
import Logo from "@/assets/logo-full.png";

const setPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export function DirectPasswordResetForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { email } = useSearch({ strict: false }) as { email?: string };
  const directResetMutation = useDirectPasswordResetMutation();
  const loginMutation = useLoginMutation();

  useEffect(() => {
    if (!email) {
      void navigate({ to: "/login" });
    }
  }, [email, navigate]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetPasswordFormValues>({ resolver: zodResolver(setPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    if (!email) return;

    try {
      await directResetMutation.mutateAsync({ email, newPassword: values.newPassword });
      await loginMutation.mutateAsync({ email, password: values.newPassword });
      await navigate({ to: "/feed" });
    } catch (error) {
      const code = isApiError(error) ? error.code : undefined;
      toast.error(
        code === "WEAK_PASSWORD"
          ? t("auth.weakPassword")
          : "Erro ao definir senha. Tente novamente.",
      );
    }
  });

  const isSubmitting = directResetMutation.isPending || loginMutation.isPending;

  if (!email) return null;

  return (
    <>
      <div className="mb-4 sm:mb-6">
        <img src={Logo} alt="Logo" className="w-48 sm:w-56 mx-auto" />
      </div>

      <div className="bg-cinza-escuro p-5 sm:p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl sm:text-2xl text-dourado font-bold mb-4 sm:mb-6 text-center">
          {t("auth.setPasswordTitle")}
        </h2>

        <p className="text-gray-300 text-sm sm:text-base mb-4 sm:mb-6 text-center">
          {t("auth.setPasswordInstructions")}
        </p>

        <form onSubmit={onSubmit} className="mb-4">
          <FormField label={t("auth.email")} htmlFor="email">
            <p className="text-gray-200 text-sm px-3 py-2">{email}</p>
          </FormField>

          <FormField label={t("auth.newPassword")} htmlFor="newPassword" error={errors.newPassword?.message}>
            <PasswordInput id="newPassword" autoComplete="new-password" {...register("newPassword")} />
          </FormField>

          <FormField
            label={t("auth.confirmPassword")}
            htmlFor="confirmPassword"
            error={errors.confirmPassword?.message}
          >
            <PasswordInput
              id="confirmPassword"
              autoComplete="new-password"
              {...register("confirmPassword")}
            />
          </FormField>

          <Button type="submit" isLoading={isSubmitting} className="w-full mt-2">
            {isSubmitting ? t("auth.settingPassword") : t("auth.setPasswordButton")}
          </Button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <Link to="/login" className="text-dourado hover:underline font-medium text-sm sm:text-base">
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    </>
  );
}
