import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mergeGames, type GameRecord } from "@/lib/history";

/**
 * Riwayat permainan, SENGAJA di store terpisah dari `useGameStore`.
 *
 * Store game punya skema yang sudah dipakai user (key `jengkeng-score-storage`,
 * versi 1). Menempelkan riwayat ke sana berarti mengubah skema itu dan wajib
 * menulis migrasi. Dengan key sendiri, game yang sedang berjalan tidak
 * tersentuh sama sekali oleh fitur ini.
 */

interface HistoryState {
  /** Urut kronologis, yang terlama dulu. */
  games: GameRecord[];
  /** False kalau game dengan id yang sama sudah tercatat (mis. refresh). */
  recordGame: (game: GameRecord) => boolean;
  deleteGame: (id: string) => void;
  /** Mengembalikan jumlah game baru yang benar-benar masuk. */
  importGames: (games: GameRecord[]) => number;
  clearHistory: () => void;
}

export const HISTORY_STORAGE_KEY = "jengkeng-history";

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      games: [],

      recordGame: (game) => {
        const { games, added } = mergeGames(get().games, [game]);
        if (added === 0) return false;
        set({ games });
        return true;
      },

      deleteGame: (id) => {
        set({ games: get().games.filter((g) => g.id !== id) });
      },

      importGames: (incoming) => {
        const { games, added } = mergeGames(get().games, incoming);
        if (added > 0) set({ games });
        return added;
      },

      clearHistory: () => set({ games: [] }),
    }),
    {
      name: HISTORY_STORAGE_KEY,
      version: 1,
    }
  )
);
