import type { GameStatus } from "@/store/useGameStore";

/**
 * Dua pengingat TTS untuk juru kunci yang bertahan lama. Keputusannya ada di
 * sini (murni, bisa dites); komponen `LastPlaceAlert` hanya memanggilnya
 * berkala dan mengucapkan hasilnya.
 *
 * 1. Waktu: orang yang SAMA jadi juru kunci 30 menit atau lebih. Sekali per
 *    rentetan.
 * 2. Ronde: orang yang SAMA jadi juru kunci 7 ronde berturut-turut atau lebih.
 *    Tiap ronde baru dari ke-7 dan seterusnya berbunyi sekali (ke-7, ke-8, ...),
 *    dengan jumlah ronde terkini.
 *
 * Satu "rentetan" = pasangan (juru kunci, `lastPlaceSinceTimestamp`). Timestamp
 * itu sudah dihitung store: tetap selama orangnya sama, bergeser kalau orangnya
 * ganti, dan dihitung ulang dengan benar saat ronde di-undo. Jadi kuncinya
 * otomatis berubah di rentetan baru, tanpa menambah field apa pun ke store game
 * (skema store game tidak disentuh).
 */

export const LAST_PLACE_ALERT_MS = 30 * 60 * 1000;
export const LAST_PLACE_STREAK_ROUNDS = 7;

export interface AlertSnapshot {
  gameStatus: GameStatus;
  roundCount: number;
  currentLastPlacePlayerId: string | null;
  lastPlaceSinceTimestamp: number | null;
  /** Selama spin belum kelar, juru kunci masih menggantung. */
  hasPendingTieBreak: boolean;
  /** Ronde berturut-turut orang ini jadi juru kunci (lihat `countConsecutiveLastPlace`). */
  consecutiveRounds: number;
}

export function streakKey(s: AlertSnapshot): string | null {
  if (s.currentLastPlacePlayerId === null || s.lastPlaceSinceTimestamp === null) return null;
  return `${s.currentLastPlacePlayerId}@${s.lastPlaceSinceTimestamp}`;
}

/** Game tidak berjalan, belum ada ronde, atau juru kunci masih menggantung: semua alarm diam. */
function isQuiet(s: AlertSnapshot): boolean {
  return s.gameStatus !== "active" || s.roundCount === 0 || s.hasPendingTieBreak;
}

// ------------------------------------------------------------
// 1. Waktu
// ------------------------------------------------------------

/** Kunci rentetan yang harus diumumkan sekarang, atau null kalau belum waktunya. */
export function dueStreakKey(
  s: AlertSnapshot,
  now: number,
  announcedKey: string | null
): string | null {
  if (isQuiet(s)) return null;

  const key = streakKey(s);
  if (key === null || key === announcedKey) return null;

  const since = s.lastPlaceSinceTimestamp as number;
  return now - since >= LAST_PLACE_ALERT_MS ? key : null;
}

// ------------------------------------------------------------
// 2. Ronde beruntun
// ------------------------------------------------------------

export interface DueRounds {
  /** Nilai yang disimpan sebagai penanda setelah diumumkan. */
  mark: string;
  /** Jumlah ronde beruntun yang diucapkan. */
  count: number;
}

function parseMark(mark: string | null): { streak: string; max: number } | null {
  if (mark === null) return null;
  const at = mark.lastIndexOf("#");
  if (at < 0) return null;
  const max = Number(mark.slice(at + 1));
  return Number.isFinite(max) ? { streak: mark.slice(0, at), max } : null;
}

/**
 * Penanda menyimpan jumlah TERTINGGI yang sudah diumumkan di rentetan itu.
 * Akibatnya "Salah Ngitung" lalu input ulang (jumlah turun lalu naik lagi ke
 * angka yang sudah pernah diucapkan) tidak mengulang pengumuman yang sama.
 */
export function dueRounds(s: AlertSnapshot, announcedMark: string | null): DueRounds | null {
  if (isQuiet(s)) return null;
  if (s.consecutiveRounds < LAST_PLACE_STREAK_ROUNDS) return null;

  const streak = streakKey(s);
  if (streak === null) return null;

  const prev = parseMark(announcedMark);
  if (prev && prev.streak === streak && s.consecutiveRounds <= prev.max) return null;

  return { mark: `${streak}#${s.consecutiveRounds}`, count: s.consecutiveRounds };
}

// ------------------------------------------------------------
// Penanda "sudah diumumkan". Disimpan di localStorage supaya reload di tengah
// game tidak mengulang pengumuman yang sama. Kalau storage tidak bisa dipakai,
// jatuh ke memori: paling buruk berbunyi lagi sesudah reload.
// ------------------------------------------------------------

export type AlertSlot = "time" | "rounds";

export const ANNOUNCED_STORAGE_KEYS: Readonly<Record<AlertSlot, string>> = {
  time: "jengkeng-lastplace-alert",
  rounds: "jengkeng-lastplace-rounds",
};

const memory: Record<AlertSlot, string | null> = { time: null, rounds: null };

export function readAnnounced(slot: AlertSlot): string | null {
  try {
    return window.localStorage.getItem(ANNOUNCED_STORAGE_KEYS[slot]) ?? memory[slot];
  } catch {
    return memory[slot];
  }
}

export function writeAnnounced(slot: AlertSlot, value: string): void {
  memory[slot] = value;
  try {
    window.localStorage.setItem(ANNOUNCED_STORAGE_KEYS[slot], value);
  } catch {
    // storage penuh / diblokir: memori sudah cukup untuk sesi ini
  }
}

/** Hanya untuk tes. */
export function resetAnnouncedForTests(): void {
  memory.time = null;
  memory.rounds = null;
  for (const key of Object.values(ANNOUNCED_STORAGE_KEYS)) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // abaikan
    }
  }
}
