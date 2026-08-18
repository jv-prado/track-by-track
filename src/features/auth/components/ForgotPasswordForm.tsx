import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { Mail } from "lucide-react";
import { useRequestPasswordResetMutation } from "@/queries/auth";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { FormField } from "@/shared/ui/FormField";
import Logo from "@/assets/logo-full.png";

const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const requestResetMutation = useRequestPasswordResetMutation();
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await requestResetMutation.mutateAsync(values);
    } catch {
      // resposta da API já é genérica (não revela se o e-mail existe) — trata como sucesso.
    }
    setSent(true);
  });

  return (
    <>
      <div className="mb-4 sm:mb-6">
        <img src={Logo} alt="Logo" className="w-48 sm:w-56 mx-auto" />
      </div>

      <div className="bg-cinza-escuro p-5 sm:p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl sm:text-2xl text-dourado font-bold mb-4 sm:mb-6 text-center">
          {t("auth.forgotPasswordTitle")}
        </h2>

        {sent ? (
          <p className="text-gray-300 text-sm sm:text-base text-center mb-4">
            {t("auth.resetEmailSent")}
          </p>
        ) : (
          <>
            <p className="text-gray-300 text-sm sm:text-base mb-4 sm:mb-6 text-center">
              {t("auth.forgotPasswordInstructions")}
            </p>

            <form onSubmit={onSubmit} className="mb-4">
              <FormField label={t("auth.email")} htmlFor="email" error={errors.email?.message}>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  icon={<Mail size={16} />}
                  {...register("email")}
                />
              </FormField>

              <Button type="submit" isLoading={requestResetMutation.isPending} className="w-full mt-2">
                {requestResetMutation.isPending ? t("auth.sending") : t("auth.sendResetLink")}
              </Button>
            </form>
          </>
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
