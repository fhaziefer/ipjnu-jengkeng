/**
 * Game otomatis ditutup kalau lama tidak ada itungan.
 *
 * Masalahnya: orang lupa menekan "Bubar". Game kemarin masih aktif, durasinya
 * membengkak, dan ronde malam berikutnya bisa masuk ke game yang salah.
 *
 * Aturan:
 * - Ditutup kalau tidak ada aktivitas (ronde masuk, undo, edit, spin) selama
 *   AUTO_FINISH_IDLE_MS. Game tanpa ronde tidak ditutup (tidak ada yang dicatat).
 * - Tidak ditutup selama spin seri belum selesai: hukuman masih menggantung.
 * - Yang dicatat ke riwayat adalah waktu aktivitas terakhir, bukan waktu HP
 *   dibuka lagi, supaya durasi game tidak ikut menghitung jam tidur.
 * - Bisa dilanjutkan selama RESUME_WINDOW_MS sesudah ditutup, kalau ternyata
 *   cuma istirahat panjang. Selama itu game belum dicadangkan online, karena
 *   cadangan sengaja tidak bisa ditimpa: kalau terkirim dulu, versi lengkapnya
 *   nanti tidak akan pernah masuk.
 */

export const AUTO_FINISH_IDLE_MS = 30 * 60 * 1000;
export const RESUME_WINDOW_MS = 3 * 60 * 60 * 1000;

export interface AutoFinishInfo {
  /** Kapan app menutup game (bukan waktu ronde terakhir). */
  detectedAt: number;
  /** Id riwayat yang dibuat; null kalau gagal dicatat. */
  recordId: string | null;
}

export interface IdleSnapshot {
  gameStatus: "idle" | "active" | "finished";
  gameStartTime: number | null;
  lastActivityAt?: number | null;
  rounds: ReadonlyArray<{ roundId: string }>;
  pendingTieBreak: unknown | null;
}

/**
 * Aktivitas terakhir yang diketahui. `lastActivityAt` baru ada sejak fitur ini,
 * jadi game yang sedang jalan saat update jatuh ke ronde terakhir / waktu mulai.
 */
export function lastActivity(s: IdleSnapshot): number | null {
  const candidates: number[] = [];
  if (typeof s.lastActivityAt === "number") candidates.push(s.lastActivityAt);
  if (typeof s.gameStartTime === "number") candidates.push(s.gameStartTime);
  const last = s.rounds[s.rounds.length - 1];
  if (last) {
    const ts = Number.parseInt(last.roundId, 10);
    if (Number.isFinite(ts)) candidates.push(ts);
  }
  return candidates.length ? Math.max(...candidates) : null;
}

/**
 * Waktu yang dicatat sebagai selesai kalau game sudah waktunya ditutup, null kalau belum.
 * `extraActivityAt`: aktivitas di layar yang tidak masuk store (mis. modal baru ditutup).
 */
export function dueAutoFinish(
  s: IdleSnapshot,
  now: number,
  extraActivityAt: number | null = null
): number | null {
  if (s.gameStatus !== "active") return null;
  if (s.rounds.length === 0) return null;
  if (s.pendingTieBreak) return null;
  const last = lastActivity(s);
  if (last === null) return null;
  const effective = extraActivityAt !== null ? Math.max(last, extraActivityAt) : last;
  if (now - effective < AUTO_FINISH_IDLE_MS) return null;
  return last;
}

export function canResume(
  gameStatus: IdleSnapshot["gameStatus"],
  info: AutoFinishInfo | null | undefined,
  now: number
): boolean {
  if (gameStatus !== "finished" || !info) return false;
  return now - info.detectedAt < RESUME_WINDOW_MS;
}

/** Id riwayat yang ditahan dari cadangan online selama masih bisa dilanjutkan. */
export function heldBackupId(
  gameStatus: IdleSnapshot["gameStatus"],
  info: AutoFinishInfo | null | undefined,
  now: number
): string | null {
  return canResume(gameStatus, info, now) ? (info?.recordId ?? null) : null;
}
