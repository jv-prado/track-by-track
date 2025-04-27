import { useState, useEffect } from "react";
import { FaSearch } from "react-icons/fa";

interface BarraDePesquisaProps {
  onSearch: (termo: string) => void;
  activeView: string;
}

export default function BarraDePesquisa({
  onSearch,
  activeView,
}: BarraDePesquisaProps) {
  const [termoPesquisa, setTermoPesquisa] = useState("");

  // Limpar o termo de pesquisa apenas quando a visualização ativa mudar
  useEffect(() => {
    setTermoPesquisa("");
    onSearch("");
  }, [activeView]);

  const handleSearch = (e) => {
    setTermoPesquisa(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <div className="relative flex flex-col gap-2 md:gap-4 w-full">
      <FaSearch className="absolute left-3 top-[13px] md:top-4.5 text-verde-destaque text-sm md:text-base" />

      <input
        className="pl-9 md:pl-10 bg-cinza-escuro h-[40px] md:h-[50px] hover:bg-cinza transition-colors rounded-xl text-sm md:text-base w-full"
        type="text"
        placeholder="Digite o que você procura"
        value={termoPesquisa}
        onChange={handleSearch}
      />
    </div>
  );
}
