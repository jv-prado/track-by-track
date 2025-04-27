import { useState } from "react";
import { cadastrarUsuario } from "../../services/firebase";
import { useNavigate } from "react-router-dom";
import Logo from "../sidebar/assets/Logo.svg";

export default function Registro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }

    setCarregando(true);

    try {
      await cadastrarUsuario(email, senha, nome);
      navigate("/feed");
    } catch (error) {
      console.error("Erro no cadastro:", error);
      if (error.code === "auth/email-already-in-use") {
        setErro("Email já está em uso");
      } else if (error.code === "auth/weak-password") {
        setErro("Senha muito fraca. Use pelo menos 6 caracteres");
      } else {
        setErro("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleSpotifyLogin = () => {
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="mb-6">
        <img src={Logo} alt="Logo" className="w-28 mx-auto" />
        <h1 className="text-2xl text-[#1ED760] font-bold text-center mt-4">
          Track by Track
        </h1>
      </div>

      <div className="bg-[#121212] p-6 rounded-xl w-full max-w-md">
        <h2 className="text-2xl text-[#1ED760] font-bold mb-6 text-center">
          Criar Conta
        </h2>

        {erro && (
          <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg mb-4">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Nome</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full bg-[#2A2A2A] p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1ED760]"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#2A2A2A] p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1ED760]"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-[#2A2A2A] p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1ED760]"
              required
              minLength={6}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 mb-2">Confirmar Senha</label>
            <input
              type="password"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              className="w-full bg-[#2A2A2A] p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#1ED760]"
              required
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#1ED760] text-black font-bold py-3 px-4 rounded-lg hover:bg-[#1ED760]/90 transition disabled:opacity-50 cursor-pointer"
          >
            {carregando ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-300">
            Já tem uma conta?{" "}
            <button
              onClick={() => navigate("/login-firebase")}
              className="text-[#1ED760] hover:underline font-medium cursor-pointer"
            >
              Entrar
            </button>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-300 text-center mb-4">
            Deseja usar o Spotify para descobrir músicas?
          </p>
          <button
            onClick={handleSpotifyLogin}
            className="w-full flex items-center justify-center bg-[#1DB954] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1DB954]/90 transition cursor-pointer"
          >
            <svg
              className="w-5 h-5 mr-2"
              viewBox="0 0 24 24"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2ZM16.5563 16.5563C16.3204 16.7922 15.9466 16.7922 15.7107 16.5563C14.0323 14.878 11.6597 14.4715 8.31426 15.2266C7.94716 15.3042 7.58622 15.0838 7.50864 14.7167C7.43105 14.3497 7.65147 13.9887 8.01857 13.9111C11.7247 13.0695 14.4658 13.5639 16.4414 15.5394C16.6773 15.7753 16.6773 16.1491 16.4414 16.385L16.5563 16.5563Z" />
            </svg>
            Conectar com Spotify
          </button>
        </div>
      </div>
    </div>
  );
}
