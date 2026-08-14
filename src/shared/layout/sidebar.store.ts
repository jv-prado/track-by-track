import { create } from "zustand";

const STORAGE_KEY = "sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface SidebarState {
  collapsed: boolean;
  toggle: () => void;
}

export const useSidebarStore = create<SidebarState>((set) => ({
  collapsed: readCollapsed(),
  toggle: () =>
    set((state) => {
      const collapsed = !state.collapsed;
      try {
        localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
      } catch {
        // private mode / quota
      }
      return { collapsed };
    }),
}));
