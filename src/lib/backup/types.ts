import type { GameRecord } from "@/lib/history";
import type { TemplateOverrides } from "@/lib/speechTemplates";

/** Bentuk request/response API cadangan. Hanya tipe, aman diimpor dari klien. */

export interface BackupPostPayload {
  code: string;
  games?: GameRecord[];
  settings?: TemplateOverrides;
}

export interface BackupPostResponse {
  ok: true;
  /** Id game yang sekarang aman di server (baru masuk atau sudah ada). */
  acked: string[];
  /** Id game yang ditolak permanen oleh validasi. Jangan dikirim ulang. */
  rejectedIds: string[];
  inserted: number;
  settingsSaved: boolean;
  total: number;
}

export interface BackupGetResponse {
  ok: true;
  games: GameRecord[];
  settings: TemplateOverrides | null;
  total: number;
}
