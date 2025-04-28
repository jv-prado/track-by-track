// Configuração e funções para o Firebase
import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  getDocs,
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Configuração do Firebase - substitua por suas credenciais
const firebaseConfig = {
  apiKey: "AIzaSyAF8eeDOfLnaktKiIeKTY1OXNva80JqJO8",
  authDomain: "trackbytrack-57ae6.firebaseapp.com",
  projectId: "trackbytrack-57ae6",
  storageBucket: "trackbytrack-57ae6.firebasestorage.app",
  messagingSenderId: "504754961673",
  appId: "1:504754961673:web:5eca907880c9ec4cec67d8",
  measurementId: "G-RE6EYL95KG",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/**
 * Cadastra um novo usuário
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * @param {string} nome - Nome do usuário
 * @returns {Promise<Object>} Objeto com dados do usuário cadastrado
 */
export const cadastrarUsuario = async (email, senha, nome) => {
  try {
    // Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      senha
    );
    const user = userCredential.user;

    // Atualizar o nome do perfil
    await updateProfile(user, {
      displayName: nome,
    });

    // Criar documento do usuário no Firestore
    await setDoc(doc(db, "usuarios", user.uid), {
      nome,
      email,
      albuns_avaliados: [],
      data_cadastro: new Date(),
    });

    return {
      uid: user.uid,
      email: user.email,
      nome: user.displayName,
    };
  } catch (error) {
    console.error("Erro ao cadastrar usuário:", error);
    throw error;
  }
};

/**
 * Realiza login do usuário
 * @param {string} email - Email do usuário
 * @param {string} senha - Senha do usuário
 * @returns {Promise<Object>} Objeto com dados do usuário logado
 */
export const fazerLogin = async (email, senha) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, senha);
    const user = userCredential.user;

    // Buscar dados adicionais do Firestore
    const userRef = doc(db, "usuarios", user.uid);
    const userDoc = await getDoc(userRef);

    // Sincronizar a foto de perfil do Auth com o Firestore, se necessário
    if (user.photoURL) {
      if (!userDoc.exists()) {
        // Criar documento do usuário se não existir
        await setDoc(userRef, {
          nome: user.displayName || "",
          email: user.email,
          foto_perfil: user.photoURL,
          albuns_avaliados: [],
          data_cadastro: new Date(),
        });
      } else if (userDoc.data().foto_perfil !== user.photoURL) {
        // Atualizar apenas a foto de perfil se for diferente
        await updateDoc(userRef, {
          foto_perfil: user.photoURL,
        });
      }
    }

    return {
      uid: user.uid,
      email: user.email,
      nome: user.displayName,
      dados: userDoc.exists() ? userDoc.data() : {},
    };
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    throw error;
  }
};

/**
 * Realiza logout do usuário
 */
export const fazerLogout = async () => {
  return await signOut(auth);
};

/**
 * Obtém o usuário atualmente autenticado
 * @returns {Object|null} Usuário atual ou null se não estiver autenticado
 */
export const getUsuarioAtual = () => {
  return auth.currentUser;
};

/**
 * Observa mudanças no estado de autenticação
 * @param {Function} callback - Função a ser chamada quando o estado mudar
 * @returns {Function} Função para cancelar a observação
 */
export const observarAutenticacao = (callback) => {
  return onAuthStateChanged(auth, callback);
};

/**
 * Salva a avaliação de um álbum para o usuário atual
 * @param {string} albumId - ID do álbum no Spotify
 * @param {Object} avaliacoesFaixas - Objeto com avaliações das faixas
 * @param {string} nome - Nome do álbum
 * @param {string} artista - Nome do artista
 * @param {string} imagem - URL da imagem do álbum
 * @param {Object} preferencias - Preferências de faixa favorita e pior faixa (opcional)
 */
export const salvarAvaliacaoAlbum = async (
  albumId,
  avaliacoesFaixas,
  nome,
  artista,
  imagem,
  preferencias = null
) => {
  try {
    const user = getUsuarioAtual();
    if (!user) throw new Error("Usuário não autenticado");

    const userRef = doc(db, "usuarios", user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error("Documento do usuário não encontrado");
    }

    // Verificar se o álbum já existe na lista do usuário
    const albumsAvaliados = userDoc.data().albuns_avaliados || [];
    const albumExistente = albumsAvaliados.find(
      (album) => album.id === albumId
    );

    const dadosAlbum = {
      id: albumId,
      nome,
      artista,
      imagem,
      avaliacoes: avaliacoesFaixas,
      data_avaliacao: new Date(),
    };

    // Adicionar preferências se fornecidas
    if (preferencias) {
      dadosAlbum.preferencias = preferencias;
    }

    if (albumExistente) {
      // Se o álbum já existe, preservar a data da primeira avaliação
      if (albumExistente.data_primeira_avaliacao) {
        dadosAlbum.data_primeira_avaliacao =
          albumExistente.data_primeira_avaliacao;
      } else {
        // Se não tiver data da primeira avaliação registrada, usar a data atual
        dadosAlbum.data_primeira_avaliacao = new Date();
      }

      // Atualizar álbum existente
      await updateDoc(userRef, {
        albuns_avaliados: arrayRemove(albumExistente),
      });

      await updateDoc(userRef, {
        albuns_avaliados: arrayUnion(dadosAlbum),
      });
    } else {
      // Para um novo álbum, a data da primeira avaliação é agora
      dadosAlbum.data_primeira_avaliacao = new Date();

      // Adicionar novo álbum
      await updateDoc(userRef, {
        albuns_avaliados: arrayUnion(dadosAlbum),
      });
    }

    return dadosAlbum;
  } catch (error) {
    console.error("Erro ao salvar avaliação:", error);
    throw error;
  }
};

/**
 * Obtém todas as avaliações de álbuns do usuário atual
 * @returns {Promise<Array>} Array com álbuns avaliados
 */
export const obterAlbunsAvaliados = async () => {
  try {
    const user = getUsuarioAtual();
    if (!user) throw new Error("Usuário não autenticado");

    const userDoc = await getDoc(doc(db, "usuarios", user.uid));

    if (!userDoc.exists()) {
      return [];
    }

    return userDoc.data().albuns_avaliados || [];
  } catch (error) {
    console.error("Erro ao obter álbuns avaliados:", error);
    throw error;
  }
};

/**
 * Obtém as médias de avaliações mais recentes de todos os usuários
 * @param {number} limite - Número máximo de avaliações a retornar
 * @returns {Promise<Array>} Array com as avaliações mais recentes
 */
export const obterAvaliacoesGlobais = async (limite = 20) => {
  try {
    // Referência para a coleção de usuários
    const usuariosRef = collection(db, "usuarios");

    // Buscar todos os documentos de usuários
    const snapshot = await getDocs(usuariosRef);

    // Array para armazenar todas as avaliações
    let todasAvaliacoes = [];

    // Processar cada documento de usuário
    snapshot.forEach((doc) => {
      const dadosUsuario = doc.data();
      const albuns = dadosUsuario.albuns_avaliados || [];

      // Para cada álbum avaliado pelo usuário
      albuns.forEach((album) => {
        // Calcular a média das avaliações deste álbum
        let soma = 0;
        const avaliacoes = album.avaliacoes || {};
        const totalFaixas = Object.keys(avaliacoes).length;

        if (totalFaixas === 0) return; // Ignorar álbuns sem faixas avaliadas

        // Somar todas as avaliações, incluindo zeros
        Object.values(avaliacoes).forEach((avaliacao) => {
          soma += avaliacao || 0;
        });

        // Calcular média na escala 0-5 e converter para 0-10
        const mediaEscala5 = soma / totalFaixas;
        const mediaAvaliacao = mediaEscala5 * 2;

        // Adicionar esta avaliação ao array de todas as avaliações
        if (totalFaixas > 0) {
          // Usar a foto de perfil do Firestore (que agora é sincronizada)
          todasAvaliacoes.push({
            id: album.id,
            nome: album.nome,
            artista: album.artista,
            imagem: album.imagem,
            mediaAvaliacao,
            dataAvaliacao: album.data_avaliacao?.toDate() || new Date(),
            usuario: {
              id: doc.id,
              nome: dadosUsuario.nome || "Usuário anônimo",
              foto: dadosUsuario.foto_perfil || null,
            },
          });
        }
      });
    });

    // Ordenar por data de avaliação (mais recentes primeiro)
    todasAvaliacoes.sort((a, b) => b.dataAvaliacao - a.dataAvaliacao);

    // Limitar ao número especificado
    return todasAvaliacoes.slice(0, limite);
  } catch (error) {
    console.error("Erro ao obter avaliações globais:", error);
    return [];
  }
};

/**
 * Faz upload de um arquivo para o Firebase Storage
 * @param {File} file - Arquivo a ser enviado
 * @param {string} path - Caminho onde o arquivo será salvo
 * @returns {Promise<string>} URL do arquivo enviado
 */
export const uploadFile = async (file, path) => {
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Erro ao fazer upload do arquivo:", error);
    throw error;
  }
};

/**
 * Atualiza o perfil do usuário
 * @param {Object} user - Objeto do usuário do Firebase
 * @param {Object} updates - Objeto com as atualizações a serem feitas
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (user, updates) => {
  try {
    // Atualizar o perfil do usuário no Firebase Auth
    await updateProfile(user, updates);

    // Se a atualização incluir photoURL, também atualize no Firestore
    if (updates.photoURL) {
      const userRef = doc(db, "usuarios", user.uid);
      await updateDoc(userRef, {
        foto_perfil: updates.photoURL,
      });
    }
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    throw error;
  }
};

export { auth, db, storage };
