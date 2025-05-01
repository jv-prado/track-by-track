import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { fazerLogin, auth } from "../../services/firebase";
import { logInfoAutenticacao } from "../../services/firebase/auth-helper";
import Logo from "../../assets/logo.svg";
import { configurarSincronizacaoAutomatica } from "../../services/avaliacoes";

const Login = () => {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoDemo, setCarregandoDemo] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();

  // Verificar se já está autenticado ao montar o componente
  useEffect(() => {
    const verificarAutenticacao = async () => {
      // Ver se há um usuário atual diretamente do auth
      const usuarioAtual = auth.currentUser;
      if (usuarioAtual) {
        console.log(
          "Login: Usuário já autenticado, redirecionando para feed",
          usuarioAtual.email
        );

        // Redirecionar para o feed se já estiver autenticado
        navigate("/feed");
        return;
      }

      // Verificação secundária através da nossa função auxiliar
      await logInfoAutenticacao();
    };

    verificarAutenticacao();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      console.log("Login: Tentando login com email:", email);
      await fazerLogin(email, senha);

      // Definir "feed" como a view ativa no localStorage para que o App a utilize
      localStorage.setItem("activeView", "feed");

      // Definir flag para indicar que acabamos de fazer login
      sessionStorage.setItem("login_redirect", "true");

      // Verificar se login foi bem-sucedido
      console.log("Login: Verificando autenticação após login");
      await logInfoAutenticacao();

      // Redirecionar para o feed global
      console.log("Login: Redirecionando para feed após login bem-sucedido");
      navigate("/feed");
    } catch (err) {
      console.error("Erro no login:", err);
      setErro(t("auth.loginError"));
    } finally {
      setCarregando(false);
    }
  };

  const iniciarModoDemo = () => {
    setCarregandoDemo(true);

    try {
      // Criar um "usuário demo" no localStorage
      const usuarioDemo = {
        id: "usuario-demo-" + Date.now(),
        nome: i18n.language.startsWith("en") ? "Demo User" : "Usuário Demo",
        email: "demo@example.com",
        tipo: "demo",
      };

      // Salvar token demo com validade de 7 dias
      const dataExpiracao = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("demo_usuario", JSON.stringify(usuarioDemo));
      localStorage.setItem("demo_token", "demo_" + Date.now());
      localStorage.setItem("demo_token_expiry", dataExpiracao.toString());

      // Definir "feed" como a view ativa
      localStorage.setItem("activeView", "feed");

      // Definir flag para indicar que acabamos de fazer login
      sessionStorage.setItem("login_redirect", "true");

      // Inicializar estruturas de dados para avaliações se não existirem
      if (!localStorage.getItem("avaliacoesFaixas")) {
        localStorage.setItem("avaliacoesFaixas", JSON.stringify({}));
      }

      if (!localStorage.getItem("mapaFaixasAlbuns")) {
        localStorage.setItem("mapaFaixasAlbuns", JSON.stringify({}));
      }

      if (!localStorage.getItem("datasAvaliacoes")) {
        localStorage.setItem("datasAvaliacoes", JSON.stringify({}));
      }

      if (!localStorage.getItem("preferenciasAlbuns")) {
        localStorage.setItem("preferenciasAlbuns", JSON.stringify({}));
      }

      // Sinalizar que o modo de demonstração está ativo
      localStorage.setItem("modo_demo_ativo", "true");

      // Configurar sincronização automática entre localStorage e memória
      configurarSincronizacaoAutomatica();

      // Forçar uma recarga completa para garantir que todas as partes da aplicação
      // reconheçam o usuário demo, em vez de usar o navigate
      window.location.href = "/feed";
    } catch (error) {
      console.error("Erro ao iniciar modo de demonstração:", error);
      setErro("Não foi possível iniciar o modo de demonstração.");
      setCarregandoDemo(false);
    }
  };

  const handleRegistrar = () => {
    // Navegar para a página de registro mantendo o idioma atual
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

        <form onSubmit={handleSubmit}>
          <div className="mb-3 sm:mb-4">
            <label className="block text-gray-300 mb-1.5 sm:mb-2 text-sm sm:text-base">
              {t("auth.email")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-cinza-medio p-2.5 sm:p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-claro text-sm sm:text-base"
              required
            />
          </div>

          <div className="mb-5 sm:mb-6">
            <label className="block text-gray-300 mb-1.5 sm:mb-2 text-sm sm:text-base">
              {t("auth.password")}
            </label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-cinza-medio p-2.5 sm:p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-claro text-sm sm:text-base"
              required
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#1ED760] text-black font-bold py-2.5 sm:py-3 px-4 rounded-lg hover:bg-[#1ED760]/90 transition disabled:opacity-50 cursor-pointer text-sm sm:text-base"
          >
            {carregando ? t("app.enteringAccount") : t("auth.loginButton")}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-gray-300 text-sm sm:text-base">
            {t("auth.noAccount")}{" "}
            <button
              onClick={handleRegistrar}
              className="text-[#1ED760] hover:underline font-medium cursor-pointer"
            >
              {t("auth.createAccount")}
            </button>
          </p>
        </div>

        <div className="mt-6 sm:mt-8 pt-5 sm:pt-6 border-t border-gray-700">
          <p className="text-xs sm:text-sm text-gray-400 text-center mb-3 sm:mb-4">
            {t("demoMode.wantToTry")}
          </p>
          <button
            onClick={iniciarModoDemo}
            disabled={carregandoDemo}
            className="w-full flex items-center justify-center bg-purple-700 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium hover:bg-purple-600 transition disabled:opacity-50 cursor-pointer text-sm sm:text-base"
          >
            {carregandoDemo ? t("demoMode.starting") : t("demoMode.useDemo")}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            {t("demoMode.feedNotAvailable")}
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
