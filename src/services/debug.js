/**
 * Funções de depuração para diagnosticar problemas no aplicativo
 */

import { getAuth } from "firebase/auth";
import { logInfoAutenticacao } from "./firebase/auth-helper";

// Flag para ativar ou desativar logs detalhados
let debugEnabled = false;

/**
 * Ativa ou desativa o modo de depuração
 * @param {boolean} enabled - Se true, ativa o modo de depuração
 */
export const setDebugMode = (enabled) => {
  debugEnabled = !!enabled;

  if (debugEnabled) {
    console.log("Modo de depuração ATIVADO");
    window.__DEBUG_AUTH__ = {
      getAuthInfo: logInfoAutenticacao,
      getAuthState: () => getAuth().currentUser,
    };
  } else {
    console.log("Modo de depuração DESATIVADO");
    delete window.__DEBUG_AUTH__;
  }
};

/**
 * Logs condicionais que só aparecem quando o debug está ativado
 * @param {string} context - Contexto do log (ex: "Auth", "Login")
 * @param {string} message - Mensagem a ser registrada
 * @param {any} data - Dados adicionais para o log
 */
export const debugLog = (context, message, data) => {
  if (!debugEnabled) return;

  console.log(`[DEBUG:${context}] ${message}`, data !== undefined ? data : "");
};

// Ativar o modo de depuração automaticamente em ambientes de desenvolvimento
if (process.env.NODE_ENV === "development") {
  setDebugMode(true);
}

/**
 * Diagnostica problemas com a autenticação
 * Esta função é chamada automaticamente em caso de falha na autenticação
 */
export const diagnosticarProblemasAutenticacao = async () => {
  if (!debugEnabled) return;

  console.group("DIAGNÓSTICO DE AUTENTICAÇÃO");

  // 1. Verificar o estado atual da autenticação
  const auth = getAuth();
  const currentUser = auth.currentUser;
  console.log(
    "1. Estado atual do auth.currentUser:",
    currentUser
      ? `${currentUser.email} (${currentUser.uid})`
      : "Não autenticado"
  );

  // 2. Verificar através do helper
  const userFromHelper = await logInfoAutenticacao();
  console.log(
    "2. Estado do auth via helper:",
    userFromHelper
      ? `${userFromHelper.email} (${userFromHelper.uid})`
      : "Não autenticado"
  );

  // 3. Verificar localStorage e sessionStorage para detectar problemas relacionados
  const localStorageItems = Object.keys(localStorage).filter(
    (key) =>
      key.includes("firebase") ||
      key.includes("auth") ||
      key.includes("user") ||
      key.includes("token")
  );
  console.log(
    "3. Itens relevantes no localStorage:",
    localStorageItems.length ? localStorageItems : "Nenhum"
  );

  const sessionStorageItems = Object.keys(sessionStorage).filter(
    (key) =>
      key.includes("firebase") ||
      key.includes("auth") ||
      key.includes("user") ||
      key.includes("token")
  );
  console.log(
    "4. Itens relevantes no sessionStorage:",
    sessionStorageItems.length ? sessionStorageItems : "Nenhum"
  );

  // 5. Sugestões de resolução
  console.log("5. Sugestões para resolver problemas de autenticação:");
  console.log(
    "   - Verificar se o domínio está corretamente configurado no console do Firebase"
  );
  console.log(
    "   - Certificar-se de que não há cookies bloqueados pelo navegador"
  );
  console.log(
    "   - Testar em uma janela anônima para verificar se há problemas com extensões"
  );
  console.log(
    "   - Limpar o cache e os dados do navegador relacionados ao site"
  );

  console.groupEnd();
};

// Exportar função de diagnóstico para uso global em modo de desenvolvimento
if (process.env.NODE_ENV === "development") {
  window.__diagnoseAuth = diagnosticarProblemasAutenticacao;
}
