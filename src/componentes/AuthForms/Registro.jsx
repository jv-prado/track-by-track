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

    // Validação de senha forte
    const senhaForteRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{6,}$/;
    if (!senhaForteRegex.test(senha)) {
      setErro(
        t(
          "auth.strongPassword",
          "A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial."
        )
      );
      return;
    }

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
              {t("userProfile.displayName", "Nome de exibição")}
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

        <div className="flex items-center my-4 sm:my-5">
          <div className="flex-grow border-t border-gray-700"></div>
          <span className="mx-3 text-gray-500 text-sm">
            {t("login.or", "ou")}
          </span>
          <div className="flex-grow border-t border-gray-700"></div>
        </div>

        {/* Botão de Login com Spotify (desabilitado) */}
        <div className="mb-5">
          <button
            disabled={true}
            className="w-full bg-[#1DB954]/50 text-white font-bold py-2.5 sm:py-3 px-4 rounded-lg transition disabled:opacity-50 cursor-not-allowed text-sm sm:text-base flex items-center justify-center"
          >
            <span className="mr-2">
              {/* Ícone simples Spotify */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="white"
              >
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.48.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </span>
            {t("login.registerWithSpotify", "Registrar com Spotify")} (
            {t("general.comingSoon", "em breve")})
          </button>
        </div>

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
