import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fazerLogin, auth } from "../../services/firebase";
import { logInfoAutenticacao } from "../../services/firebase/auth-helper";
import Logo from "../../assets/logo.svg";
import { iniciarLoginSpotify } from "../../services/spotify";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoSpotify, setCarregandoSpotify] = useState(false);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  // Verificar se já está autenticado ao montar o componente
  useEffect(() => {
    const verificarAutenticacao = async () => {
      // Ver se há um usuário atual diretamente do auth
      const usuarioAtual = auth.currentUser;
      if (usuarioAtual) {
        // Redirecionar para o feed se já estiver autenticado
        navigate("/feed");
        return;
      }

      // Verificação secundária através da nossa função auxiliar
      await logInfoAutenticacao();
    };

    verificarAutenticacao();
  }, [navigate]);

  const handleLoginSpotify = () => {
    setCarregandoSpotify(true);
    try {
      iniciarLoginSpotify();
    } catch (error) {
      setErro(t("login.errorSpotify", "Erro ao iniciar login com Spotify."));
      setCarregandoSpotify(false);
    }
  };

  const handleLoginEmailSenha = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      await fazerLogin(email, senha);
      // Definir flag para indicar que acabamos de fazer login
      sessionStorage.setItem("login_redirect", "true");
      navigate("/feed");
    } catch (error) {
      console.error("Erro no login:", error);
      if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password"
      ) {
        setErro(t("login.invalidCredentials", "Email ou senha incorretos."));
      } else {
        setErro(t("login.errorLogin", "Erro ao fazer login. Tente novamente."));
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleRegistro = () => {
    navigate("/registro");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-3 sm:p-4">
      <div className="mb-4 sm:mb-6">
        <img src={Logo} alt="Logo" className="w-32 sm:w-40 mx-auto" />
      </div>

      <div className="bg-cinza-escuro p-5 sm:p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl sm:text-2xl text-verde-claro font-bold mb-4 sm:mb-6 text-center">
          {t("app.login")}
        </h2>

        {erro && (
          <div className="bg-red-900/30 border border-red-500 text-red-200 p-2.5 sm:p-3 rounded-lg mb-4 text-sm sm:text-base">
            {erro}
          </div>
        )}

        {/* Formulário de Login com Email e Senha */}
        <form onSubmit={handleLoginEmailSenha} className="mb-4">
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

          <div className="mb-4 sm:mb-5">
            <label className="block text-gray-300 mb-1.5 sm:mb-2 text-sm sm:text-base">
              {t("auth.password")}
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-cinza-medio p-2.5 sm:p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque text-sm sm:text-base"
              required
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#1ED760] text-black font-bold py-2.5 sm:py-3 px-4 rounded-lg hover:bg-verde-destaque/90 transition disabled:opacity-50 cursor-pointer text-sm sm:text-base"
          >
            {carregando
              ? t("login.loggingIn", "Entrando...")
              : t("app.login", "Entrar")}
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
        <div>
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
            {t("login.loginWithSpotify", "Entrar com Spotify")} (
            {t("general.comingSoon", "em breve")})
          </button>
        </div>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-gray-300 text-sm sm:text-base">
            {t("auth.noAccount")}{" "}
            <button
              onClick={handleRegistro}
              className="text-[#1ED760] hover:underline font-medium cursor-pointer"
            >
              {t("auth.registerHere", "Registre-se aqui")}
            </button>
          </p>
        </div>

        {/* Links para Política de Privacidade e Termos de Uso */}
        <div className="mt-6 pt-4 border-t border-gray-700 w-full">
          <div className="flex justify-center items-center gap-4 text-center w-full">
            <Link
              to="/politica-de-privacidade"
              className="flex-1 text-gray-400 text-xs hover:text-verde-destaque transition-colors break-words text-center max-w-[80px] sm:max-w-none"
              style={{
                minWidth: 0,
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              {t("privacyPolicy.title")}
            </Link>
            <span className="text-gray-600">|</span>
            <Link
              to="/termos-de-uso"
              className="flex-1 text-gray-400 text-xs hover:text-verde-destaque transition-colors break-words text-center max-w-[80px] sm:max-w-none"
              style={{
                minWidth: 0,
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              {t("termsOfUse.title")}
            </Link>
            <span className="text-gray-600">|</span>
            <Link
              to="/sobre"
              className="flex-1 text-gray-400 text-xs hover:text-verde-destaque transition-colors break-words text-center max-w-[80px] sm:max-w-none"
              style={{
                minWidth: 0,
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              {t("about.title")}
            </Link>
            <span className="text-gray-600">|</span>
            <Link
              to="/exclusao-de-conta"
              className="flex-1 text-gray-400 text-xs hover:text-verde-destaque transition-colors break-words text-center max-w-[80px] sm:max-w-none"
              style={{
                minWidth: 0,
                wordBreak: "break-word",
                whiteSpace: "normal",
              }}
            >
              {t("accountDeletion.title")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
