import { useState } from "react";
import { cadastrarUsuario } from "../../services/firebase";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../sidebar/assets/Logo.svg";
import { useTranslation } from "react-i18next";

export default function Registro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [consentimento, setConsentimento] = useState(false);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      setErro(t("auth.passwordMismatch"));
      return;
    }

    if (!consentimento) {
      setErro(t("auth.acceptTermsRequired"));
      return;
    }

    setCarregando(true);

    try {
      await cadastrarUsuario(email, senha, nome);

      // Definir "feed" como a view ativa no localStorage para que o App a utilize
      localStorage.setItem("activeView", "feed");

      // Definir flag para indicar que acabamos de fazer login
      sessionStorage.setItem("login_redirect", "true");

      // Redirecionar para o feed após o registro
      navigate("/feed");
    } catch (error) {
      console.error("Erro no cadastro:", error);
      if (error.code === "auth/email-already-in-use") {
        setErro(t("auth.emailInUse"));
      } else if (error.code === "auth/weak-password") {
        setErro(t("auth.weakPassword"));
      } else {
        setErro(t("auth.registerError"));
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleLogin = () => {
    // Navegar para a página de login mantendo o idioma atual
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-3 sm:p-4">
      <div className="mb-4 sm:mb-6">
        <img src={Logo} alt="Logo" className="w-32 sm:w-40 mx-auto" />
      </div>

      <div className="bg-cinza-escuro p-5 sm:p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl sm:text-2xl text-white font-bold mb-4 sm:mb-6 text-center">
          {t("auth.createAccount")}
        </h2>

        {erro && (
          <div className="bg-red-900/30 border border-red-500 text-red-200 p-2.5 sm:p-3 rounded-lg mb-4 text-sm sm:text-base">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3 sm:mb-4">
            <label className="block text-gray-300 mb-1.5 sm:mb-2 text-sm sm:text-base">
              {t("userProfile.user")}
            </label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-cinza-medio p-2.5 sm:p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque text-sm sm:text-base"
              required
            />
          </div>

          <div className="mb-3 sm:mb-4">
            <label className="block text-gray-300 mb-1.5 sm:mb-2 text-sm sm:text-base">
              {t("auth.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-cinza-medio p-2.5 sm:p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque text-sm sm:text-base"
              required
            />
          </div>

          <div className="mb-3 sm:mb-4">
            <label className="block text-gray-300 mb-1.5 sm:mb-2 text-sm sm:text-base">
              {t("auth.password")}
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-cinza-medio p-2.5 sm:p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque text-sm sm:text-base"
              required
              minLength={6}
            />
          </div>

          <div className="mb-5 sm:mb-6">
            <label className="block text-gray-300 mb-1.5 sm:mb-2 text-sm sm:text-base">
              {t("auth.confirmPassword")}
            </label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full bg-cinza-medio p-2.5 sm:p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque text-sm sm:text-base"
              required
            />
          </div>

          <div className="mb-5 sm:mb-6">
            <div className="flex items-start">
              <div className="flex items-center h-5">
                <input
                  id="consentimento"
                  type="checkbox"
                  checked={consentimento}
                  onChange={(e) => setConsentimento(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#1ED760] focus:ring-2 focus:ring-verde-destaque"
                  required
                />
              </div>
              <label
                htmlFor="consentimento"
                className="ml-2 text-sm sm:text-base text-gray-300"
              >
                {t("auth.acceptTerms", "Aceito a")}{" "}
                <Link
                  to="/politica-de-privacidade"
                  className="text-[#1ED760] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("privacyPolicy.title")}
                </Link>{" "}
                {t("auth.andThe", "e os")}{" "}
                <Link
                  to="/termos-de-uso"
                  className="text-[#1ED760] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("termsOfUse.title")}
                </Link>
                .
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando || !consentimento}
            className="w-full bg-[#1ED760] text-black font-bold py-2.5 sm:py-3 px-4 rounded-lg hover:bg-verde-destaque/90 transition disabled:opacity-50 cursor-pointer text-sm sm:text-base"
          >
            {carregando
              ? t("auth.registeringAccount")
              : t("auth.registerButton")}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-gray-300 text-sm sm:text-base">
            {t("auth.alreadyAccount")}{" "}
            <button
              onClick={handleLogin}
              className="text-[#1ED760] hover:underline font-medium cursor-pointer"
            >
              {t("auth.loginHere")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
