import { createPortal } from "react-dom";

export default function ModalCentral({ children, onClose }) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60"
      onClick={onClose}
    >
      <div
        className="bg-cinza-escuro rounded-xl p-6 shadow-lg w-full max-w-md mx-2 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold"
            onClick={onClose}
            aria-label="Fechar"
            type="button"
          >
            ×
          </button>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
