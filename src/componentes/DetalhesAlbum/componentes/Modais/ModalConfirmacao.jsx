import React from "react";

const ModalConfirmacao = ({ mostrar, tipo, onCancelar, onConfirmar, t }) => {
  if (!mostrar) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[2000] px-4">
      <div className="bg-cinza-escuro rounded-xl p-5 max-w-md w-full">
        <h3 className="text-lg font-bold text-verde-destaque mb-3">
          {tipo === "resetar"
            ? t("albumDetails.resetConfirmTitle")
            : t("albumDetails.removeConfirmTitle")}
        </h3>
        <p className="text-gray-300 mb-5">
          {tipo === "resetar"
            ? t("albumDetails.resetConfirmMessage")
            : t("albumDetails.removeConfirmMessage")}
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancelar}
            className="bg-gray-700 py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
          >
            {t("albumDetails.cancel")}
          </button>
          <button
            onClick={onConfirmar}
            className={`py-2 px-4 rounded-lg transition-colors cursor-pointer ${
              tipo === "resetar"
                ? "bg-yellow-700 hover:bg-yellow-600"
                : "bg-red-700 hover:bg-red-600"
            }`}
          >
            {t("albumDetails.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmacao;
