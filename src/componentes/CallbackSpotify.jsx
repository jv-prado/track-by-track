import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { saveAuth, saveUserData } from "../services/auth";

const CallbackSpotify = () => {
  const navigate = useNavigate();
  const [erro, setErro] = useState(null);
  const [processando, setProcessando] = useState(true);

  useEffect(() => {
    // Função para processar a autenticação
    const processarAutenticacao = async () => {
      try {
        // Verificar se há erro na URL
        const urlParams = new URLSearchParams(window.location.search);
        const errorParam = urlParams.get("error");

        if (errorParam) {
          console.error("Erro retornado pelo Spotify:", errorParam);
          setErro(`Erro de autenticação: ${errorParam}`);
          setProcessando(false);
          return;
        }

        // Extrair o token de acesso do hash da URL
        const hash = window.location.hash
          .substring(1)
          .split("&")
          .reduce((initial, item) => {
            if (item) {
              const parts = item.split("=");
              initial[parts[0]] = decodeURIComponent(parts[1]);
            }
            return initial;
          }, {});

        if (hash.access_token) {
          // Salvar o token e sua expiração
          saveAuth(hash.access_token, hash.expires_in || 3600);

          try {
            // Obter informações do usuário
            const response = await fetch("https://api.spotify.com/v1/me", {
              headers: {
                Authorization: `Bearer ${hash.access_token}`,
              },
            });

            if (!response.ok) {
              const errorData = await response.json();
              console.error("Resposta de erro da API:", errorData);
              throw new Error(
                `Falha ao obter informações do usuário: ${response.status} ${response.statusText}`
              );
            }

            const userData = await response.json();

            // Salvar dados do usuário usando nosso serviço
            saveUserData(userData);

            // Redirecionar para a página principal
            navigate("/feed");
          } catch (error) {
            console.error("Erro ao obter informações do usuário:", error);
            setErro(`Falha ao obter informações do usuário: ${error.message}`);
            setProcessando(false);
          }
        } else {
          // Se não houver token, verificar se há mensagem de erro
          console.error("Nenhum token encontrado no hash da URL");
          setErro(
            "Não foi possível concluir a autenticação. Nenhum token recebido."
          );
          setProcessando(false);
        }
      } catch (error) {
        console.error("Erro durante o processamento do callback:", error);
        setErro(`Erro inesperado: ${error.message}`);
        setProcessando(false);
      }
    };

    processarAutenticacao();
  }, [navigate]);

  // Se houver erro, exibir mensagem
  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
        <div className="bg-cinza-escuro p-8 rounded-xl max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">
            Erro na autenticação
          </h1>
          <p className="text-gray-300 mb-6">{erro}</p>
          <button
            onClick={() => navigate("/login")}
            className="bg-verde-destaque text-white py-2 px-6 rounded-full hover:bg-opacity-90 transition-all"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // Tela de processamento
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          Processando seu login...
        </h1>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
      </div>
    </div>
  );
};

export default CallbackSpotify;
