import React from "react";
import BotaoMediaGlobal from "./Botoes/BotaoMediaGlobal";
import PopoverMediaGlobal from "./Botoes/PopoverMediaGlobal";

const MediaGlobalAlbum = ({
  mediaGlobal,
  setMostrarPopoverMedia,
  mostrarPopoverMedia,
  popoverMediaRef,
  t,
  obterCorNota,
  avaliacoesUsuariosAlbum,
}) => {
  return (
    <div className="relative inline-block">
      <BotaoMediaGlobal
        mediaGlobal={mediaGlobal}
        onClick={() => setMostrarPopoverMedia((v) => !v)}
        obterCorNota={obterCorNota}
        t={t}
      />
      <PopoverMediaGlobal
        mostrar={mostrarPopoverMedia}
        popoverRef={popoverMediaRef}
        t={t}
        avaliacoesUsuariosAlbum={avaliacoesUsuariosAlbum}
      />
    </div>
  );
};

export default MediaGlobalAlbum;
