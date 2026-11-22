import { isValidGameRecord } from "@/lib/history";
import { useHistoryStore } from "@/store/useHistoryStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useSyncStore } from "@/store/useSyncStore";
import { fetchBackup, postBackup } from "./client";
import { BACKUP_CODE } from "./constants";
import { runBackup } from "./sync";

/**
 * Penghubung store dan jaringan untuk cadangan online.
 *
 * Yang ditulis pengirim: HANYA `useSyncStore`. Store riwayat dan game tidak
 * pernah ditulis dari sini, kecuali `restoreFromServer` yang dipicu tombol
 * "Pulihkan" dan hanya menggabungkan (id yang sudah ada dilewati).
 */

const COOLDOWN_AFTER_FAIL_MS = 60_000;
/** Server belum dikonfigurasi (503): jangan ketuk terus-terusan. */
const COOLDOWN_NOT_CONFIGURED_MS = 10 * 60_000;

export type RunResult = "ok" | "nothing" | "failed" | "skipped";

export interface RunOptions {
  /** Tombol "Kirim sekarang": abaikan jeda setelah gagal dan status offline. */
  force?: boolean;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

let inFlight: Promise<RunResult> | null = null;
let rerunRequested = false;
let blockedUntil = 0;

/** Hanya untuk tes. */
export function resetRunnerForTests(): void {
  inFlight = null;
  rerunRequested = false;
  blockedUntil = 0;
}

async function runOnce(options: RunOptions): Promise<RunResult> {
  const now = options.now ?? Date.now;
  const fetchImpl = options.fetchImpl ?? fetch;

  const sync = useSyncStore.getState();
  const outcome = await runBackup(
    {
      games: useHistoryStore.getState().games,
      doneIds: new Set(sync.doneIds),
      overrides: useSettingsStore.getState().overrides,
      syncedSettingsKey: sync.syncedSettingsKey,
    },
    (payload) => postBackup(payload, fetchImpl)
  );

  // Hasil parsial tetap disimpan: batch yang berhasil tidak dikirim ulang.
  if (outcome.newDoneIds.length > 0) useSyncStore.getState().addDoneIds(outcome.newDoneIds);
  if (outcome.syncedSettingsKey !== sync.syncedSettingsKey) {
    useSyncStore.getState().setSyncedSettingsKey(outcome.syncedSettingsKey);
  }

  if (outcome.failed) {
    useSyncStore.getState().markResult("failed", now());
    blockedUntil =
      now() + (outcome.failStatus === 503 ? COOLDOWN_NOT_CONFIGURED_MS : COOLDOWN_AFTER_FAIL_MS);
    return "failed";
  }

  if (outcome.requests === 0) return "nothing";

  useSyncStore.getState().markResult("ok", now());
  return "ok";
}

/**
 * Kirim yang belum terkirim. Aman dipanggil kapan saja dan sesering apa pun:
 * satu run berjalan pada satu waktu, permintaan yang masuk saat run berjalan
 * digabung jadi satu run ulang di akhir. Tidak pernah melempar.
 */
export function runBackupNow(options: RunOptions = {}): Promise<RunResult> {
  const now = options.now ?? Date.now;

  if (inFlight) {
    rerunRequested = true;
    return inFlight;
  }

  if (!options.force) {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return Promise.resolve("skipped");
    }
    if (now() < blockedUntil) return Promise.resolve("skipped");
  } else {
    blockedUntil = 0;
  }

  inFlight = (async () => {
    try {
      let result = await runOnce(options);
      while (rerunRequested && result !== "failed") {
        rerunRequested = false;
        const next = await runOnce(options);
        // Yang dilaporkan ke pemanggil: ada yang terkirim di salah satu putaran.
        result = next === "nothing" ? result : next;
      }
      return result;
    } catch {
      useSyncStore.getState().markResult("failed", now());
      blockedUntil = now() + COOLDOWN_AFTER_FAIL_MS;
      return "failed" as const;
    } finally {
      rerunRequested = false;
      inFlight = null;
    }
  })();

  return inFlight;
}

export type RestoreResult =
  | { ok: true; added: number; total: number; settingsRestored: number }
  | { ok: false };

/**
 * Tarik cadangan dari server dan GABUNGKAN ke riwayat lokal. Game yang sudah
 * ada dilewati. Kalimat TTS hanya mengisi yang belum diubah di HP ini, tidak
 * menimpa yang sudah ada. Dipicu tombol, tidak pernah otomatis.
 */
export async function restoreFromServer(
  options: Pick<RunOptions, "fetchImpl"> = {}
): Promise<RestoreResult> {
  try {
    const res = await fetchBackup(BACKUP_CODE, options.fetchImpl ?? fetch);
    if (!res.ok) return { ok: false };

    const games = res.data.games.filter(isValidGameRecord);
    const added = useHistoryStore.getState().importGames(games);

    // Semua yang ada di server sudah tercadang, jangan dikirim balik.
    useSyncStore.getState().addDoneIds(games.map((g) => g.id));

    let settingsRestored = 0;
    const server = res.data.settings;
    if (server) {
      const settings = useSettingsStore.getState();
      for (const [key, text] of Object.entries(server)) {
        if (typeof text !== "string") continue;
        if (Object.prototype.hasOwnProperty.call(settings.overrides, key)) continue;
        // setOverride memvalidasi ulang: kunci asing / placeholder rusak ditolak.
        const check = settings.setOverride(key as Parameters<typeof settings.setOverride>[0], text);
        if (check.ok) settingsRestored += 1;
      }
    }

    return { ok: true, added, total: games.length, settingsRestored };
  } catch {
    return { ok: false };
  }
}
