-- Skema cadangan online Jengkeng (Neon / Postgres).
--
-- TIDAK perlu dijalankan manual: app membuat tabel ini sendiri saat request
-- pertama (create table if not exists). File ini dokumentasi, dan boleh
-- dijalankan manual di SQL Editor Neon kalau mau memastikan tabelnya ada.

create table if not exists backup_games (
  code_hash   text        not null,   -- sha256 dari kode cadangan, kode mentah tidak disimpan
  game_id     text        not null,   -- GameRecord.id
  finished_at bigint      not null,   -- GameRecord.finishedAt, untuk urutan
  record      jsonb       not null,   -- GameRecord utuh
  received_at timestamptz not null default now(),
  primary key (code_hash, game_id)
);

create table if not exists backup_settings (
  code_hash  text        primary key,
  overrides  jsonb       not null,    -- hanya kalimat TTS yang diubah admin
  updated_at timestamptz not null default now()
);
