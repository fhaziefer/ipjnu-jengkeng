import { create } from "zustand";
import type { GameEvent } from "@/lib/gameEvents";
import { useSettingsStore } from "./useSettingsStore";

/** Lama satu efek di layar. Batas DESIGN.md aturan 8: <= 1,2 detik. */
export const EFFECT_MS = 1200;

export interface ActiveEffect {
  id: number;
  event: GameEvent;
}

interface EffectsState {
  active: ActiveEffect[];
  /** Kejadian ronde yang ditahan sampai hasil spin seri ditutup. */
  deferred: GameEvent[];
  play: (events: GameEvent[]) => void;
  defer: (events: GameEvent[]) => void;
  /** Memutar yang ditahan (ditambah `extra`) lalu mengosongkan antrean. */
  flush: (extra?: GameEvent[]) => void;
  clearAll: () => void;
}

/**
 * Efek animasi SENGAJA tidak dipersist: efek yang tertunda saat reload tidak
 * boleh diputar ulang, dan state game tidak boleh berubah karena animasi.
 */

let nextId = 1;

function reducedMotion(): boolean {
  return typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

export function effectsEnabled(): boolean {
  return useSettingsStore.getState().animations && !reducedMotion();
}

export const useEffectsStore = create<EffectsState>()((set, get) => ({
  active: [],
  deferred: [],

  play: (events) => {
    if (events.length === 0 || !effectsEnabled()) return;
    const added = events.map((event) => ({ id: nextId++, event }));
    set({ active: [...get().active, ...added] });
    const ids = new Set(added.map((e) => e.id));
    setTimeout(() => {
      set({ active: get().active.filter((e) => !ids.has(e.id)) });
    }, EFFECT_MS + 100);
  },

  defer: (events) => {
    if (events.length === 0) return;
    set({ deferred: [...get().deferred, ...events] });
  },

  flush: (extra = []) => {
    const events = [...get().deferred, ...extra];
    set({ deferred: [] });
    get().play(events);
  },

  clearAll: () => set({ active: [], deferred: [] }),
}));

/** Dipanggil sesudah ronde baru disimpan. Kalau menunggu spin seri, efek ditahan. */
export function emitRoundEffects(events: GameEvent[], waitingForTie: boolean): void {
  const store = useEffectsStore.getState();
  if (waitingForTie) store.defer(events);
  else store.play(events);
}
