/**
 * Utilitas nama pemain.
 *
 * Aturan main:
 * - `name` = nama lengkap, boleh spasi ("Mas Bagong"). Dipakai di popup detail,
 *   skor akhir, psywar, dan speech.
 * - `shortLabel` = turunan otomatis, dipakai di tempat sempit (header tabel
 *   receipt, avatar, tombol gepuk). Tidak pernah disimpan di store.
 */

export const MAX_NAME_LENGTH = 16;

/** Panjang maksimum sebuah nama masih boleh dieja huruf per huruf oleh TTS. */
const SPELL_MAX_LENGTH = 4;

/** Karakter yang boleh masuk nama: huruf, angka, spasi, apostrof, titik, strip. */
const ALLOWED_NAME_CHARS = /[^\p{L}\p{N}\s'.-]/gu;

/** Untuk speech: buang semua kecuali huruf, angka, dan spasi. */
const SPEECH_SAFE_CHARS = /[^\p{L}\p{N}\s]/gu;

/**
 * Dipakai on-change saat user ngetik. Sengaja TIDAK trim di akhir supaya user
 * masih bisa ngetik "Mas " sebelum lanjut ke "Bagong".
 */
export function normalizePlayerNameInput(raw: string): string {
    return raw
        .replace(ALLOWED_NAME_CHARS, "")
        .replace(/\s+/g, " ")
        .replace(/^\s+/, "")
        .slice(0, MAX_NAME_LENGTH);
}

/**
 * Kapitalisasi satu kata.
 * "bagong" -> "Bagong" | "BAGONG" -> "Bagong" | "McDonald" -> "McDonald"
 *
 * Kata yang sudah campur huruf besar-kecil TIDAK di-lowercase, supaya nama
 * seperti "McDonald" atau "DwiPutra" tidak dirusak.
 */
function capitalizeWord(word: string): string {
    if (!word) return word;

    const isAllCaps = word === word.toLocaleUpperCase("id-ID");
    const body = isAllCaps ? word.toLocaleLowerCase("id-ID") : word;

    return body.charAt(0).toLocaleUpperCase("id-ID") + body.slice(1);
}

/**
 * Proper case untuk nama orang.
 *
 * Satu pengecualian: nama satu kata yang all-caps dan pendek dianggap inisial,
 * jadi dibiarkan apa adanya. Ini yang menjaga "BGN" tetap dieja per huruf, dan
 * yang bikin semua data lama (dulu dipaksa `slice(0,3).toUpperCase()`) tidak
 * berubah cara bacanya setelah update.
 *
 * Kapitalisasi hanya terjadi setelah spasi. Apostrof sengaja dilewati supaya
 * "nur'ain" tidak jadi "Nur'Ain".
 */
export function toProperCase(raw: string): string {
    const trimmed = raw.trim().replace(/\s+/g, " ");
    if (!trimmed) return "";

    const looksLikeInitials =
        !/\s/.test(trimmed) &&
        trimmed.length <= SPELL_MAX_LENGTH &&
        trimmed === trimmed.toLocaleUpperCase("id-ID");

    if (looksLikeInitials) return trimmed;

    return trimmed.split(" ").map(capitalizeWord).join(" ");
}

/**
 * Dipakai saat blur dan saat submit. Versi final yang masuk store.
 * Sengaja TIDAK dipakai di onChange: proper case yang jalan tiap ketikan
 * berantem dengan jari user.
 */
export function finalizePlayerName(raw: string): string {
    return toProperCase(normalizePlayerNameInput(raw));
}

/** Kunci pembanding untuk deteksi nama kembar: "Mas  Bagong" == "mas bagong". */
export function playerNameKey(name: string): string {
    return finalizePlayerName(name).toLocaleLowerCase("id-ID");
}

/**
 * Strip ikut jadi pemisah kata, kalau tidak "Al-fatih" menghasilkan label
 * "AL-" yang tandanya ikut kebawa ke header tabel.
 */
function splitNameParts(name: string): string[] {
    return name.split(/[\s-]+/).filter(Boolean);
}

/**
 * Label pendek dasar.
 * "Bagong"      -> "BAG"
 * "Mas Bagong"  -> "MB"
 * "A B C D"     -> "ABC"
 */
export function toShortLabel(name: string): string {
    const parts = splitNameParts(finalizePlayerName(name));

    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();

    return parts
        .map((part) => part[0])
        .join("")
        .slice(0, 3)
        .toUpperCase();
}

/**
 * Varian lebih panjang untuk memecah tabrakan.
 * "Mas Bagong" -> "MBA", "Mas Budi" -> "MBU"
 */
function toDisambiguatedLabel(name: string): string {
    const parts = splitNameParts(finalizePlayerName(name));

    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase();

    const first = parts[0][0];
    const last = parts[parts.length - 1].slice(0, 2);

    return `${first}${last}`.toUpperCase();
}

/**
 * Bikin peta id -> shortLabel yang dijamin unik dalam satu permainan.
 *
 * Tiga tingkat: label dasar, lalu varian disambiguasi, lalu suffix angka.
 * Tanpa ini "Mas Bagong" dan "Mas Budi" sama-sama jadi "MB" dan header tabel
 * receipt jadi tidak bisa dibaca.
 */
export function buildShortLabels(
    players: ReadonlyArray<{ id: string; name: string }>
): Record<string, string> {
    const labels: Record<string, string> = {};
    const usage: Record<string, string[]> = {};

    players.forEach((player) => {
        const base = toShortLabel(player.name);
        labels[player.id] = base;
        usage[base] = usage[base] ? [...usage[base], player.id] : [player.id];
    });

    Object.entries(usage).forEach(([base, ids]) => {
        if (ids.length < 2) return;

        ids.forEach((id) => {
            const player = players.find((p) => p.id === id);
            if (player) labels[id] = toDisambiguatedLabel(player.name);
        });

        // Masih bentrok juga (nama benar-benar kembar) -> tempel angka urut.
        const stillClashing = ids.filter(
            (id) => ids.filter((other) => labels[other] === labels[id]).length > 1
        );

        stillClashing.forEach((id, index) => {
            labels[id] = `${labels[id].slice(0, 3)}${index + 1}`;
        });

        void base;
    });

    return labels;
}

/**
 * Nama pendek all-caps dianggap inisial dan tetap dieja huruf per huruf.
 * "BGN" -> dieja. "Bagong" / "Mas Bagong" -> dibaca utuh.
 *
 * Ini kenapa input TIDAK boleh lagi memaksa uppercase: huruf besar sekarang
 * adalah sinyal dari user, bukan gaya tampilan.
 */
export function shouldSpell(name: string): boolean {
    const trimmed = name.trim();

    if (!trimmed) return false;
    if (/\s/.test(trimmed)) return false;
    if (trimmed.length > SPELL_MAX_LENGTH) return false;

    return trimmed === trimmed.toUpperCase();
}

/**
 * Versi nama yang aman disuapkan ke SpeechSynthesisUtterance.
 * Emoji dan tanda baca dibuang supaya tidak merusak jeda "..." di kalimat
 * psywar, dan supaya engine tidak membacakan nama emoji.
 */
export function toSpeechName(name: string): string {
    const clean = name
        .replace(SPEECH_SAFE_CHARS, " ")
        .replace(/\s+/g, " ")
        .trim();

    if (!clean) return "";

    return shouldSpell(clean) ? clean.split("").join(". ") : clean;
}