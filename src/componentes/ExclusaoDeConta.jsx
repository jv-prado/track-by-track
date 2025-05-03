import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { IoArrowBack } from "react-icons/io5";
import { MdEmail, MdWarning, MdDelete } from "react-icons/md";
import { excluirConta, excluirContaComEmailSenha } from "../services/firebase";
import {
  getFirestore,
  doc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  logout as logoutSpotify,
  estaAutenticado,
  iniciarLoginSpotify,
} from "../services/spotify";
import { getAuth, signInWithEmailAndPassword, deleteUser } from "firebase/auth";

export default function ExclusaoDeConta() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    usuario,
    usuarioDemo,
    modoDemo,
    usuarioSpotify,
    verificarOutrosMetodosAutenticacao,
  } = useAuth();
  const [showConfirmForm, setShowConfirmForm] = useState(false);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [automaticDeletion, setAutomaticDeletion] = useState(false);
  const [verificandoLogin, setVerificandoLogin] = useState(true);

  // Verificar se há parâmetros de query string que indicam que esta é uma navegação pós-callback do Spotify
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const fromCallback = params.get("from_callback") === "true";

    if (fromCallback) {
      // Remover os parâmetros de query string para evitar problemas em recargas
      navigate(location.pathname, { replace: true });

      // Se vier do callback e tivermos usuário Spotify, iniciar exclusão
      if (usuarioSpotify && usuarioSpotify.id) {
        setAutomaticDeletion(true);
        processDeletion();
      }
    }

    setVerificandoLogin(false);
  }, [location, navigate, usuarioSpotify]);

  // Função para bloquear o redirecionamento automático para o Feed após login com Spotify
  useEffect(() => {
    const blockFeedRedirect = () => {
      // Verificar se temos a flag que indica que estamos lidando com exclusão
      const fromExclusaoPagina =
        sessionStorage.getItem("from_exclusao_page") === "true";

      if (fromExclusaoPagina) {
        // Impedir o redirecionamento automático para o feed
        const preventRedirect = (e) => {
          // Verifica se a navegação é para o feed
          if (e.target.location.pathname === "/feed") {
            e.preventDefault();
            console.log("Redirecionamento bloqueado para processar exclusão");
          }
        };

        // Adicionar listener para bloquear navegações
        window.addEventListener("beforeunload", preventRedirect);
        window.addEventListener("popstate", preventRedirect);

        return () => {
          window.removeEventListener("beforeunload", preventRedirect);
          window.removeEventListener("popstate", preventRedirect);
        };
      }
    };

    const cleanup = blockFeedRedirect();
    return cleanup;
  }, []);

  // Verificar se o usuário acabou de fazer login com Spotify nesta página
  useEffect(() => {
    const checkSpotifyLoginAndDelete = async () => {
      // Verificar se acabamos de fazer login com Spotify
      const justLoggedIn = sessionStorage.getItem("login_redirect") === "true";
      const fromExclusaoPagina =
        sessionStorage.getItem("from_exclusao_page") === "true";

      if (
        justLoggedIn &&
        fromExclusaoPagina &&
        usuarioSpotify &&
        usuarioSpotify.id
      ) {
        console.log(
          "Usuário fez login com Spotify na página de exclusão. Iniciando exclusão automática..."
        );
        setAutomaticDeletion(true);
        processDeletion();
      }
    };

    if (!verificandoLogin && usuarioSpotify) {
      checkSpotifyLoginAndDelete();
    }
  }, [usuarioSpotify, verificandoLogin]);

  const processDeletion = async () => {
    try {
      // Mostrar estado de carregamento
      setCarregando(true);

      // Executar exclusão da conta
      await excluirContaSpotify();

      // Mostrar mensagem de sucesso
      setSucesso(true);

      // Limpar flag de redirecionamento
      sessionStorage.removeItem("login_redirect");
      sessionStorage.removeItem("from_exclusao_page");

      // Redirecionar para a tela de login após 2 segundos
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      console.error("Erro ao excluir conta automaticamente:", error);
      setErro(
        t(
          "accountDeletion.errorGeneric",
          "Erro ao excluir a conta. Tente novamente."
        )
      );
      setCarregando(false);
      setAutomaticDeletion(false);
    }
  };

  const handleVoltar = () => {
    navigate(-1);
  };

  const excluirContaSpotify = async () => {
    try {
      if (!usuarioSpotify || !usuarioSpotify.id) {
        throw new Error("ID do usuário Spotify não encontrado");
      }

      const db = getFirestore();
      const spotifyUserId = usuarioSpotify.id;
      console.log("Excluindo conta Spotify com ID:", spotifyUserId);

      const batch = writeBatch(db);

      // 1. Excluir documento principal na coleção usuariosSpotify
      const userDocRef = doc(db, "usuariosSpotify", spotifyUserId);
      batch.delete(userDocRef);

      // 2. Procurar e excluir todas as avaliações do usuário na coleção de avaliações
      const avaliacoesRef = collection(db, "avaliacoes");
      const avaliacoesQuery = query(
        avaliacoesRef,
        where("usuario_id", "==", spotifyUserId)
      );
      const avaliacoesSnap = await getDocs(avaliacoesQuery);

      console.log(`Encontradas ${avaliacoesSnap.size} avaliações para excluir`);

      avaliacoesSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // 3. Verificar se há entrada na coleção usuarios vinculada ao mesmo usuário Spotify
      const usuariosRef = collection(db, "usuarios");
      const usuariosQuery = query(
        usuariosRef,
        where("spotifyId", "==", spotifyUserId)
      );
      const usuariosSnap = await getDocs(usuariosQuery);

      console.log(
        `Encontrados ${usuariosSnap.size} documentos de usuário vinculados`
      );

      usuariosSnap.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Executar o batch de exclusões
      await batch.commit();
      console.log("Exclusão de dados no Firestore concluída com sucesso");

      // 4. NOVA FUNCIONALIDADE: Excluir o usuário do Firebase Authentication
      try {
        // Verificar se temos as credenciais salvas para autenticação
        const credentialsKey = `spotify_auth_${spotifyUserId}`;
        const credentialsJson = localStorage.getItem(credentialsKey);

        if (credentialsJson) {
          const credentials = JSON.parse(credentialsJson);
          const auth = getAuth();

          // Fazer login com as credenciais salvas
          console.log(
            "Autenticando para excluir usuário do Firebase Authentication"
          );
          const userCredential = await signInWithEmailAndPassword(
            auth,
            credentials.email,
            credentials.password
          );

          // Excluir o usuário do Firebase Authentication
          if (userCredential && userCredential.user) {
            console.log(
              "Excluindo usuário do Firebase Authentication:",
              userCredential.user.uid
            );
            await deleteUser(userCredential.user);
            console.log(
              "Usuário excluído do Firebase Authentication com sucesso"
            );
          }
        } else {
          // Também verificar o UID armazenado
          const firebaseUid = localStorage.getItem("spotify_firebase_uid");
          if (firebaseUid) {
            console.log(
              "Não foi possível excluir o usuário do Firebase Authentication pois as credenciais não estão disponíveis"
            );
            console.log("UID do Firebase associado:", firebaseUid);
          }
        }
      } catch (authError) {
        console.error(
          "Erro ao excluir usuário do Firebase Authentication:",
          authError
        );
        // Continuar o fluxo mesmo se falhar a exclusão do Auth
        console.log(
          "Continuando com o processo de logout mesmo após erro na exclusão do Auth"
        );
      }

      // 5. Fazer logout do Spotify e limpar todos os dados locais
      await logoutSpotify();
      console.log("Logout do Spotify concluído");

      return true;
    } catch (error) {
      console.error("Erro ao excluir conta do Spotify:", error);
      throw error;
    }
  };

  const handleLoginWithSpotify = async () => {
    try {
      // Definir flag para identificar que o login foi iniciado da página de exclusão
      sessionStorage.setItem("from_exclusao_page", "true");

      // Armazenar a URL atual para redirecionamento após callback
      const returnUrl = `${window.location.origin}${location.pathname}?from_callback=true`;
      localStorage.setItem("spotify_redirect_after_login", returnUrl);

      // Iniciar o fluxo de login com Spotify
      await iniciarLoginSpotify();
    } catch (error) {
      console.error("Erro ao iniciar login com Spotify:", error);
      setErro(t("login.errorSpotify", "Erro ao iniciar login com Spotify."));
    }
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
          onClick={() => navigate("/login")}
          className="mt-8 mx-auto bg-cinza-escuro text-white px-6 py-2 rounded-lg shadow hover:bg-cinza transition-colors cursor-pointer"
        >
          {t("app.login", "Entrar")}
        </button>
      </div>
    );
  }

  // Se estiver em processo de exclusão automática ou verificando login, mostrar mensagem de carregamento
  if (
    automaticDeletion ||
    (verificandoLogin && location.search.includes("from_callback=true"))
  ) {
    return (
      <div className="p-6 w-full flex flex-col justify-center">
        <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <h1 className="text-xl text-white font-bold mb-2">
            {t("accountDeletion.deleting", "Excluindo...")}
          </h1>
          <p className="text-gray-300">
            {t(
              "accountDeletion.automaticDeletion",
              "Sua conta Spotify está sendo excluída automaticamente."
            )}
          </p>
        </div>
      </div>
    );
  }

  // Página simplificada: apenas exclusão de conta do Spotify
  return (
    <div className="p-6 w-full flex flex-col justify-center">
      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl mx-auto">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">
          {t("accountDeletion.title", "Excluir conta Spotify")}
        </h1>
        <p className="text-gray-200 mb-4">
          {t(
            "accountDeletion.spotifyLoginMessage",
            "Para excluir sua conta, faça login com o Spotify abaixo. Todos os seus dados serão removidos permanentemente."
          )}
        </p>
        <div className="mt-6 mb-4 border-t border-gray-700 pt-4">
          <div className="bg-green-900/20 border border-green-800 p-4 rounded-lg mb-6">
            <div className="flex items-start">
              <MdWarning className="text-green-500 text-xl mr-2 mt-1 flex-shrink-0" />
              <p className="text-green-200 text-sm">
                {t(
                  "accountDeletion.spotifyLoginMessage",
                  "Se sua conta foi criada com Spotify, você pode fazer login abaixo para excluí-la automaticamente."
                )}
              </p>
            </div>
          </div>
          <button
            disabled={true}
            className="w-full bg-red-700/50 text-white py-3 px-4 rounded-lg font-medium transition-colors mb-6 opacity-60 cursor-not-allowed"
          >
            {t(
              "accountDeletion.loginWithSpotify",
              "Entrar com Spotify para excluir conta"
            )}
          </button>

          {/* Formulário para exclusão com email e senha do Firebase */}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setErro("");
              setCarregando(true);
              try {
                await excluirContaComEmailSenha(email, senha);
                setSucesso(true);
                setTimeout(() => {
                  navigate("/login");
                }, 2000);
              } catch (error) {
                setErro(
                  t(
                    "accountDeletion.errorGeneric",
                    "Erro ao excluir a conta. Tente novamente."
                  )
                );
              } finally {
                setCarregando(false);
              }
            }}
            className="bg-cinza-escuro border border-gray-700 rounded-lg p-4 mb-4"
          >
            <h3 className="text-white text-base font-semibold mb-3 text-center">
              {t(
                "accountDeletion.deleteWithEmailTitle",
                "Excluir conta com email e senha"
              )}
            </h3>
            <div className="mb-3">
              <label className="block text-gray-300 mb-1 text-sm">
                {t("auth.email", "Email")}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-cinza-medio p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque"
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-gray-300 mb-1 text-sm">
                {t("auth.password", "Senha")}
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className="w-full bg-cinza-medio p-2 rounded text-white focus:outline-none focus:ring-2 focus:ring-verde-destaque"
                required
              />
            </div>
            <button
              type="submit"
              disabled={carregando}
              className="w-full bg-red-700 hover:bg-red-600 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {carregando
                ? t("accountDeletion.deleting", "Excluindo...")
                : t(
                    "accountDeletion.deleteWithEmailButton",
                    "Excluir conta com email e senha"
                  )}
            </button>
            {erro && (
              <div className="bg-red-900/30 border border-red-500 text-red-200 p-2 rounded-lg mt-3 text-sm text-center">
                {erro}
              </div>
            )}
          </form>
        </div>
        <h2 className="text-xl text-white font-semibold mt-6 mb-2">
          {t("accountDeletion.dataDeleted", "O que será excluído?")}
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
        <p className="text-gray-200 mt-6 border-t border-gray-700 pt-4">
          {t("accountDeletion.timeframe")}
        </p>
        <div className="flex justify-center mt-8">
          <button
            onClick={() => navigate(-1)}
            className="bg-cinza-escuro hover:bg-cinza text-white px-6 py-3 rounded-lg shadow font-semibold text-base transition-colors cursor-pointer border border-gray-700 flex items-center gap-2"
          >
            <IoArrowBack className="text-lg" />
            {t("albumDetails.back", "Voltar")}
          </button>
        </div>
      </div>
    </div>
  );
}
