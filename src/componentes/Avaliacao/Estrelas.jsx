import { FaStar, FaRegStar, FaStarHalfAlt } from "react-icons/fa";

/**
 * Componente para exibir e permitir avaliação por estrelas
 * @param {Object} props - Propriedades do componente
 * @param {number} props.avaliacao - Número de estrelas preenchidas (0-5, permite valores com .5)
 * @param {Function} props.onChange - Função chamada quando o usuário muda a avaliação
 * @param {boolean} props.somenteLeitura - Se verdadeiro, desabilita a interação
 * @param {string} props.tamanho - Tamanho das estrelas (pequeno, medio, grande)
 * @returns {JSX.Element} Componente de estrelas para avaliação
 */
const Estrelas = ({
  avaliacao = 0,
  onChange,
  somenteLeitura = false,
  tamanho = "medio",
}) => {
  // Mapear tamanho para classes CSS responsivas
  const tamanhosEstrela = {
    pequeno: "text-xs md:text-sm",
    medio: "text-sm md:text-base",
    grande: "text-base md:text-lg",
  };

  const tamanhoClasse = tamanhosEstrela[tamanho] || tamanhosEstrela.medio;

  // Função para determinar que tipo de estrela mostrar
  const renderEstrela = (posicao) => {
    const valorInteiro = Math.floor(avaliacao);
    const temMeiaEstrela = avaliacao % 1 !== 0;

    if (posicao <= valorInteiro) {
      // Estrela cheia
      return <FaStar className={`text-yellow-400 ${tamanhoClasse}`} />;
    } else if (posicao === valorInteiro + 1 && temMeiaEstrela) {
      // Meia estrela
      return <FaStarHalfAlt className={`text-yellow-400 ${tamanhoClasse}`} />;
    } else {
      // Estrela vazia
      return <FaRegStar className={`text-yellow-400 ${tamanhoClasse}`} />;
    }
  };

  // Função para ciclar entre os estados de uma estrela
  const handleClick = (estrela) => {
    if (somenteLeitura || !onChange) return;

    console.log(
      `Clicando na estrela ${estrela}, avaliação atual: ${avaliacao}`
    );

    // Se for a primeira estrela e já estiver com valor 0.5, zerar
    if (estrela === 1 && avaliacao === 0.5) {
      onChange(0);
      return;
    }

    // Determinar o estado atual da estrela clicada
    let novaAvaliacao;

    // Verificar se a estrela atual está vazia
    if (estrela > Math.ceil(avaliacao)) {
      // Estrela vazia -> Cheia
      novaAvaliacao = estrela;
    }
    // Verificar se a estrela atual está cheia
    else if (Math.floor(avaliacao) >= estrela) {
      // Estrela cheia -> Meia

      // Se a estrela atual for a última cheia, transformar em meia
      if (Math.floor(avaliacao) === estrela) {
        novaAvaliacao = estrela - 0.5;
      }
      // Se for uma estrela à esquerda da última, manter a avaliação até esta estrela
      else {
        novaAvaliacao = estrela;
      }
    }
    // Se a estrela estiver meia (é a estrela após o valor inteiro)
    else if (Math.ceil(avaliacao) === estrela && avaliacao % 1 !== 0) {
      // Meia -> Vazia (reduzir para a estrela anterior)
      novaAvaliacao = Math.floor(avaliacao);
    }

    console.log(`Nova avaliação: ${novaAvaliacao}`);
    onChange(novaAvaliacao);
  };

  return (
    <div className="flex items-center">
      {[1, 2, 3, 4, 5].map((estrela) => (
        <div
          key={estrela}
          className={`${somenteLeitura ? "" : "cursor-pointer"} px-0.5`}
          onClick={() => handleClick(estrela)}
        >
          {renderEstrela(estrela)}
        </div>
      ))}
    </div>
  );
};

export default Estrelas;
