import { useSyncExternalStore } from "react";
import { ACTIVITY_FEED } from "@/lib/mock";

const READ_KEY = "dentalflux:notif-read";
const UNREAD_KEY = "dentalflux:notif-unread"; // ids forced to unread again (after "mark all" + new ones)

let readSet: Set<string> = new Set();
let initialized = false;
const listeners = new Set<() => void>();

function load() {
  if (initialized || typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (raw) readSet = new Set(JSON.parse(raw) as string[]);
  } catch {
    /* localStorage may be unavailable */
  }
  initialized = true;
}

function persist() {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...readSet]));
  } catch {
    /* localStorage may be unavailable */
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

function getSnapshot(): Set<string> {
  load();
  return readSet;
}

function getServerSnapshot(): Set<string> {
  return new Set<string>();
}

export function useReadIds(): Set<string> {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function isUnread(id: string, originalUnread: boolean): boolean {
  return originalUnread && !readSet.has(id);
}

export function markRead(id: string) {
  load();
  if (!readSet.has(id)) {
    readSet.add(id);
    persist();
  }
}

export function markAllRead() {
  load();
  for (const a of ACTIVITY_FEED) {
    if (a.unread) readSet.add(a.id);
  }
  persist();
}

export function useUnreadCount(): number {
  const read = useReadIds();
  return ACTIVITY_FEED.filter((a) => a.unread && !read.has(a.id)).length;
}
const _ = UNREAD_KEY;
void _;
