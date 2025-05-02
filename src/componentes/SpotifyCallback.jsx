import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { trocarCodePorToken } from "../services/spotify";

// ID único para esta instância do componente
const CALLBACK_INSTANCE_ID = Date.now().toString();

const SpotifyCallback = () => {
  const [status, setStatus] = useState("Processando autenticação...");
  const [erro, setErro] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  // Usar useRef para garantir que processarCallback seja executado apenas uma vez
  const processadoRef = useRef(false);

  useEffect(() => {
    // Função para salvar estado de processamento
    const marcarComoProcessado = (code) => {
      // Registrar no sessionStorage
      sessionStorage.setItem("spotify_callback_processed", code);
      // Marcar no ref local
      processadoRef.current = true;
      // Registrar timestamp para debug
      sessionStorage.setItem(
        "spotify_callback_timestamp",
        Date.now().toString()
      );
      // Registrar instância
      sessionStorage.setItem("spotify_callback_instance", CALLBACK_INSTANCE_ID);
    };

    // Verificar se já foi processado por esta ou outra instância
    const verificarProcessamento = (code) => {
      const processado = sessionStorage.getItem("spotify_callback_processed");
      if (processado === code) {
        console.log(
          `Callback com código ${code.substring(
            0,
            10
          )}... já foi processado anteriormente.`
        );
        return true;
      }
      return processadoRef.current;
    };

    const processarCallback = async () => {
      try {
        console.log(
          `[Instância ${CALLBACK_INSTANCE_ID}] Iniciando processamento do callback`
        );

        // Extrair código e state da URL
        const urlParams = new URLSearchParams(location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const error = urlParams.get("error");

        if (!code) {
          console.log("Nenhum código encontrado na URL, ignorando.");
          return;
        }

        // Verificar se este código já foi processado
        if (verificarProcessamento(code)) {
          console.log("Este callback já foi processado, ignorando duplicatas.");
          return;
        }

        // Marcar como processado imediatamente
        marcarComoProcessado(code);

        console.log(
          `[Instância ${CALLBACK_INSTANCE_ID}] Processando código: ${code.substring(
            0,
            10
          )}...`
        );

        // Verificar se o code_verifier existe no localStorage
        const codeVerifier = localStorage.getItem("pkce_code_verifier");
        console.log("Code verifier encontrado:", codeVerifier ? "Sim" : "Não");
        if (codeVerifier) {
          console.log(
            "Code verifier (primeiros 10 caracteres):",
            codeVerifier.substring(0, 10) + "..."
          );
        } else {
          console.error("Code verifier não encontrado no localStorage");
          setErro("Erro de autenticação: code_verifier não encontrado.");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        console.log("Parâmetros URL:", {
          code: code ? code.substring(0, 10) + "..." : "Não encontrado",
          state: state || "Não encontrado",
          error: error || "Nenhum",
        });

        // Verificar se houve erro na autorização
        if (error) {
          console.error(`Spotify retornou erro: ${error}`);
          setErro(`Erro na autenticação: ${error}`);
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Verificar se state está faltando
        if (!state) {
          console.error("Parâmetro state está faltando");
          setErro("Parâmetro de autenticação state ausente.");
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Verificar se o state corresponde ao armazenado
        const savedState = localStorage.getItem("spotify_auth_state");
        console.log(
          `Verificando state: recebido=${state}, salvo=${savedState}`
        );

        if (state !== savedState) {
          console.error("Estado de autenticação inválido");
          setErro(
            "Estado de autenticação inválido. Possível tentativa de CSRF."
          );
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        // Verificar o conteúdo do localStorage antes da troca
        console.log("Conteúdo do localStorage antes da troca de token:");
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key.includes("spotify") || key.includes("pkce")) {
            console.log(
              `${key}: ${localStorage.getItem(key).substring(0, 20)}...`
            );
          }
        }

        // Trocar o código por um token de acesso
        setStatus("Obtendo tokens de acesso...");
        console.log("Trocando code por token");
        const sucesso = await trocarCodePorToken(code);

        if (sucesso) {
          console.log("Token obtido com sucesso");

          // Definir "feed" como a view ativa
          localStorage.setItem("activeView", "feed");

          // Definir flag para indicar que acabamos de fazer login
          sessionStorage.setItem("login_redirect", "true");

          // Redirecionar para o feed
          setStatus("Autenticação bem-sucedida! Redirecionando...");

          // Pequeno atraso para feedback visual
          setTimeout(() => {
            navigate("/feed");
          }, 1000);
        } else {
          console.error("Não foi possível obter o token de acesso");
          setErro(
            "Não foi possível obter o token de acesso. O código pode ter expirado ou já foi utilizado."
          );
          setTimeout(() => navigate("/login"), 3000);
        }
      } catch (error) {
        console.error("Erro no processamento do callback:", error);
        setErro("Ocorreu um erro durante a autenticação. Tente novamente.");
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    processarCallback();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-md">
        <h2 className="text-2xl text-verde-claro font-bold mb-6 text-center">
          Autenticação Spotify
        </h2>

        {erro ? (
          <div className="bg-red-900/30 border border-red-500 text-red-200 p-3 rounded-lg mb-4">
            {erro}
            <p className="mt-2 text-sm">
              Redirecionando para a página de login...
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-white">{status}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotifyCallback;
