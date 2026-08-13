import { useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useDeleteAccountMutation } from "@/queries/auth";
import { isApiError } from "@/shared/api/errors";
import { Button } from "@/shared/ui/Button";
import { PasswordInput } from "@/shared/ui/PasswordInput";
import { FormField } from "@/shared/ui/FormField";

export function AccountDeletionPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const deleteAccount = useDeleteAccountMutation();
  const [password, setPassword] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await deleteAccount.mutateAsync({ password });
      await navigate({ to: "/login" });
    } catch (err) {
      setError(
        isApiError(err) && err.code === "INVALID_CREDENTIALS"
          ? t("accountDeletion.wrongPassword")
          : t("accountDeletion.genericError"),
      );
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-white text-xl font-bold mb-2">{t("accountDeletion.title")}</h1>
      <p className="text-gray-400 text-sm mb-4">{t("accountDeletion.warning")}</p>

      <form onSubmit={handleSubmit} className="bg-cinza-escuro rounded-xl p-4 flex flex-col gap-3">
        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-200 p-2.5 rounded-lg text-sm">
            {error}
          </div>
        )}

        <FormField label={t("accountDeletion.passwordLabel")} htmlFor="password">
          <PasswordInput
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </FormField>

        {confirming ? (
          <div className="flex gap-2">
            <Button
              type="submit"
              variant="danger"
              disabled={deleteAccount.isPending || !password}
              className="flex-1"
            >
              {deleteAccount.isPending ? t("accountDeletion.deleting") : t("accountDeletion.confirmYes")}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setConfirming(false)}>
              {t("common.cancel")}
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="secondary"
            disabled={!password}
            onClick={() => setConfirming(true)}
          >
            {t("accountDeletion.cta")}
          </Button>
        )}
      </form>
    </div>
  );
}
