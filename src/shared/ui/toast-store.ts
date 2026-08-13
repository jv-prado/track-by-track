export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

// Pub/sub simples fora do React — evita puxar Context/Zustand só pra isso.
// `toast.success()/error()` pode ser chamado de qualquer lugar (dentro ou fora de componente).
let toasts: ToastItem[] = [];
let nextId = 0;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot() {
  return toasts;
}

export function dismissToast(id: number) {
  toasts = toasts.filter((item) => item.id !== id);
  emit();
}

function push(variant: ToastVariant, message: string) {
  const id = nextId++;
  toasts = [...toasts, { id, variant, message }];
  emit();
  window.setTimeout(() => dismissToast(id), 4000);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};
