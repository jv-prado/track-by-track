import React from "react";

export default function PoliticaDePrivacidade() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black p-4">
      <div className="bg-cinza-escuro p-6 rounded-xl w-full max-w-2xl">
        <h1 className="text-2xl text-white font-bold mb-4 text-center">
          Política de Privacidade
        </h1>
        <p className="text-gray-200 mb-2">
          Sua privacidade é importante para nós. Coletamos e utilizamos alguns
          dados pessoais de acordo com a legislação vigente, principalmente para
          garantir a melhor experiência possível na plataforma.
        </p>
        <p className="text-gray-200 mb-2">
          Ao criar uma conta, você concorda com a coleta e uso das informações
          fornecidas, como nome, e-mail e preferências musicais, para fins de
          autenticação, personalização e segurança.
        </p>
        <p className="text-gray-200 mb-2">
          Seus dados não serão compartilhados com terceiros sem seu
          consentimento, exceto quando exigido por lei.
        </p>
        <p className="text-gray-200 mb-2">
          Para mais informações ou dúvidas, entre em contato com nosso suporte.
        </p>
      </div>
    </div>
  );
}
