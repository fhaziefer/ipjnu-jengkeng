import type { GameStatus } from "@/store/useGameStore";

/**
 * Pengingat "juru kunci kelamaan": kalau orang yang SAMA jadi juru kunci
 * selama 30 menit atau lebih, TTS berbunyi SEKALI untuk rentetan itu.
 *
 * Logika diputuskan di sini (murni, bisa dites). Komponen `LastPlaceAlert`
 * hanya memanggilnya berkala dan mengucapkan hasilnya.
 *
 * Satu "rentetan" = pasangan (juru kunci, `lastPlaceSinceTimestamp`). Timestamp
 * itu sudah dihitung store: tetap selama orangnya sama, bergeser kalau orangnya
 * ganti, dan dihitung ulang dengan benar saat ronde di-undo. Jadi kuncinya
 * otomatis berubah di rentetan baru dan alarm bisa berbunyi lagi, tanpa
 * menambah field apa pun ke store game (skema store game tidak disentuh).
 */

export const LAST_PLACE_ALERT_MS = 30 * 60 * 1000;

export interface AlertSnapshot {
  gameStatus: GameStatus;
  roundCount: number;
  currentLastPlacePlayerId: string | null;
  lastPlaceSinceTimestamp: number | null;
  /** Selama spin belum kelar, juru kunci masih menggantung. */
  hasPendingTieBreak: boolean;
}

export function streakKey(s: AlertSnapshot): string | null {
  if (s.currentLastPlacePlayerId === null || s.lastPlaceSinceTimestamp === null) return null;
  return `${s.currentLastPlacePlayerId}@${s.lastPlaceSinceTimestamp}`;
}

/** Kunci rentetan yang harus diumumkan sekarang, atau null kalau belum waktunya. */
export function dueStreakKey(
  s: AlertSnapshot,
  now: number,
  announcedKey: string | null
): string | null {
  if (s.gameStatus !== "active") return null;
  if (s.roundCount === 0 || s.hasPendingTieBreak) return null;

  const key = streakKey(s);
  if (key === null || key === announcedKey) return null;

  const since = s.lastPlaceSinceTimestamp as number;
  return now - since >= LAST_PLACE_ALERT_MS ? key : null;
}

// ------------------------------------------------------------
// Rentetan terakhir yang sudah diumumkan. Disimpan di localStorage supaya
// reload di tengah game tidak mengulang pengumuman yang sama. Kalau storage
// tidak bisa dipakai, jatuh ke memori: paling buruk berbunyi lagi sesudah reload.
// ------------------------------------------------------------

export const ANNOUNCED_STORAGE_KEY = "jengkeng-lastplace-alert";

let memoryKey: string | null = null;

export function readAnnouncedKey(): string | null {
  try {
    return window.localStorage.getItem(ANNOUNCED_STORAGE_KEY) ?? memoryKey;
  } catch {
    return memoryKey;
  }
}

export function writeAnnouncedKey(key: string): void {
  memoryKey = key;
  try {
    window.localStorage.setItem(ANNOUNCED_STORAGE_KEY, key);
  } catch {
    // storage penuh / diblokir: memori sudah cukup untuk sesi ini
  }
}

/** Hanya untuk tes. */
export function resetAnnouncedKeyForTests(): void {
  memoryKey = null;
  try {
    window.localStorage.removeItem(ANNOUNCED_STORAGE_KEY);
  } catch {
    // abaikan
  }
}
