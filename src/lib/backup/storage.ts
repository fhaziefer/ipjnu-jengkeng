import { createHash } from "node:crypto";
import type { GameRecord } from "@/lib/history";
import type { TemplateOverrides } from "@/lib/speechTemplates";

/**
 * Lapisan penyimpanan cadangan. Route handler hanya bicara lewat antarmuka
 * ini, jadi tes memakai versi memori dan produksi memakai Neon.
 *
 * Semua tulis bersifat append-only untuk game: id yang sudah ada TIDAK
 * ditimpa. Pengaturan TTS: versi terakhir menang (satu baris per kode).
 */
export interface BackupStorage {
  /** Mengembalikan jumlah game yang benar-benar baru masuk. */
  putGames(codeHash: string, games: GameRecord[]): Promise<number>;
  countGames(codeHash: string): Promise<number>;
  /** Urut kronologis (finishedAt), terlama dulu. */
  listGames(codeHash: string): Promise<GameRecord[]>;
  putSettings(codeHash: string, overrides: TemplateOverrides): Promise<void>;
  getSettings(codeHash: string): Promise<TemplateOverrides | null>;
}

/** Kode tidak pernah disimpan mentah di server. */
export function hashBackupCode(code: string): string {
  return createHash("sha256").update(`jengkeng-backup:${code}`).digest("hex");
}

export class MemoryBackupStorage implements BackupStorage {
  private games = new Map<string, Map<string, GameRecord>>();
  private settings = new Map<string, TemplateOverrides>();

  async putGames(codeHash: string, games: GameRecord[]): Promise<number> {
    let bucket = this.games.get(codeHash);
    if (!bucket) {
      bucket = new Map();
      this.games.set(codeHash, bucket);
    }

    let inserted = 0;
    for (const g of games) {
      if (bucket.has(g.id)) continue;
      bucket.set(g.id, g);
      inserted += 1;
    }
    return inserted;
  }

  async countGames(codeHash: string): Promise<number> {
    return this.games.get(codeHash)?.size ?? 0;
  }

  async listGames(codeHash: string): Promise<GameRecord[]> {
    return [...(this.games.get(codeHash)?.values() ?? [])].sort(
      (a, b) => a.finishedAt - b.finishedAt
    );
  }

  async putSettings(codeHash: string, overrides: TemplateOverrides): Promise<void> {
    this.settings.set(codeHash, { ...overrides });
  }

  async getSettings(codeHash: string): Promise<TemplateOverrides | null> {
    const found = this.settings.get(codeHash);
    return found ? { ...found } : null;
  }
}
