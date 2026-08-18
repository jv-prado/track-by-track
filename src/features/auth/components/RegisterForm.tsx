import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useRegisterMutation, useLoginMutation } from "@/queries/auth";
import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { FormField } from "@/shared/ui/FormField";
import { toast } from "@/shared/ui/toast-store";
import Logo from "@/assets/logo-full.png";

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

export function RegisterForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const registerMutation = useRegisterMutation();
  const loginMutation = useLoginMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await registerMutation.mutateAsync(values);
      await loginMutation.mutateAsync({ email: values.email, password: values.password });
      await navigate({ to: "/feed" });
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
    <>
      <div className="mb-4 sm:mb-6">
        <img src={Logo} alt="Logo" className="w-32 sm:w-40 mx-auto" />
      </div>

      <div className="bg-cinza-escuro p-5 sm:p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl sm:text-2xl text-white font-bold mb-4 sm:mb-6 text-center">
          {t("auth.createAccount")}
        </h2>

        <form onSubmit={onSubmit}>
          <FormField
            label={t("profile.displayNameLabel")}
            htmlFor="displayName"
            error={errors.displayName?.message}
          >
            <Input id="displayName" type="text" {...register("displayName")} />
          </FormField>

          <FormField label={t("auth.email")} htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
          </FormField>

          <FormField label={t("auth.password")} htmlFor="password" error={errors.password?.message}>
            <PasswordInput id="password" autoComplete="new-password" {...register("password")} />
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

          <div className="mb-5 sm:mb-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="consentimento"
                  type="checkbox"
                  className="w-4 h-4 rounded accent-dourado focus:ring-2 focus:ring-dourado"
                  {...register("consentimento")}
                />
              </div>
              <label htmlFor="consentimento" className="ml-2 text-sm sm:text-base text-gray-300">
                {t("auth.acceptTerms", "Aceito a")}{" "}
                <Link to="/privacy-policy" className="text-dourado hover:underline" target="_blank">
                  {t("privacyPolicy.title")}
                </Link>{" "}
                {t("auth.andThe", "e os")}{" "}
                <Link to="/terms-of-use" className="text-dourado hover:underline" target="_blank">
                  {t("termsOfUse.title")}
                </Link>
                .
              </label>
            </div>
            {errors.consentimento && (
              <p className="mt-1 text-sm text-red-400">{errors.consentimento.message}</p>
            )}
          </div>

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            {isSubmitting ? t("auth.registeringAccount") : t("auth.registerButton")}
          </Button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-gray-300 text-sm sm:text-base">
            {t("auth.alreadyAccount")}{" "}
            <Link to="/login" className="text-dourado hover:underline font-medium">
              {t("auth.loginHere")}
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
