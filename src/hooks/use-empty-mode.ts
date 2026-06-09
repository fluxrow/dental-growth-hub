import { useSyncExternalStore } from "react";

const KEY = "dentalflux:empty-mode";
const listeners = new Set<() => void>();

function read(): boolean {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function useEmptyMode(): boolean {
  return useSyncExternalStore(subscribe, read, () => false);
}

export function setEmptyMode(value: boolean) {
  try { localStorage.setItem(KEY, value ? "1" : "0"); } catch {}
  listeners.forEach((l) => l());
}

export function toggleEmptyMode() {
  setEmptyMode(!read());
}
