import type { GameRecord } from "@/lib/history";
import type { TemplateOverrides } from "@/lib/speechTemplates";
import { BACKUP_CODE, MAX_GAMES_PER_REQUEST } from "./constants";
import type { ApiResult } from "./client";
import type { BackupPostPayload, BackupPostResponse } from "./types";

/**
 * Inti sinkronisasi, murni (tanpa store, tanpa jaringan sungguhan): terima
 * apa yang ada, kirim lewat fungsi `send`, laporkan apa yang berhasil.
 * Store dan trigger ada di `runner.ts`. Dipisah supaya bisa dites rapat.
 */

export interface SyncInput {
  games: ReadonlyArray<GameRecord>;
  /** Id game yang sudah diakui server. */
  doneIds: ReadonlySet<string>;
  overrides: TemplateOverrides;
  /** Kunci pengaturan yang terakhir berhasil terkirim. */
  syncedSettingsKey: string | null;
}

export interface SyncOutcome {
  /** Id yang selesai (diakui atau ditolak permanen) pada run ini. */
  newDoneIds: string[];
  syncedSettingsKey: string | null;
  failed: boolean;
  /** Status HTTP kegagalan (null = jaringan/timeout). */
  failStatus: number | null;
  requests: number;
}

export type Send = (payload: BackupPostPayload) => Promise<ApiResult<BackupPostResponse>>;

/** Kunci stabil dari pengaturan. Null kalau tidak ada yang diubah (tidak ada yang perlu dikirim). */
export function settingsKey(overrides: TemplateOverrides): string | null {
  const entries = Object.entries(overrides).sort(([a], [b]) => a.localeCompare(b));
  return entries.length === 0 ? null : JSON.stringify(entries);
}

function chunk<T>(items: ReadonlyArray<T>, size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function pendingGames(
  games: ReadonlyArray<GameRecord>,
  doneIds: ReadonlySet<string>
): GameRecord[] {
  return games.filter((g) => !doneIds.has(g.id));
}

export async function runBackup(input: SyncInput, send: Send): Promise<SyncOutcome> {
  const pending = pendingGames(input.games, input.doneIds);
  const key = settingsKey(input.overrides);
  const needSettings = key !== null && key !== input.syncedSettingsKey;

  const outcome: SyncOutcome = {
    newDoneIds: [],
    syncedSettingsKey: input.syncedSettingsKey,
    failed: false,
    failStatus: null,
    requests: 0,
  };

  if (pending.length === 0 && !needSettings) return outcome;

  // Tanpa game tertunda tapi pengaturan berubah: satu request tanpa game.
  const batches = pending.length > 0 ? chunk(pending, MAX_GAMES_PER_REQUEST) : [[]];

  for (let i = 0; i < batches.length; i += 1) {
    const withSettings = i === 0 && needSettings;
    const payload: BackupPostPayload = {
      code: BACKUP_CODE,
      games: batches[i],
      ...(withSettings ? { settings: input.overrides } : {}),
    };

    outcome.requests += 1;
    const res = await send(payload);

    if (!res.ok) {
      outcome.failed = true;
      outcome.failStatus = res.status;
      break; // sisanya dicoba lagi di run berikutnya
    }

    outcome.newDoneIds.push(...res.data.acked, ...res.data.rejectedIds);
    if (withSettings && res.data.settingsSaved) outcome.syncedSettingsKey = key;
  }

  return outcome;
}
