import { isValidGameRecord, type GameRecord } from "@/lib/history";
import { isTemplateKey, validateTemplate, type TemplateOverrides } from "@/lib/speechTemplates";
import {
  CODE_PATTERN,
  MAX_ROUNDS_PER_GAME,
  MAX_SHOOTS_PER_GAME,
  MAX_STRING_LENGTH,
} from "./constants";

export function isValidBackupCode(code: unknown): code is string {
  return typeof code === "string" && CODE_PATTERN.test(code);
}

/**
 * `isValidGameRecord` sengaja longgar (dipakai juga untuk import berkas).
 * Server memperketat: id/nama dibatasi panjangnya, jumlah ronde dan gepuk
 * dibatasi. Record yang lolos di sini dijamin kecil dan berbentuk benar.
 */
export function isAcceptableGameRecord(value: unknown): value is GameRecord {
  if (!isValidGameRecord(value)) return false;

  if (value.id.length > MAX_STRING_LENGTH) return false;
  if (value.rounds.length > MAX_ROUNDS_PER_GAME) return false;
  if (value.shoots.length > MAX_SHOOTS_PER_GAME) return false;
  if (value.winnerKey.length > MAX_STRING_LENGTH || value.loserKey.length > MAX_STRING_LENGTH) {
    return false;
  }

  return value.players.every(
    (p) => p.key.length <= MAX_STRING_LENGTH && p.name.length <= MAX_STRING_LENGTH
  );
}

export function partitionGames(raw: unknown): { valid: GameRecord[]; rejected: number } {
  if (!Array.isArray(raw)) return { valid: [], rejected: 0 };

  const valid: GameRecord[] = [];
  const seen = new Set<string>();

  for (const item of raw) {
    if (!isAcceptableGameRecord(item) || seen.has(item.id)) continue;
    seen.add(item.id);
    valid.push(item);
  }

  return { valid, rejected: raw.length - valid.length };
}

/** Hanya kalimat TTS yang dikenal dan valid yang lolos. Sisanya dibuang diam-diam. */
export function sanitizeSettingsOverrides(raw: unknown): TemplateOverrides {
  const clean: TemplateOverrides = {};
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return clean;

  for (const [key, value] of Object.entries(raw)) {
    if (!isTemplateKey(key) || typeof value !== "string") continue;
    const check = validateTemplate(key, value);
    if (check.ok) clean[key] = check.text;
  }
  return clean;
}
