import { useState } from "react";
import { fazerLogin } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import Logo from "../sidebar/assets/Logo.svg";
import { configurarSincronizacaoAutomatica } from "../../services/avaliacoes";

export default function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [carregandoDemo, setCarregandoDemo] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");
    setCarregando(true);

    try {
      await fazerLogin(email, senha);
      navigate("/feed");
    } catch (error) {
      console.error("Erro no login:", error);
      setErro("Erro ao fazer login. Verifique seu email e senha.");
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
        nome: "Usuário Demo",
        email: "demo@example.com",
        tipo: "demo",
      };

      // Salvar token demo com validade de 7 dias
      const dataExpiracao = Date.now() + 7 * 24 * 60 * 60 * 1000;
      localStorage.setItem("demo_usuario", JSON.stringify(usuarioDemo));
      localStorage.setItem("demo_token", "demo_" + Date.now());
      localStorage.setItem("demo_token_expiry", dataExpiracao.toString());

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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="mb-6">
        <img src={Logo} alt="Logo" className="w-28 mx-auto" />
        <h1 className="text-2xl text-verde-claro font-bold text-center mt-4">
          Track by Track
        </h1>
      </div>

      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-md">
        <h2 className="text-2xl text-verde-claro font-bold mb-6 text-center">
          Entre na sua conta
        </h2>

        {erro && (
          <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg mb-4">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-cinza-medio p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-claro"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-cinza-medio p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-claro"
              required
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#1ED760] text-black font-bold py-3 px-4 rounded-lg hover:bg-[#1ED760]/90 transition disabled:opacity-50 cursor-pointer"
          >
            {carregando ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-300">
            Não tem uma conta?{" "}
            <button
              onClick={() => navigate("/registro")}
              className="text-[#1ED760] hover:underline font-medium cursor-pointer"
            >
              Cadastre-se
            </button>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center mb-4">
            Quer experimentar sem criar uma conta?
          </p>
          <button
            onClick={iniciarModoDemo}
            disabled={carregandoDemo}
            className="w-full flex items-center justify-center bg-purple-700 text-white py-3 px-4 rounded-lg font-medium hover:bg-purple-600 transition disabled:opacity-50 cursor-pointer"
          >
            {carregandoDemo ? "Iniciando..." : "Usar Modo de Demonstração"}
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            Suas avaliações ficarão salvas apenas neste navegador
          </p>
        </div>
      </div>
    </div>
  );
}
