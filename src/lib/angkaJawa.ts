/**
 * Angka jadi ucapan Jawa ngoko (ragam Suroboyoan) untuk TTS.
 *
 * Mesin suara id-ID membaca digit dengan bahasa Indonesia ("seratus lima puluh"),
 * padahal kalimatnya Jawa. Di sini angka ditulis sebagai kata Jawa supaya
 * seluruh kalimat konsisten. Hanya dipakai untuk suara, layar tetap digit.
 *
 * Pilihan ejaan (Suroboyoan): limo, songo, limolas, songolas, songolikur.
 * Bentuk yang tidak teratur: selawe (25), seket (50), sewidak (60), nematus (600).
 */

const SATUAN = ["nol", "siji", "loro", "telu", "papat", "limo", "enem", "pitu", "wolu", "songo"];

const BELASAN = [
    "sepuluh", "sewelas", "rolas", "telulas", "patbelas",
    "limolas", "nembelas", "pitulas", "wolulas", "songolas",
];

/** 21-29. Indeks = satuan. 25 tidak teratur. */
const LIKUR = [
    "", "selikur", "rolikur", "telulikur", "patlikur",
    "selawe", "nemlikur", "pitulikur", "wolulikur", "songolikur",
];

/** Bentuk "pengubah" 1-9 yang menempel di depan puluh/atus/ewu. Indeks 1 diisi khusus per satuan. */
const PREFIX = ["", "", "rong", "telung", "patang", "limang", "nem", "pitung", "wolung", "songong"];

const PULUHAN = [
    "", "sepuluh", "rongpuluh", "telungpuluh", "patangpuluh",
    "seket", "sewidak", "pitungpuluh", "wolungpuluh", "songongpuluh",
];

/** Di atas batas ini (atau bukan bilangan bulat) kembali ke digit, bukan salah ucap. */
export const MAX_ANGKA_JAWA = 999_999;

function bawahSeratus(n: number): string {
    if (n < 10) return SATUAN[n];
    if (n < 20) return BELASAN[n - 10];
    const puluh = Math.floor(n / 10);
    const sisa = n % 10;
    if (n < 30) return sisa === 0 ? PULUHAN[2] : LIKUR[sisa];
    return sisa === 0 ? PULUHAN[puluh] : `${PULUHAN[puluh]} ${SATUAN[sisa]}`;
}

function bawahSeribu(n: number): string {
    if (n < 100) return bawahSeratus(n);
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;
    const kepala = ratus === 1 ? "satus" : `${PREFIX[ratus]}atus`;
    return sisa === 0 ? kepala : `${kepala} ${bawahSeratus(sisa)}`;
}

function positif(n: number): string {
    if (n < 1000) return bawahSeribu(n);
    const ribu = Math.floor(n / 1000);
    const sisa = n % 1000;
    // 1000-9999 memakai bentuk menempel (rongewu), 10000 ke atas "<angka> ewu".
    const kepala = ribu === 1 ? "sewu" : ribu < 10 ? `${PREFIX[ribu]}ewu` : `${bawahSeribu(ribu)} ewu`;
    return sisa === 0 ? kepala : `${kepala} ${bawahSeribu(sisa)}`;
}

/** Bilangan bulat -999.999..999.999 jadi kata Jawa; selebihnya digit apa adanya. */
export function angkaJawa(n: number): string {
    if (!Number.isInteger(n) || Math.abs(n) > MAX_ANGKA_JAWA) return String(n);
    return n < 0 ? `minus ${positif(-n)}` : positif(n);
}
