import { MdReportProblem } from "react-icons/md";

/**
 * Componente reutilizável para exibir mensagens de erro
 *
 * @param {Object} props - Propriedades do componente
 * @param {string} props.mensagem - Mensagem de erro a ser exibida
 * @param {Function} props.onTentarNovamente - Função para tentar a operação novamente
 * @param {string} props.titulo - Título da mensagem de erro (opcional)
 * @returns {JSX.Element} Componente de erro
 */
const ErroCarregamento = ({
  mensagem,
  onTentarNovamente,
  titulo = "Erro ao carregar",
}) => {
  // Verificar se é um erro de limite de requisições
  const isLimiteRequisicoes =
    mensagem &&
    (mensagem.includes("limite de requisições") ||
      mensagem.includes("429") ||
      mensagem.includes("Too Many Requests"));

  return (
    <div className="p-8 text-center">
      <div className="flex flex-col items-center justify-center">
        <MdReportProblem className="text-red-500 text-5xl mb-4" />
        <h2 className="text-2xl font-bold text-red-500 mb-4">
          {isLimiteRequisicoes ? "Limite de requisições atingido" : titulo}
        </h2>
        <p className="text-gray-400 mb-4">{mensagem}</p>

        {isLimiteRequisicoes && (
          <div className="bg-gray-800 p-4 rounded-lg max-w-md mb-6">
            <p className="text-gray-300 text-sm mb-2">
              O Spotify limita o número de requisições que podemos fazer à API
              deles. Você pode:
            </p>
            <ul className="text-gray-400 text-sm text-left list-disc pl-5">
              <li className="mb-1">
                Aguardar alguns minutos antes de tentar novamente
              </li>
              <li className="mb-1">
                Limitar a quantidade de álbuns avaliados de uma só vez
              </li>
              <li className="mb-1">
                Usar o modo de demonstração, se disponível
              </li>
            </ul>
          </div>
        )}

        {onTentarNovamente && (
          <button
            onClick={onTentarNovamente}
            className="bg-verde-destaque text-cinza-escuro px-6 py-2 rounded-md hover:bg-green-500 transition-colors cursor-pointer"
          >
            {isLimiteRequisicoes
              ? "Tentar em modo limitado"
              : "Tentar Novamente"}
          </button>
        )}
      </div>
    </div>
  );
};

export default ErroCarregamento;
