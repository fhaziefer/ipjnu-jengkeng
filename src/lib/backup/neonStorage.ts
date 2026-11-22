import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { GameRecord } from "@/lib/history";
import type { TemplateOverrides } from "@/lib/speechTemplates";
import type { BackupStorage } from "./storage";

/**
 * Penyimpanan Neon (Postgres). Memakai driver HTTP serverless, jadi tiap
 * request tidak menahan koneksi. Semua query berparameter (tagged template).
 *
 * Tabel dibuat sendiri saat pertama dipakai (`create table if not exists`),
 * jadi tidak ada langkah SQL manual. Skema yang sama ada di `db/schema.sql`
 * sebagai dokumentasi dan untuk dijalankan manual kalau mau.
 */

type Sql = NeonQueryFunction<false, false>;

let schemaReady: Promise<void> | null = null;

async function ensureSchema(sql: Sql): Promise<void> {
  await sql.transaction([
    sql`create table if not exists backup_games (
      code_hash   text        not null,
      game_id     text        not null,
      finished_at bigint      not null,
      record      jsonb       not null,
      received_at timestamptz not null default now(),
      primary key (code_hash, game_id)
    )`,
    sql`create table if not exists backup_settings (
      code_hash  text        primary key,
      overrides  jsonb       not null,
      updated_at timestamptz not null default now()
    )`,
  ]);
}

export class NeonBackupStorage implements BackupStorage {
  private sql: Sql;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl);
  }

  private ready(): Promise<void> {
    // Kalau gagal, jangan simpan promise gagalnya: request berikutnya mencoba lagi.
    schemaReady ??= ensureSchema(this.sql).catch((error) => {
      schemaReady = null;
      throw error;
    });
    return schemaReady;
  }

  async putGames(codeHash: string, games: GameRecord[]): Promise<number> {
    if (games.length === 0) return 0;
    await this.ready();

    // Satu statement untuk semua game. Array dikirim sebagai SATU parameter
    // JSON (bukan array Postgres) supaya tidak bergantung pada cara driver
    // menserialisasi array. `do nothing` pada id yang sudah ada: append-only
    // dan idempoten kalau dikirim ulang.
    const rows = await this.sql`
      insert into backup_games (code_hash, game_id, finished_at, record)
      select ${codeHash}, r->>'id', round((r->>'finishedAt')::numeric)::bigint, r
      from jsonb_array_elements(${JSON.stringify(games)}::jsonb) as r
      on conflict (code_hash, game_id) do nothing
      returning game_id
    `;
    return rows.length;
  }

  async countGames(codeHash: string): Promise<number> {
    await this.ready();
    const rows = await this.sql`
      select count(*)::int as n from backup_games where code_hash = ${codeHash}
    `;
    return Number((rows[0] as { n: number } | undefined)?.n ?? 0);
  }

  async listGames(codeHash: string): Promise<GameRecord[]> {
    await this.ready();
    const rows = await this.sql`
      select record from backup_games
      where code_hash = ${codeHash}
      order by finished_at asc
    `;
    return rows.map((r) => (r as { record: GameRecord }).record);
  }

  async putSettings(codeHash: string, overrides: TemplateOverrides): Promise<void> {
    await this.ready();
    await this.sql`
      insert into backup_settings (code_hash, overrides)
      values (${codeHash}, ${JSON.stringify(overrides)}::jsonb)
      on conflict (code_hash)
      do update set overrides = excluded.overrides, updated_at = now()
    `;
  }

  async getSettings(codeHash: string): Promise<TemplateOverrides | null> {
    await this.ready();
    const rows = await this.sql`
      select overrides from backup_settings where code_hash = ${codeHash}
    `;
    const row = rows[0] as { overrides: TemplateOverrides } | undefined;
    return row ? row.overrides : null;
  }
}
