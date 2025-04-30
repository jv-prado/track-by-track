import { useState } from "react";
import { cadastrarUsuario } from "../../services/firebase";
import { useNavigate, Link } from "react-router-dom";
import Logo from "../sidebar/assets/Logo.svg";

export default function Registro() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [consentimento, setConsentimento] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro("");

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }

    if (!consentimento) {
      setErro(
        "Você precisa aceitar os termos de uso e política de privacidade"
      );
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-3 sm:p-4">
      <div className="mb-4 sm:mb-6">
        <img src={Logo} alt="Logo" className="w-32 sm:w-40 mx-auto" />
      </div>

      <div className="bg-cinza-escuro p-5 sm:p-6 rounded-xl w-full max-w-md">
        <h2 className="text-xl sm:text-2xl text-white font-bold mb-4 sm:mb-6 text-center">
          Criar Conta
        </h2>

        {erro && (
          <div className="bg-red-900/30 border border-red-500 text-red-200 p-2.5 sm:p-3 rounded-lg mb-4 text-sm sm:text-base">
            {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3 sm:mb-4">
            <label className="block text-gray-300 mb-1.5 sm:mb-2 text-sm sm:text-base">
              Nome
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
              Email
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
              Senha
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
              Confirmar Senha
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
                Aceito a{" "}
                <Link
                  to="/politica-de-privacidade"
                  className="text-[#1ED760] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Política de Privacidade
                </Link>{" "}
                e os{" "}
                <Link
                  to="/termos-de-uso"
                  className="text-[#1ED760] hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Termos de Uso
                </Link>
                . Concordo com a coleta e processamento dos meus dados pessoais
                conforme descrito na política de privacidade.
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={carregando || !consentimento}
            className="w-full bg-[#1ED760] text-black font-bold py-2.5 sm:py-3 px-4 rounded-lg hover:bg-verde-destaque/90 transition disabled:opacity-50 cursor-pointer text-sm sm:text-base"
          >
            {carregando ? "Cadastrando..." : "Cadastrar"}
          </button>
        </form>

        <div className="mt-5 sm:mt-6 text-center">
          <p className="text-gray-300 text-sm sm:text-base">
            Já tem uma conta?{" "}
            <button
              onClick={() => navigate("/login")}
              className="text-[#1ED760] hover:underline font-medium cursor-pointer"
            >
              Entrar
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
