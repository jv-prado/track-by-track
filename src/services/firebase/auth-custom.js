/**
 * Serviço para autenticação personalizada no Firebase
 *
 * Este arquivo contém funções para autenticar usuários do Spotify no Firebase Auth
 * usando tokens personalizados (custom tokens).
 */

import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import {
  doc,
  getFirestore,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// Função para autenticar um usuário do Spotify no Firebase
export const autenticarComSpotify = async (spotifyUserId) => {
  try {
    if (!spotifyUserId) {
      throw new Error("ID do usuário Spotify é obrigatório");
    }

    // Rejeitar explicitamente o ID genérico spotify_user
    if (spotifyUserId === "spotify_user") {
      throw new Error(
        "ID do Spotify inválido para autenticação: 'spotify_user'"
      );
    }

    try {
      // Como estamos enfrentando problemas com a Cloud Function e autenticação anônima,
      // vamos usar autenticação por email/senha
      const auth = getAuth();
      const db = getFirestore();

      // Primeiro verificar se existe um perfil do Spotify armazenado
      const perfilCache = JSON.parse(
        localStorage.getItem("spotify_user_profile") || "{}"
      );

      // Criar um email padronizado baseado no ID do Spotify
      const email = `spotify_${spotifyUserId}@trackbytrack.app`;
      // Gerar uma senha única baseada no ID do Spotify
      const password = `Sp0t1fy${spotifyUserId.substring(0, 8)}${Date.now()
        .toString()
        .substring(0, 4)}`;

      // Tenta logar com o email/senha
      // Se falhar, cria um novo usuário
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );
      } catch (loginError) {
        // Se o login falhar, criar um novo usuário
        userCredential = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
      }

      const firebaseUser = userCredential.user;

      // Atualizar o perfil com informações do Spotify
      await updateProfile(firebaseUser, {
        displayName: perfilCache.name || `Spotify User ${spotifyUserId}`,
        photoURL: perfilCache.imageUrl || null,
      });

      // Salvar a senha para futuros logins
      localStorage.setItem(
        `spotify_auth_${spotifyUserId}`,
        JSON.stringify({
          email,
          password,
        })
      );

      // Criar/atualizar documento no Firestore para registrar a relação com Spotify
      const userDocRef = doc(db, "usuarios", firebaseUser.uid);

      // Dados para o documento
      const userData = {
        uid: firebaseUser.uid,
        provider: "spotify",
        spotifyId: spotifyUserId,
        displayName: perfilCache.name || `Spotify User ${spotifyUserId}`,
        email: perfilCache.email || email,
        photoURL: perfilCache.imageUrl || null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        spotify_account: {
          id: spotifyUserId,
          display_name: perfilCache.name,
          email: perfilCache.email,
          profile_url: perfilCache.imageUrl,
        },
      };

      await setDoc(userDocRef, userData, { merge: true });

      // Também registrar na coleção usuariosSpotify para manter compatibilidade
      try {
        const spotifyUserRef = doc(db, "usuariosSpotify", spotifyUserId);
        await setDoc(
          spotifyUserRef,
          {
            uid: firebaseUser.uid,
            nome: perfilCache.name || `Spotify User ${spotifyUserId}`,
            email: perfilCache.email || email,
            foto_perfil: perfilCache.imageUrl,
            data_cadastro: serverTimestamp(),
            ultima_atualizacao: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (spotifyCollectionError) {
        // Não interromper o fluxo por causa desse erro
      }

      // Salvar vinculação para uso futuro
      localStorage.setItem("spotify_firebase_uid", firebaseUser.uid);
      localStorage.setItem(
        "spotify_auth_method",
        "email_password_with_spotify_data"
      );

      return {
        success: true,
        user: firebaseUser,
        isNewUser: userCredential.operationType === "signIn" ? false : true,
        message: "Autenticação alternativa com Spotify realizada com sucesso",
      };
    } catch (authError) {
      return {
        success: false,
        error:
          authError.message || "Erro desconhecido na autenticação alternativa",
        message: "Falha na autenticação com Spotify (método alternativo)",
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message || "Erro desconhecido na autenticação",
      message: "Falha na autenticação com Spotify",
    };
  }
};
