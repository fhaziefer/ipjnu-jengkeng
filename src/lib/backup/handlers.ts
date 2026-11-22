import { MAX_BODY_BYTES, MAX_GAMES_PER_CODE, MAX_GAMES_PER_REQUEST } from "./constants";
import { hashBackupCode, type BackupStorage } from "./storage";
import type { BackupGetResponse, BackupPostResponse } from "./types";
import { isValidBackupCode, partitionGames, sanitizeSettingsOverrides } from "./validate";

/**
 * Logika route cadangan, dipisah dari Next supaya bisa dites tanpa server.
 * Route (`app/api/backup/route.ts`) hanya menyambungkan Request ke fungsi ini.
 *
 * Tidak ada penghapusan lewat HTTP, sengaja: kode cadangan tidak rahasia.
 */

export type { BackupGetResponse, BackupPostResponse } from "./types";

export interface HandlerResult {
  status: number;
  body: Record<string, unknown>;
}

const fail = (status: number, error: string): HandlerResult => ({ status, body: { ok: false, error } });

export interface PostBody {
  code?: unknown;
  games?: unknown;
  settings?: unknown;
}

/** Baca body dengan batas ukuran. Mengembalikan null kalau bukan JSON object. */
export function parseBodyText(text: string): PostBody | "too-large" | null {
  if (text.length > MAX_BODY_BYTES) return "too-large";
  try {
    const data: unknown = JSON.parse(text);
    return typeof data === "object" && data !== null && !Array.isArray(data) ? (data as PostBody) : null;
  } catch {
    return null;
  }
}

export async function handlePost(
  body: PostBody,
  storage: BackupStorage | null
): Promise<HandlerResult> {
  if (!storage) return fail(503, "not-configured");
  if (!isValidBackupCode(body.code)) return fail(400, "bad-code");

  const rawGames = body.games;
  if (rawGames !== undefined && !Array.isArray(rawGames)) return fail(400, "bad-games");
  if (Array.isArray(rawGames) && rawGames.length > MAX_GAMES_PER_REQUEST) return fail(413, "too-many");

  const codeHash = hashBackupCode(body.code);
  const { valid } = partitionGames(rawGames ?? []);

  const validIds = new Set(valid.map((g) => g.id));
  const rejectedIds = (Array.isArray(rawGames) ? rawGames : [])
    .map((g) => (typeof g === "object" && g !== null ? (g as { id?: unknown }).id : undefined))
    .filter((id): id is string => typeof id === "string" && id.length > 0 && !validIds.has(id));

  let inserted = 0;
  if (valid.length > 0) {
    const current = await storage.countGames(codeHash);
    if (current + valid.length > MAX_GAMES_PER_CODE) return fail(422, "limit");
    inserted = await storage.putGames(codeHash, valid);
  }

  // Pengaturan kosong tidak pernah menimpa: HP baru yang belum punya
  // perubahan tidak boleh menghapus cadangan kalimat milik HP lama.
  let settingsSaved = false;
  const overrides = sanitizeSettingsOverrides(body.settings);
  if (Object.keys(overrides).length > 0) {
    await storage.putSettings(codeHash, overrides);
    settingsSaved = true;
  }

  const response: BackupPostResponse = {
    ok: true,
    acked: valid.map((g) => g.id),
    rejectedIds,
    inserted,
    settingsSaved,
    total: await storage.countGames(codeHash),
  };
  return { status: 200, body: response as unknown as Record<string, unknown> };
}

export async function handleGet(
  code: string | null,
  storage: BackupStorage | null
): Promise<HandlerResult> {
  if (!storage) return fail(503, "not-configured");
  if (!isValidBackupCode(code)) return fail(400, "bad-code");

  const codeHash = hashBackupCode(code);
  const games = await storage.listGames(codeHash);
  const settings = await storage.getSettings(codeHash);

  const response: BackupGetResponse = {
    ok: true,
    games,
    settings: settings ? sanitizeSettingsOverrides(settings) : null,
    total: games.length,
  };
  return { status: 200, body: response as unknown as Record<string, unknown> };
}

/**
 * Tolak permintaan lintas situs dari browser (Origin beda dengan host).
 * Ini bukan keamanan sungguhan (curl bisa memalsukan header), cuma mencegah
 * halaman web lain menembak API ini lewat browser pengunjungnya.
 */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin) return true; // fetch same-origin GET tidak selalu mengirim Origin
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
