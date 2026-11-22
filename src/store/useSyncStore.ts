import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Status cadangan online, SENGAJA di store terpisah (key `jengkeng-sync`).
 *
 * Aturan keras: sinkronisasi hanya boleh menulis ke store ini. Store game
 * dan riwayat tidak pernah disentuh oleh pengirim, hanya oleh tombol
 * "Pulihkan" yang digerakkan user, dan itu hanya menggabungkan.
 *
 * Kalau store ini hilang atau rusak, akibatnya cuma kirim ulang: server
 * idempoten (id yang sudah ada dilewati), jadi tidak ada data yang rusak.
 */

interface SyncState {
  /** Id game yang sudah diakui server. */
  doneIds: string[];
  /** Kunci pengaturan TTS yang terakhir berhasil terkirim. */
  syncedSettingsKey: string | null;
  /** Kapan terakhir berhasil bicara dengan server. */
  lastSyncAt: number | null;
  lastResult: "ok" | "failed" | null;

  addDoneIds: (ids: string[]) => void;
  setSyncedSettingsKey: (key: string | null) => void;
  markResult: (result: "ok" | "failed", at: number) => void;
}

export const SYNC_STORAGE_KEY = "jengkeng-sync";

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

export const useSyncStore = create<SyncState>()(
  persist(
    (set, get) => ({
      doneIds: [],
      syncedSettingsKey: null,
      lastSyncAt: null,
      lastResult: null,

      addDoneIds: (ids) => {
        if (ids.length === 0) return;
        const merged = new Set([...get().doneIds, ...ids]);
        if (merged.size === get().doneIds.length) return;
        set({ doneIds: [...merged] });
      },

      setSyncedSettingsKey: (key) => set({ syncedSettingsKey: key }),

      markResult: (result, at) =>
        set(result === "ok" ? { lastResult: "ok", lastSyncAt: at } : { lastResult: "failed" }),
    }),
    {
      name: SYNC_STORAGE_KEY,
      version: 1,
      partialize: (s) => ({
        doneIds: s.doneIds,
        syncedSettingsKey: s.syncedSettingsKey,
        lastSyncAt: s.lastSyncAt,
        lastResult: s.lastResult,
      }),
      // Data tersimpan yang rusak tidak boleh menjatuhkan app: pakai yang bisa dipakai.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        return {
          ...current,
          doneIds: isStringArray(p.doneIds) ? p.doneIds : [],
          syncedSettingsKey: typeof p.syncedSettingsKey === "string" ? p.syncedSettingsKey : null,
          lastSyncAt: typeof p.lastSyncAt === "number" ? p.lastSyncAt : null,
          lastResult: p.lastResult === "ok" || p.lastResult === "failed" ? p.lastResult : null,
        };
      },
    }
  )
);
