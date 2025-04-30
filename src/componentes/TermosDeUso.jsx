import React from "react";

export default function TermosDeUso() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">
          Termos de Uso
        </h1>
        <p className="text-gray-200 mb-2">
          Ao utilizar esta plataforma, você concorda em respeitar as regras e
          políticas estabelecidas, incluindo o uso responsável das
          funcionalidades e o fornecimento de informações verdadeiras no
          cadastro.
        </p>
        <p className="text-gray-200 mb-2">
          Não é permitido utilizar a plataforma para fins ilícitos, ofensivos ou
          que violem direitos de terceiros.
        </p>
        <p className="text-gray-200 mb-2">
          O descumprimento dos termos pode resultar em suspensão ou exclusão da
          conta.
        </p>
        <p className="text-gray-200 mb-2">
          Estes termos podem ser atualizados periodicamente. Recomendamos que
          você os revise regularmente.
        </p>
      </div>
    </div>
  );
}
