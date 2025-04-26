/**
 * Serviço para sincronizar dados entre diferentes abas do navegador
 */

/**
 * Sincroniza dados do usuário com o serviço de banco de dados
 * @param {string} userId - ID do usuário
 * @param {Object} data - Dados a serem sincronizados
 */
export const sincronizarAvaliacoes = () => {
  try {
    // Obtém o ID do usuário do localStorage
    const dadosUsuario = localStorage.getItem("spotify_user");
    if (!dadosUsuario) return;

    const user = JSON.parse(dadosUsuario);
    if (!user.id) return;

    // Obtém as avaliações e faixas do localStorage
    const avaliacoesFaixas = localStorage.getItem("avaliacoesFaixas") || "{}";
    const mapaFaixasAlbuns = localStorage.getItem("mapaFaixasAlbuns") || "{}";

    // Cria um registro de sincronização
    const sincronizacao = {
      userId: user.id,
      timestamp: Date.now(),
      avaliacoesFaixas: JSON.parse(avaliacoesFaixas),
      mapaFaixasAlbuns: JSON.parse(mapaFaixasAlbuns),
    };

    // Salva no localStorage com um formato que permite identificar
    localStorage.setItem(`sync_${user.id}`, JSON.stringify(sincronizacao));

    // Dispara um evento para notificar outras abas
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: `sync_${user.id}`,
        newValue: JSON.stringify(sincronizacao),
      })
    );

    console.log("Avaliações sincronizadas com sucesso!");
  } catch (error) {
    console.error("Erro ao sincronizar avaliações:", error);
  }
};

/**
 * Configura um listener para sincronizar avaliações quando houver mudanças
 */
export const configurarSincronizacao = () => {
  // Função que será chamada quando as avaliações forem alteradas
  const sincronizarAoAlterar = () => {
    sincronizarAvaliacoes();
  };

  // Adiciona eventos para monitorar alterações no localStorage
  window.addEventListener("avaliacoes_alteradas", sincronizarAoAlterar);

  // Retorna função para remover os listeners
  return () => {
    window.removeEventListener("avaliacoes_alteradas", sincronizarAoAlterar);
  };
};

/**
 * Evento personalizado para notificar que as avaliações foram alteradas
 */
export const notificarAvaliacoesAlteradas = () => {
  window.dispatchEvent(new Event("avaliacoes_alteradas"));
};

/**
 * Carrega os dados de avaliações sincronizados do localStorage
 */
export const carregarAvaliacoesSincronizadas = () => {
  try {
    // Obtém o ID do usuário do localStorage
    const dadosUsuario = localStorage.getItem("spotify_user");
    if (!dadosUsuario) return false;

    const user = JSON.parse(dadosUsuario);
    if (!user.id) return false;

    // Verifica se existem dados sincronizados
    const dadosSincronizados = localStorage.getItem(`sync_${user.id}`);
    if (!dadosSincronizados) return false;

    // Parse dos dados sincronizados
    const sincronizacao = JSON.parse(dadosSincronizados);

    // Verifica se os dados são do usuário atual
    if (sincronizacao.userId !== user.id) return false;

    // Verifica se os dados são mais recentes
    const timestampLocal = localStorage.getItem(
      "ultima_atualizacao_avaliacoes"
    );
    if (timestampLocal && parseInt(timestampLocal) >= sincronizacao.timestamp) {
      return false;
    }

    // Atualiza os dados locais
    localStorage.setItem(
      "avaliacoesFaixas",
      JSON.stringify(sincronizacao.avaliacoesFaixas)
    );
    localStorage.setItem(
      "mapaFaixasAlbuns",
      JSON.stringify(sincronizacao.mapaFaixasAlbuns)
    );
    localStorage.setItem(
      "ultima_atualizacao_avaliacoes",
      sincronizacao.timestamp.toString()
    );

    console.log("Avaliações atualizadas a partir da sincronização!");
    return true;
  } catch (error) {
    console.error("Erro ao carregar avaliações sincronizadas:", error);
    return false;
  }
};
