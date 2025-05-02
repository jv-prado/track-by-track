/**
 * Helper para autenticação Firebase
 *
 * Este arquivo contém funções de ajuda para garantir que a autenticação
 * persistente do Firebase funcione corretamente em qualquer lugar da aplicação.
 */

import { getAuth, onAuthStateChanged } from "firebase/auth";

/**
 * Verifica o estado de autenticação atual e retorna uma promise com o usuário
 * Esta função é útil para componentes que precisam verificar a autenticação de forma assíncrona
 * @returns {Promise<firebase.User|null>} Promise que resolve para o usuário atual ou null
 */
export const verificarAutenticacao = () => {
  const auth = getAuth();

  return new Promise((resolve) => {
    // Usando o onAuthStateChanged para verificar o estado atual de autenticação
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe(); // Desinscrever imediatamente após receber o estado
      resolve(user);
    });
  });
};

/**
 * Verifica se o usuário está autenticado
 * @returns {boolean} True se o usuário estiver autenticado
 */
export const estaAutenticado = async () => {
  const usuario = await verificarAutenticacao();
  return !!usuario;
};

/**
 * Retorna informações sobre a autenticação atual
 * Para uso em depuração
 */
export const logInfoAutenticacao = async () => {
  const auth = getAuth();
  const usuario = auth.currentUser;
  // Logs removidos conforme solicitado
  return usuario;
};
