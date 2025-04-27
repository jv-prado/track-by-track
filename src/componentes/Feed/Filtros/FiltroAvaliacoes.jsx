import { FaSearch, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

/**
 * Componente para filtrar e ordenar as avaliações de álbuns
 *
 * @param {Object} props - Propriedades do componente
 * @param {string} props.termoPesquisa - Termo atual de pesquisa
 * @param {Function} props.setTermoPesquisa - Função para atualizar o termo de pesquisa
 * @param {Object} props.filtroNota - Estado atual do filtro de nota (min, max)
 * @param {Function} props.setFiltroNota - Função para atualizar o filtro de nota
 * @param {string} props.ordenacao - Estado atual da ordenação
 * @param {Function} props.alternarOrdenacao - Função para alternar entre os estados de ordenação
 * @returns {JSX.Element} Componente de filtros
 */
const FiltroAvaliacoes = ({
  termoPesquisa,
  setTermoPesquisa,
  filtroNota,
  setFiltroNota,
  ordenacao,
  alternarOrdenacao,
}) => {
  return (
    <div className="bg-cinza-escuro rounded-xl p-3 md:p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Campo de pesquisa */}
        <div className="flex flex-col w-full sm:w-auto">
          <label className="text-gray-400 mb-2 text-sm">Pesquisar:</label>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Nome do álbum ou artista"
              value={termoPesquisa}
              onChange={(e) => setTermoPesquisa(e.target.value)}
              className="bg-cinza text-white rounded-md pl-9 pr-3 py-2 w-full text-sm cursor-text"
            />
            <FaSearch className="absolute left-3 top-2.5 text-gray-400" />
          </div>
        </div>

        {/* Filtro por nota */}
        <div className="flex flex-col w-full sm:w-auto">
          <label className="text-gray-400 mb-2 text-sm">
            Filtrar por nota:
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={filtroNota.min}
              onChange={(e) =>
                setFiltroNota({
                  ...filtroNota,
                  min: parseFloat(e.target.value),
                })
              }
              className="bg-cinza text-white rounded-md px-2 py-1 w-16 text-center text-sm cursor-text"
            />
            <span className="text-gray-400">a</span>
            <input
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={filtroNota.max}
              onChange={(e) =>
                setFiltroNota({
                  ...filtroNota,
                  max: parseFloat(e.target.value),
                })
              }
              className="bg-cinza text-white rounded-md px-2 py-1 w-16 text-center text-sm cursor-text"
            />
          </div>
        </div>

        {/* Ordenação por nota */}
        <div className="flex flex-col w-full sm:w-auto">
          <label className="text-gray-400 mb-2 text-sm">
            Ordenar por nota:
          </label>
          <button
            onClick={alternarOrdenacao}
            className="bg-cinza hover:bg-verde-destaque hover:text-cinza-escuro transition-colors px-4 py-2 rounded-md flex items-center gap-2 text-sm cursor-pointer"
          >
            <span>Nota</span>
            {ordenacao === "padrao" && <FaSort />}
            {ordenacao === "crescente" && <FaSortUp />}
            {ordenacao === "decrescente" && <FaSortDown />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltroAvaliacoes;
