import React, { useState, useEffect, useRef } from "react";
import { IoSearchOutline } from "react-icons/io5";
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
  const debounceTimeout = useRef(null);

  // Atualizar termo quando a visualização ativa mudar
  useEffect(() => {
    setTermo(termoPesquisa);
  }, [termoPesquisa, activeView]);

  // Função para lidar com a mudança no valor do input
  const handleChange = (event) => {
    const novoTermo = event.target.value;
    setTermo(novoTermo);
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      onSearch(novoTermo);
    }, 400);
  };

  // Função para lidar com o envio do formulário
  const handleSubmit = (event) => {
    event.preventDefault();
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    onSearch(termo);
  };

  return activeView === "feed" ? null : (
    <form onSubmit={handleSubmit} className="relative w-full flex items-center">
      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-cinza">
        <IoSearchOutline className="text-xl text-gray-400" />
      </div>
      <input
        id="barra-pesquisa-input"
        name="barra-pesquisa"
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
