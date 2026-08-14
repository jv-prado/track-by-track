export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: number;
  variant: ToastVariant;
  message: string;
}

// Porta 1:1 de src/shared/ui/toast-store.ts (web) — mesmo pub/sub fora do
// React, só troca `window.setTimeout` (não existe em RN) por `setTimeout` global.
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
  setTimeout(() => dismissToast(id), 4000);
}

export const toast = {
  success: (message: string) => push("success", message),
  error: (message: string) => push("error", message),
};
