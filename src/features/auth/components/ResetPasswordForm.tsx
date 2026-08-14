import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useResetPasswordMutation } from "@/queries/auth";
import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { FormField } from "@/shared/ui/FormField";
import { toast } from "@/shared/ui/toast-store";
import Logo from "@/assets/logo.svg";

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Mínimo de 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token } = useSearch({ strict: false }) as { token?: string };
  const resetPasswordMutation = useResetPasswordMutation();

  useEffect(() => {
    if (!token) {
      toast.error(t("auth.invalidResetToken"));
    }
  }, [token, t]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    if (!token) return;

    try {
      await resetPasswordMutation.mutateAsync({ token, newPassword: values.newPassword });
      toast.success(t("auth.resetSuccess"));
      await navigate({ to: "/login" });
    } catch (error) {
      const code = isApiError(error) ? error.code : undefined;
      toast.error(
        code === "INVALID_RESET_TOKEN"
          ? t("auth.invalidResetToken")
          : code === "WEAK_PASSWORD"
            ? t("auth.weakPassword")
            : "Erro ao redefinir senha. Tente novamente.",
      );
    }
  });

  return (
    <>
      <div className="mb-4 sm:mb-6">
        <img src={Logo} alt="Logo" className="w-32 sm:w-40 mx-auto" />
      </div>

      <div className="bg-cinza-escuro p-5 sm:p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl sm:text-2xl text-dourado font-bold mb-4 sm:mb-6 text-center">
          {t("auth.resetPasswordTitle")}
        </h2>

        {!token ? (
          <p className="text-gray-300 text-sm sm:text-base text-center mb-4">
            {t("auth.invalidResetToken")}
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mb-4">
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

            <Button type="submit" isLoading={resetPasswordMutation.isPending} className="w-full mt-2">
              {resetPasswordMutation.isPending ? t("auth.resettingPassword") : t("auth.resetPasswordButton")}
            </Button>
          </form>
        )}

        <div className="mt-5 sm:mt-6 text-center">
          <Link to="/login" className="text-dourado hover:underline font-medium text-sm sm:text-base">
            {t("auth.backToLogin")}
          </Link>
        </div>
      </div>
    </>
  );
}
