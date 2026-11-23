/**
 * Kalimat yang diucapkan TTS, dalam bentuk template yang bisa diedit admin.
 *
 * Default hidup di kode (bukan di storage): yang disimpan user hanya
 * perubahannya. Jadi "reset" = hapus perubahan, dan kalimat baru yang
 * ditambah nanti tidak merusak pengaturan lama.
 *
 * Tiap template boleh berisi placeholder `{nama}` dst. yang daftarnya
 * ditentukan per kalimat. Teks kosong berarti bagian itu dibisukan.
 */

import { angkaJawa } from "./angkaJawa";

export type TemplateKey =
    | "sretConfirm"
    | "tieIntro"
    | "roundHeader"
    | "scoreLine"
    | "gepuk"
    | "psywar100"
    | "psywar200"
    | "psywar300"
    | "psywar500"
    | "psywar1000"
    | "nyewu"
    | "gapWarning"
    | "tieResult"
    | "lastPlaceChange"
    | "lastPlaceLong"
    | "lastPlaceStreak";

export type TemplateGroup = "umum" | "ronde" | "gepuk";

export interface TemplateDef {
    key: TemplateKey;
    group: TemplateGroup;
    label: string;
    /** Kapan kalimat ini diucapkan. */
    help: string;
    defaultText: string;
    placeholders: readonly string[];
    maxLength: number;
    /** Isi contoh placeholder untuk tombol "Dengarkan". */
    sample: TemplateVars;
}

/** Kalimat yang mengunci tombol sampai selesai diucapkan dibatasi lebih pendek. */
const LOCKING_MAX = 100;
const DEFAULT_MAX = 240;

export const TEMPLATE_DEFS: readonly TemplateDef[] = [
    {
        key: "sretConfirm",
        group: "umum",
        label: "Konfirmasi SRET",
        help: "Saat tombol SRET ditekan. {nama_terburuk} = juru kunci saat ini (diisi \"kabeh\" kalau belum ada ronde).",
        defaultText: "Mosok sret tenan? ... yo gak opo opo, lek isin, ha ha.",
        placeholders: ["nama_terburuk"],
        maxLength: DEFAULT_MAX,
        sample: { nama_terburuk: "Dodo" },
    },
    {
        key: "lastPlaceLong",
        group: "umum",
        label: "Juru kunci kelamaan (30 menit)",
        help: "Diucapkan sekali saat orang yang sama jadi juru kunci selama 30 menit atau lebih. {nama_terburuk} = juru kunci saat ini. Kosongkan untuk membisukan.",
        defaultText:
            "{nama_terburuk} wes jengkeng luweh teko setengah jam, ndang njaluk sret wae, lek gak isin tapi",
        placeholders: ["nama_terburuk"],
        maxLength: DEFAULT_MAX,
        sample: { nama_terburuk: "Dodo" },
    },
    {
        key: "lastPlaceStreak",
        group: "umum",
        label: "Juru kunci beruntun",
        help: "Diucapkan tiap kali orang yang sama jadi juru kunci beruntun sampai ambang ronde (diatur di kartu \"Ambang juru kunci beruntun\" di atas) atau lebih, sesudah pengumuman ronde selesai. {nama_terburuk} = juru kunci, {berapa_kali_terbawah} = sudah berapa ronde beruntun. Kosongkan untuk membisukan.",
        defaultText:
            "{nama_terburuk} wes jengkeng ping {berapa_kali_terbawah} njaluk sret ora? lek gak isin",
        placeholders: ["nama_terburuk", "berapa_kali_terbawah"],
        maxLength: DEFAULT_MAX,
        sample: { nama_terburuk: "Dodo", berapa_kali_terbawah: 7 },
    },
    {
        key: "tieIntro",
        group: "umum",
        label: "Skor terendah seri",
        help: "Sebelum spin. {kandidat_seri} = pemain yang seri. Tombol terkunci sampai kalimat ini selesai, jadi dibatasi pendek.",
        defaultText: "Wah, bijine podo. ... Nyepin sek bolo ...",
        placeholders: ["kandidat_seri"],
        maxLength: LOCKING_MAX,
        sample: { kandidat_seri: "Cici dan Dodo" },
    },
    {
        key: "roundHeader",
        group: "ronde",
        label: "Pembuka pengumuman",
        help: "Awal pengumuman setiap ronde.",
        defaultText: "Biji sak iki.",
        placeholders: [],
        maxLength: DEFAULT_MAX,
        sample: {},
    },
    {
        key: "scoreLine",
        group: "ronde",
        label: "Baris skor per pemain",
        help: "Diulang untuk setiap pemain.",
        defaultText: "{nama}, {skor} ...",
        placeholders: ["nama", "skor"],
        maxLength: DEFAULT_MAX,
        sample: { nama: "Mas Bagong", skor: 150 },
    },
    {
        key: "nyewu",
        group: "ronde",
        label: "Tembus 1000 (nyewu)",
        help: "Saat ada pemain pertama kali mencapai 1000. {nama} bisa berisi lebih dari satu orang.",
        defaultText: "Woro woro! ... {nama} wes nyewu, ... ngarit tenan, ... beh beh beh ...",
        placeholders: ["nama"],
        maxLength: DEFAULT_MAX,
        sample: { nama: "Mas Bagong" },
    },
    {
        key: "gapWarning",
        group: "ronde",
        label: "Jarak 500 atau lebih",
        help: "Saat selisih skor terbawah dengan di atasnya sudah 500 atau lebih.",
        defaultText: "Woro woro! ... Jarake wes punjul limangatus, ... sret opo gak?? ... ha ha ha ...",
        placeholders: [],
        maxLength: DEFAULT_MAX,
        sample: {},
    },
    {
        key: "tieResult",
        group: "ronde",
        label: "Hasil spin",
        help: "Setelah spin selesai. {hasil_spin} berisi angka tiap kandidat.",
        defaultText:
            "Woro woro! ... Mau bijine podo, wes tak spin. ... {hasil_spin} ... Sing jengkeng {nama} ...",
        placeholders: ["hasil_spin", "nama"],
        maxLength: DEFAULT_MAX,
        sample: { hasil_spin: `Cici oleh ${angkaJawa(41)}, Dodo oleh ${angkaJawa(12)}`, nama: "Dodo" },
    },
    {
        key: "lastPlaceChange",
        group: "ronde",
        label: "Sing jengkeng ganti",
        help: "Saat juru kunci berganti orang.",
        defaultText: "Woro woro! ... Sing jengkeng ganti {nama} ...",
        placeholders: ["nama"],
        maxLength: DEFAULT_MAX,
        sample: { nama: "Dodo" },
    },
    {
        key: "gepuk",
        group: "gepuk",
        label: "Kalimat gepuk",
        help: "Saat ada gepuk. {psywar} diisi kalimat sesuai besar hukuman (di bawah).",
        defaultText: "Woro woro! ... {penembak} gepuk {korban} {psywar}",
        placeholders: ["penembak", "korban", "psywar", "poin"],
        maxLength: DEFAULT_MAX,
        sample: {
            penembak: "Mas Bagong",
            korban: "Budi",
            psywar: "gawe godongan, ... remeh, remeh, remeh, ... sitik tok ...",
            poin: 100,
        },
    },
    {
        key: "psywar100",
        group: "gepuk",
        label: "Hukuman 100",
        help: "Psywar untuk hukuman 100 poin.",
        defaultText: "gawe godongan, ... remeh, remeh, remeh, ... sitik tok ...",
        placeholders: [],
        maxLength: DEFAULT_MAX,
        sample: {},
    },
    {
        key: "psywar200",
        group: "gepuk",
        label: "Hukuman 200",
        help: "Psywar untuk hukuman 200 poin.",
        defaultText: "gawe londo, lumayan keroso ... ha ha ha ...",
        placeholders: [],
        maxLength: DEFAULT_MAX,
        sample: {},
    },
    {
        key: "psywar300",
        group: "gepuk",
        label: "Hukuman 300",
        help: "Psywar untuk hukuman 300 poin.",
        defaultText: "gawe As, rodok ngelu, ... ha ha ha ...",
        placeholders: [],
        maxLength: DEFAULT_MAX,
        sample: {},
    },
    {
        key: "psywar500",
        group: "gepuk",
        label: "Hukuman 500",
        help: "Psywar untuk hukuman 500 poin.",
        defaultText: "gawe joker, ... biyuh biyuh biyuh ...",
        placeholders: [],
        maxLength: DEFAULT_MAX,
        sample: {},
    },
    {
        key: "psywar1000",
        group: "gepuk",
        label: "Hukuman 1000",
        help: "Psywar untuk hukuman 1000 poin.",
        defaultText:
            "langsung gawe joker loro, ... wes wes wes, sret wae, ... lek gak isin tapi, ha ha ha ...",
        placeholders: [],
        maxLength: DEFAULT_MAX,
        sample: {},
    },
];

export const TEMPLATE_KEYS: readonly TemplateKey[] = TEMPLATE_DEFS.map((d) => d.key);

export const DEFAULT_TEMPLATES = Object.freeze(
    Object.fromEntries(TEMPLATE_DEFS.map((d) => [d.key, d.defaultText]))
) as Readonly<Record<TemplateKey, string>>;

const DEF_BY_KEY = new Map<TemplateKey, TemplateDef>(TEMPLATE_DEFS.map((d) => [d.key, d]));

export function getTemplateDef(key: TemplateKey): TemplateDef {
    const def = DEF_BY_KEY.get(key);
    if (!def) throw new Error(`Template tidak dikenal: ${key}`);
    return def;
}

export function isTemplateKey(value: string): value is TemplateKey {
    return DEF_BY_KEY.has(value as TemplateKey);
}

/** Rapikan input: buang karakter kontrol, rapatkan spasi, trim. */
export function normalizeTemplate(raw: string): string {
    return raw
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

const PLACEHOLDER = /\{(\w+)\}/g;

export type TemplateValidation = { ok: true; text: string } | { ok: false; error: string };

/**
 * Teks kosong LOLOS: artinya bagian itu dibisukan.
 * Setelah dinormalisasi, harus: tidak melebihi batas, hanya memakai
 * placeholder yang diizinkan untuk kalimat itu, dan tidak ada kurung kurawal
 * yang menggantung.
 */
export function validateTemplate(key: TemplateKey, raw: string): TemplateValidation {
    const def = getTemplateDef(key);
    const text = normalizeTemplate(raw);

    if (text.length > def.maxLength) {
        return { ok: false, error: `Terlalu panjang (${text.length}/${def.maxLength} karakter).` };
    }

    for (const match of text.matchAll(PLACEHOLDER)) {
        if (!def.placeholders.includes(match[1])) {
            const allowed = def.placeholders.length
                ? `Yang boleh: ${def.placeholders.map((p) => `{${p}}`).join(", ")}.`
                : "Kalimat ini tidak memakai placeholder.";
            return { ok: false, error: `{${match[1]}} tidak dikenal. ${allowed}` };
        }
    }

    if (/[{}]/.test(text.replace(PLACEHOLDER, ""))) {
        return { ok: false, error: "Ada kurung kurawal yang tidak lengkap." };
    }

    return { ok: true, text };
}

/** Isi placeholder. Memakai fungsi pengganti supaya `$` di nama tidak ditafsirkan. */
export type TemplateVars = Readonly<Record<string, string | number>>;

/**
 * Nilai bertipe number dibaca sebagai angka Jawa; string (nama, kalimat) apa adanya.
 * Jadi nama pemain yang mengandung digit tidak ikut berubah.
 */
export function renderTemplate(template: string, vars: TemplateVars): string {
    return template.replace(PLACEHOLDER, (_, name: string) => {
        const value = vars[name];
        if (value === undefined) return "";
        return typeof value === "number" ? angkaJawa(value) : value;
    });
}

export type TemplateOverrides = Partial<Record<TemplateKey, string>>;

/**
 * Gabungkan default dengan override. Override yang tidak valid (data rusak,
 * atau batas diperketat di versi baru) diabaikan, bukan membuat app error.
 */
export function resolveTemplates(
    overrides: TemplateOverrides | undefined
): Record<TemplateKey, string> {
    const result = { ...DEFAULT_TEMPLATES } as Record<TemplateKey, string>;
    if (!overrides) return result;

    for (const key of TEMPLATE_KEYS) {
        const raw = overrides[key];
        if (typeof raw !== "string") continue;
        const check = validateTemplate(key, raw);
        if (check.ok) result[key] = check.text;
    }

    return result;
}
