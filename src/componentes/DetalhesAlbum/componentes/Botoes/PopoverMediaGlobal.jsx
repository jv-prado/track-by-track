import React from "react";

const PopoverMediaGlobal = ({
  mostrar,
  popoverRef,
  t,
  avaliacoesUsuariosAlbum = [],
}) => {
  if (!mostrar) return null;
  return (
    <div
      ref={popoverRef}
      className="z-50 fixed left-1/2 top-auto bottom-auto mt-10 -translate-x-1/2 lg:absolute lg:left-0 lg:right-auto lg:top-full lg:mt-2 lg:translate-x-0 lg:translate-y-0"
    >
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-3 min-w-[220px] max-w-[90vw]">
        <span className="text-xs text-verde-destaque font-bold mb-2 block">
          {t("albumDetails.globalAverageUsers")}
        </span>
        <div className="flex flex-col gap-1 max-h-[250px] overflow-y-auto">
          {avaliacoesUsuariosAlbum.length > 0 ? (
            <>
              {avaliacoesUsuariosAlbum.slice(0, 10).map((av) => (
                <span
                  key={av.usuario.id}
                  className="flex items-center gap-2 text-xs text-gray-200"
                >
                  {av.usuario.foto ? (
                    <img
                      src={av.usuario.foto}
                      alt={av.usuario.nome}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-gray-700 text-gray-200 flex items-center justify-center font-bold text-xs">
                      {av.usuario.nome?.[0]?.toUpperCase() || "?"}
                    </span>
                  )}
                  <span className="font-bold">{av.usuario.nome}</span>
                  <span className="ml-auto text-verde-destaque font-bold">
                    {Number.isInteger(av.mediaAvaliacao)
                      ? av.mediaAvaliacao
                      : av.mediaAvaliacao.toFixed(1)}
                  </span>
                </span>
              ))}
              {avaliacoesUsuariosAlbum.length > 10 && (
                <span className="text-xs text-gray-400 italic mt-2 block text-center">
                  {t("albumDetails.showingRecentRatings", {
                    shown: 10,
                    total: avaliacoesUsuariosAlbum.length,
                  })}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400 italic">
              {t("albumDetails.notRatedYet")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default PopoverMediaGlobal;
