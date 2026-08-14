import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useLoginMutation } from "@/queries/auth";
import { isApiError } from "@/shared/api/errors";
import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Input } from "@/shared/ui/Input";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { FormField } from "@/shared/ui/FormField";
import { toast } from "@/shared/ui/toast-store";
import Logo from "@/assets/logo.svg";

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { redirect?: string };
  const loginMutation = useLoginMutation();
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await loginMutation.mutateAsync(values);
      await navigate({ to: search.redirect ?? "/feed" });
    } catch (error) {
      if (isApiError(error) && error.code === "MUST_RESET_PASSWORD") {
        toast.error(t("auth.mustResetPassword"));
        await navigate({ to: "/definir-senha", search: { email: values.email } });
        return;
      }

      toast.error(
        isApiError(error) && error.code === "INVALID_CREDENTIALS"
          ? "E-mail ou senha incorretos."
          : "Erro ao fazer login. Tente novamente.",
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
          {t("app.login")}
        </h2>

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

          <FormField label={t("auth.password")} htmlFor="password" error={errors.password?.message}>
            <PasswordInput id="password" autoComplete="current-password" {...register("password")} />
          </FormField>

          <div className="flex items-center justify-between mb-4 text-sm text-gray-300">
            <label className="flex items-center gap-2 cursor-pointer">
              {t("auth.rememberMe")}
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded accent-dourado focus:ring-2 focus:ring-dourado cursor-pointer"
              />
            </label>
            <Link to="/esqueci-senha" className="text-dourado hover:underline">
              {t("auth.forgotPasswordLink")}
            </Link>
          </div>

          <Button type="submit" isLoading={loginMutation.isPending} className="w-full mt-2">
            {loginMutation.isPending ? t("auth.loggingIn") : t("app.login")}
          </Button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-gray-300 text-sm sm:text-base">
            {t("auth.noAccount")}{" "}
            <Link to="/register" className="text-dourado hover:underline font-medium">
              {t("auth.registerHere", "Registre-se aqui")}
            </Link>
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-700 w-full">
          <div className="flex justify-center items-center gap-4 text-center w-full flex-wrap">
            <Link
              to="/privacy-policy"
              className="text-gray-400 text-xs hover:text-dourado transition-colors"
            >
              {t("privacyPolicy.title")}
            </Link>
            <span className="text-gray-600">|</span>
            <Link
              to="/terms-of-use"
              className="text-gray-400 text-xs hover:text-dourado transition-colors"
            >
              {t("termsOfUse.title")}
            </Link>
            <span className="text-gray-600">|</span>
            <Link to="/about" className="text-gray-400 text-xs hover:text-dourado transition-colors">
              {t("about.title")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
