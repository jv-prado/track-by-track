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
        <h1 className="text-2xl text-white font-bold text-center mt-4">
          Track by Track
        </h1>
      </div>

      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-md">
        <h2 className="text-2xl text-white font-bold mb-6 text-center">
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
              className="w-full bg-cinza-medio p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-cinza-medio p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full bg-cinza-medio p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque"
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
              className="w-full bg-cinza-medio p-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque"
              required
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full bg-[#1ED760] text-black font-bold py-3 px-4 rounded-lg hover:bg-verde-destaque/90 transition disabled:opacity-50 cursor-pointer"
          >
            {carregando ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-300">
            Já tem uma conta?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-[#1ED760]  hover:underline font-medium cursor-pointer"
            >
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
