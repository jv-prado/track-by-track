import AvatarUsuario from "./AvatarUsuario";
import EditarNomeUsuario from "./EditarNomeUsuario";
import ModalCentral from "./Modais/ModalCentral";
import { useEffect, useState } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";

export default function InfoUsuario({
  fotoPerfil,
  onTrocarFoto,
  fileInputRef,
  handleFileChange,
  usuarioFirebase,
  t,
  editandoNome,
  setEditandoNome,
  novoNome,
  setNovoNome,
  novoSobrenome,
  setNovoSobrenome,
  erroNome,
  salvandoNome,
  handleSalvarNome,
  emailSpotify,
}) {
  const [nomeFirestore, setNomeFirestore] = useState("");

  useEffect(() => {
    async function fetchNome() {
      if (usuarioFirebase?.uid) {
        const db = getFirestore();
        const userRef = doc(db, "usuarios", usuarioFirebase.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          setNomeFirestore(userDoc.data().nome || "");
        } else {
          setNomeFirestore("");
        }
      }
    }
    fetchNome();
  }, [usuarioFirebase, editandoNome, salvandoNome]);

  return (
    <>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <AvatarUsuario
            fotoPerfil={fotoPerfil}
            onTrocarFoto={onTrocarFoto}
            fileInputRef={fileInputRef}
            handleFileChange={handleFileChange}
            usuarioFirebase={usuarioFirebase}
            t={t}
          />
          <p className="font-bold text-sm truncate">
            {nomeFirestore || t("userProfile.user")}
          </p>
        </div>
        <button
          className="text-xs text-verde-destaque underline hover:text-verde-pastel transition-colors w-fit"
          onClick={() => setEditandoNome(true)}
          type="button"
        >
          {t("userProfile.editName") || "Editar nome"}
        </button>
        <p className="text-xs text-gray-400 truncate">{emailSpotify || ""}</p>
      </div>
      {editandoNome && (
        <ModalCentral onClose={() => setEditandoNome(false)}>
          <EditarNomeUsuario
            editandoNome={editandoNome}
            setEditandoNome={setEditandoNome}
            novoNome={novoNome}
            setNovoNome={setNovoNome}
            novoSobrenome={novoSobrenome}
            setNovoSobrenome={setNovoSobrenome}
            erroNome={erroNome}
            salvandoNome={salvandoNome}
            handleSalvarNome={handleSalvarNome}
            displayName={nomeFirestore}
            t={t}
          />
        </ModalCentral>
      )}
    </>
  );
}
