import { useTranslation } from "react-i18next";

/**
 * Componente reutilizável para exibir um indicador de carregamento
 *
 * @param {Object} props - Propriedades do componente
 * @param {string} props.tamanho - Tamanho do indicador (pequeno, medio, grande)
 * @param {string} props.className - Classes adicionais para o componente (opcional)
 * @param {string} props.mensagem - Mensagem opcional para exibir abaixo do indicador
 * @returns {JSX.Element} Componente de carregamento
 */
const Carregamento = ({
  tamanho = "medio",
  className = "",
  mensagem = "",
  chaveTraducao = "",
}) => {
  const { t } = useTranslation();

  // Mapear tamanho para classes CSS
  const tamanhos = {
    pequeno: "h-8 w-8 border-t-2 border-b-2",
    medio: "h-12 w-12 border-t-2 border-b-2",
    grande: "h-16 w-16 border-t-3 border-b-3",
  };

  const tamanhoClasse = tamanhos[tamanho] || tamanhos.medio;

  // Usar a chave de tradução se fornecida, ou a mensagem direta
  const mensagemExibida = chaveTraducao
    ? t(chaveTraducao)
    : mensagem || t("feedback.loading");

  return (
    <div
      className={`flex flex-col items-center justify-center p-10 ${className}`}
    >
      <div
        className={`animate-spin rounded-full ${tamanhoClasse} border-verde-destaque`}
      ></div>

      {mensagemExibida && (
        <p className="mt-4 text-gray-400 text-center">{mensagemExibida}</p>
      )}
    </div>
  );
};

export default Carregamento;
