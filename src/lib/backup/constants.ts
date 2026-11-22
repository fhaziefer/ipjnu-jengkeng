/**
 * Konstanta cadangan online (Neon).
 *
 * Kode cadangan SENGAJA tetap "0000": device penghitung cuma satu dan ini
 * buat seru-seruan. Konsekuensinya, siapa pun yang tahu kode ini bisa baca
 * dan menambah cadangan. Karena itu server dibuat append-only: tidak ada
 * endpoint hapus lewat HTTP (hapus hanya lewat script admin), dan semua
 * kiriman divalidasi serta dibatasi ukurannya.
 */

export const BACKUP_CODE = "0000";
export const BACKUP_API_PATH = "/api/backup";

/** Game per permintaan. Backfill riwayat lama dikirim bertahap segini. */
export const MAX_GAMES_PER_REQUEST = 50;
/** Batas total game per kode di server, supaya tabel tidak bisa dibengkakkan. */
export const MAX_GAMES_PER_CODE = 5000;
export const MAX_BODY_BYTES = 512 * 1024;

/** Batas bentuk satu GameRecord (di atas validasi isValidGameRecord). */
export const MAX_ROUNDS_PER_GAME = 500;
export const MAX_SHOOTS_PER_GAME = 2000;
export const MAX_STRING_LENGTH = 40;

/** Kode: huruf, angka, strip. Panjang wajar. */
export const CODE_PATTERN = /^[A-Za-z0-9-]{4,64}$/;

export const CLIENT_TIMEOUT_MS = 8000;
