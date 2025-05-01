import React, { useState, useEffect } from "react";
import { IoSearchOutline } from "react-icons/io5";
import { MdInfoOutline } from "react-icons/md";
import { useTranslation } from "react-i18next";

/**
 * Componente de barra de pesquisa
 *
 * @param {Object} props - Propriedades do componente
 * @param {Function} props.onSearch - Função chamada ao realizar pesquisa
 * @param {string} props.activeView - Visualização atual ativa
 * @param {string} props.termoPesquisa - Termo de pesquisa atual
 * @returns {JSX.Element} Componente de barra de pesquisa
 */
const BarraDePesquisa = ({ onSearch, activeView, termoPesquisa = "" }) => {
  const [termo, setTermo] = useState(termoPesquisa);
  const { t } = useTranslation();

  // Atualizar termo quando a visualização ativa mudar
  useEffect(() => {
    setTermo(termoPesquisa);
  }, [termoPesquisa, activeView]);

  // Função para lidar com a mudança no valor do input
  const handleChange = (event) => {
    const novoTermo = event.target.value;
    setTermo(novoTermo);
    onSearch(novoTermo);
  };

  // Função para lidar com o envio do formulário
  const handleSubmit = (event) => {
    event.preventDefault();
    onSearch(termo);
  };

  return activeView === "feed" ? (
    <div className="w-full flex items-center justify-center bg-cinza-escuro/80 rounded-xl py-3 px-4 mb-2">
      <MdInfoOutline className="text-verde-destaque text-2xl mr-3 animate-pulse-slow" />
      <span className="text-gray-300 text-base md:text-lg text-center font-medium">
        {t("app.suggestion", "Busque por álbuns ou artistas no menu")}
      </span>
    </div>
  ) : (
    <form onSubmit={handleSubmit} className="relative w-full flex items-center">
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cinza">
        <IoSearchOutline className="text-xl text-gray-400" />
      </div>
      <input
        type="text"
        placeholder={t("app.search")}
        value={termo}
        onChange={handleChange}
        className="w-full pl-12 pr-4 py-3 bg-cinza-escuro text-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-verde-destaque transition-all placeholder-gray-400"
      />
    </form>
  );
};

export default BarraDePesquisa;
