import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { IoArrowBack } from "react-icons/io5";
import { MdEmail, MdWarning, MdDelete } from "react-icons/md";
import { excluirConta, excluirContaComEmailSenha } from "../services/firebase";

export default function ExclusaoDeConta() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { usuario, usuarioDemo, modoDemo } = useAuth();
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const handleVoltar = () => {
    navigate(-1);
  };

  const handleDeletarConta = async (e) => {
    e.preventDefault();

    // Verificar se todos os campos estão preenchidos
    if ((!usuario && !email) || !senha || !confirmacao) {
      setErro(t("accountDeletion.errorEmptyField", "Preencha todos os campos"));
      return;
    }

    // Verificar se a confirmação está correta
    if (confirmacao !== "DELETAR") {
      setErro(
        t(
          "accountDeletion.errorConfirmText",
          "O texto de confirmação deve ser 'DELETAR'"
        )
      );
      return;
    }

    try {
      setCarregando(true);
      setErro("");

      // Se o usuário estiver logado, use a função normal; caso contrário, use a nova função com email e senha
      if (usuario) {
        await excluirConta(senha);
      } else {
        await excluirContaComEmailSenha(email, senha);
      }

      // Mostrar mensagem de sucesso
      setSucesso(true);

      // Redirecionar para a tela de login após 2 segundos
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Erro ao excluir a conta:", error);

      if (error.code === "auth/wrong-password") {
        setErro(t("accountDeletion.errorWrongPassword", "Senha incorreta"));
      } else if (error.code === "auth/invalid-email") {
        setErro(t("accountDeletion.errorInvalidEmail", "Email inválido"));
      } else if (error.code === "auth/user-not-found") {
        setErro(
          t("accountDeletion.errorUserNotFound", "Usuário não encontrado")
        );
      } else if (error.code === "auth/requires-recent-login") {
        setErro(
          t(
            "accountDeletion.errorReauth",
            "Por favor, faça login novamente antes de tentar esta operação"
          )
        );
        // Redirecionar para login
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setErro(
          t(
            "accountDeletion.errorGeneric",
            "Erro ao excluir a conta. Tente novamente."
          )
        );
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleDeleteLocalData = () => {
    // Para usuários demo, apenas limpar o localStorage
    localStorage.clear();
    setSucesso(true);

    // Redirecionar para a splash após 2 segundos
    setTimeout(() => {
      navigate("/splash");
    }, 2000);
  };

  // Renderização condicional com base no estado de sucesso
  if (sucesso) {
    return (
      <div className="p-6 w-full flex flex-col justify-center">
        <div className="bg-green-800/30 border border-green-500 p-6 rounded-xl w-full max-w-2xl mx-auto text-center">
          <div className="text-green-400 text-6xl mb-4 flex justify-center">
            <div className="rounded-full bg-green-900/50 p-4">
              <MdDelete />
            </div>
          </div>
          <h1 className="text-2xl text-white font-bold mb-2">
            {t("accountDeletion.successTitle", "Conta excluída com sucesso")}
          </h1>
          <p className="text-gray-200 mb-4">
            {t(
              "accountDeletion.successMessage",
              "Todas as suas informações foram removidas dos nossos servidores."
            )}
          </p>
        </div>
        <button
          onClick={() => navigate(-1)}
          className="mt-8 mx-auto bg-cinza-escuro text-white px-6 py-2 rounded-lg shadow hover:bg-cinza transition-colors cursor-pointer"
        >
          {t("albumDetails.back", "Voltar")}
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 w-full flex flex-col justify-center">
      {/* Botão de voltar apenas para dispositivos móveis */}
      <div className="md:hidden mb-4">
        <button
          onClick={handleVoltar}
          className="flex items-center bg-cinza py-2 px-4 rounded-lg hover:bg-cinza-escuro transition-colors"
        >
          <IoArrowBack className="mr-2" />
          {t("albumDetails.back", "Voltar")}
        </button>
      </div>

      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl mx-auto">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">
          {t("accountDeletion.title")}
        </h1>

        <p className="text-gray-200 mb-4">{t("accountDeletion.description")}</p>

        {!usuarioDemo && !modoDemo ? (
          <>
            {!showConfirmForm ? (
              <>
                <p className="text-gray-200 mb-2">
                  {t("accountDeletion.instructions")}
                </p>

                <div className="bg-cinza-medio p-4 rounded-lg flex items-center justify-center my-4">
                  <MdEmail className="text-verde-destaque text-xl mr-2" />
                  <a
                    href={`mailto:${t("accountDeletion.emailContact")}`}
                    className="text-verde-destaque hover:underline"
                  >
                    {t("accountDeletion.emailContact")}
                  </a>
                </div>

                <div className="mt-6 border-t border-gray-700 pt-4">
                  <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg mb-6">
                    <div className="flex items-start">
                      <MdWarning className="text-red-500 text-xl mr-2 mt-1 flex-shrink-0" />
                      <p className="text-red-200 text-sm">
                        {t(
                          "accountDeletion.autoDeleteWarning",
                          "Você também pode excluir sua conta diretamente pelo aplicativo. Esta ação é irreversível e todos os seus dados serão permanentemente excluídos."
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowConfirmForm(true)}
                    className="w-full bg-red-700 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                  >
                    {t("accountDeletion.deleteAccount", "Excluir minha conta")}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-4 border-t border-gray-700 pt-4">
                <h2 className="text-xl text-white font-semibold mb-4">
                  {t(
                    "accountDeletion.confirmTitle",
                    "Confirmar exclusão de conta"
                  )}
                </h2>

                <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg mb-6">
                  <div className="flex items-start">
                    <MdWarning className="text-red-500 text-2xl mr-2 mt-1 flex-shrink-0" />
                    <p className="text-red-200">
                      {t(
                        "accountDeletion.confirmWarning",
                        "Esta ação é irreversível. Todos os seus dados serão permanentemente excluídos e não poderão ser recuperados."
                      )}
                    </p>
                  </div>
                </div>

                {erro && (
                  <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg mb-4">
                    {erro}
                  </div>
                )}

                <form onSubmit={handleDeletarConta}>
                  {!usuario && (
                    <div className="mb-4">
                      <label className="block text-gray-300 mb-2 text-sm">
                        {t("accountDeletion.enterEmail", "Digite seu email")}
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-cinza-medio p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                        required
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2 text-sm">
                      {t(
                        "accountDeletion.enterPassword",
                        "Digite sua senha atual"
                      )}
                    </label>
                    <input
                      type="password"
                      value={senha}
                      onChange={(e) => setSenha(e.target.value)}
                      className="w-full bg-cinza-medio p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-gray-300 mb-2 text-sm">
                      {t(
                        "accountDeletion.confirmTypeDelete",
                        "Para confirmar, digite DELETAR"
                      )}
                    </label>
                    <input
                      type="text"
                      value={confirmacao}
                      onChange={(e) => setConfirmacao(e.target.value)}
                      className="w-full bg-cinza-medio p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                      required
                    />
                  </div>

                  <div className="flex gap-4 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowConfirmForm(false)}
                      className="flex-1 bg-cinza py-3 px-4 rounded-lg font-medium hover:bg-cinza-escuro transition-colors"
                    >
                      {t("albumDetails.cancel", "Cancelar")}
                    </button>
                    <button
                      type="submit"
                      disabled={carregando}
                      className="flex-1 bg-red-700 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {carregando
                        ? t("accountDeletion.deleting", "Excluindo...")
                        : t(
                            "accountDeletion.confirmDelete",
                            "Confirmar exclusão"
                          )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-gray-200 mt-4 bg-gray-800 p-3 rounded-lg">
              {t("accountDeletion.demo")}
            </p>

            <button
              onClick={handleDeleteLocalData}
              className="w-full mt-6 bg-red-700 hover:bg-red-600 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              {t("accountDeletion.clearLocalData", "Limpar meus dados locais")}
            </button>
          </>
        )}

        <h2 className="text-xl text-white font-semibold mt-6 mb-2">
          {t("accountDeletion.dataDeleted")}
        </h2>
        <ul className="list-disc pl-6 mb-4 text-gray-200">
          {t("accountDeletion.deleteItems", { returnObjects: true }).map(
            (item, index) => (
              <li key={`delete-${index}`} className="mb-1">
                {item}
              </li>
            )
          )}
        </ul>

        <h2 className="text-xl text-white font-semibold mt-4 mb-2">
          {t("accountDeletion.dataKept")}
        </h2>
        <ul className="list-disc pl-6 mb-4 text-gray-200">
          {t("accountDeletion.keptItems", { returnObjects: true }).map(
            (item, index) => (
              <li key={`kept-${index}`} className="mb-1">
                {item}
              </li>
            )
          )}
        </ul>

        <p className="text-gray-200 mt-6 border-t border-gray-700 pt-4">
          {t("accountDeletion.timeframe")}
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-8 mx-auto bg-cinza-escuro text-white px-6 py-2 rounded-lg shadow hover:bg-cinza transition-colors cursor-pointer"
        >
          {t("albumDetails.back", "Voltar")}
        </button>
      </div>
    </div>
  );
}
