export default function StatusContaUsuario({ t, handleLogout }) {
  return (
    <div className="mt-4 pt-2 border-t border-gray-700">
      {/* Status da conta */}
      <div className="text-xs text-verde-claro mb-2 flex items-center">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        {t("userProfile.ratingsSavedToAccount")}
      </div>
      {/* Botão de logout */}
      <button
        onClick={handleLogout}
        className="text-xs py-1 px-2 bg-cinza-medio text-white rounded w-full hover:bg-cinza-claro/20 cursor-pointer"
      >
        {t("userProfile.logout")}
      </button>
    </div>
  );
}
