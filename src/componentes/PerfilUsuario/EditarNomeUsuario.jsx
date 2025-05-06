export default function EditarNomeUsuario({
  editandoNome,
  setEditandoNome,
  novoNome,
  setNovoNome,
  novoSobrenome,
  setNovoSobrenome,
  erroNome,
  salvandoNome,
  handleSalvarNome,
  displayName,
  t,
}) {
  return !editandoNome ? (
    <div className="flex flex-col items-center gap-2">
      <p className="font-bold text-sm truncate">
        {displayName || t("userProfile.user")}
      </p>
      <button
        className="text-xs text-verde-destaque underline hover:text-verde-pastel transition-colors"
        onClick={() => setEditandoNome(true)}
        type="button"
      >
        {t("userProfile.editName") || "Editar nome"}
      </button>
    </div>
  ) : (
    <form className="flex flex-col gap-1" onSubmit={handleSalvarNome}>
      <div className="flex  flex-col gap-3">
        <input
          type="text"
          className="rounded px-2 py-1 text-sm border border-gray-400 focus:outline-none focus:ring-2 focus:ring-verde-destaque"
          placeholder={t("userProfile.firstName") || "Nome"}
          value={novoNome}
          onChange={(e) => {
            const valor = e.target.value;
            setNovoNome(valor.charAt(0).toUpperCase() + valor.slice(1));
          }}
          minLength={2}
          required
          disabled={salvandoNome}
        />
        <input
          type="text"
          className="rounded px-2 py-1 text-sm border border-gray-400 focus:outline-none focus:ring-2 focus:ring-verde-destaque"
          placeholder={t("userProfile.lastName") || "Sobrenome"}
          value={novoSobrenome}
          onChange={(e) => {
            const valor = e.target.value;
            setNovoSobrenome(valor.charAt(0).toUpperCase() + valor.slice(1));
          }}
          minLength={2}
          required
          disabled={salvandoNome}
        />
        <div className="flex   justify-end gap-3">
          <button
            type="submit"
            className="ml-1 px-2 py-1 w-fit rounded bg-verde-destaque text-cinza-escuro text-xs font-bold hover:bg-verde-pastel transition-colors disabled:opacity-60"
            disabled={salvandoNome}
          >
            {salvandoNome
              ? t("userProfile.saving") || "Salvando..."
              : t("userProfile.save") || "Salvar"}
          </button>
          <button
            type="button"
            className="ml-1 w-fit px-2 py-1 rounded bg-gray-400 text-white text-xs font-bold hover:bg-gray-500 transition-colors"
            onClick={() => setEditandoNome(false)}
            disabled={salvandoNome}
          >
            {t("userProfile.cancel") || "Cancelar"}
          </button>
        </div>
      </div>
      {erroNome && <span className="text-xs text-red-500">{erroNome}</span>}
    </form>
  );
}
