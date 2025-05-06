import { FaCamera } from "react-icons/fa";

export default function AvatarUsuario({
  fotoPerfil,
  onTrocarFoto,
  fileInputRef,
  handleFileChange,
  usuarioFirebase,
  t,
}) {
  return (
    <div className="relative">
      <div className="w-10 h-10 rounded-full bg-verde-pastel flex items-center justify-center text-cinza-escuro font-bold overflow-hidden">
        {fotoPerfil ? (
          <img
            src={fotoPerfil}
            alt={t("userProfile.profilePicture")}
            className="w-full h-full object-cover"
          />
        ) : (
          usuarioFirebase?.displayName?.charAt(0).toUpperCase() || "U"
        )}
      </div>
      <button
        onClick={onTrocarFoto}
        className="absolute inset-0 w-full h-full rounded-full bg-black/50 flex items-center justify-center opacity-70 md:opacity-0 md:hover:opacity-70 active:opacity-70 transition-opacity"
        aria-label={t("userProfile.changePhoto") || "Trocar foto"}
      >
        <FaCamera className="text-white text-sm" />
      </button>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />
    </div>
  );
}
