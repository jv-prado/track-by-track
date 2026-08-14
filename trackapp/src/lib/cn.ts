import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// Porta 1:1 de src/shared/lib/cn.ts (web) — mesma lógica, className é string
// tanto faz o renderer (NativeWind processa igual).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
