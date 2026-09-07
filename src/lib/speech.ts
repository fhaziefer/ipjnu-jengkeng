/**
 * Wrapper tipis di atas Web Speech API.
 *
 * Tiga masalah yang diselesaikan di sini, biar tidak diulang di tiap komponen:
 * 1. `getVoices()` sering mengembalikan array kosong di panggilan pertama
 *    (Chrome & Android memuat daftar suara secara async). Tanpa cache, suara
 *    Indonesia sering tidak kepakai dan nama dibaca pakai aksen Inggris.
 * 2. `onend` kadang tidak pernah firing di Chrome untuk teks panjang, jadi
 *    setiap callback dikasih fallback timer.
 * 3. `pause()` sebelum `cancel()` bisa menyisakan engine dalam keadaan paused
 *    sehingga `speak()` berikutnya diam. Di sini `pause()` tidak dipakai
 *    sama sekali.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];
let voiceListenerAttached = false;

export function isSpeechAvailable(): boolean {
    return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Panggil sekali sedini mungkin (mis. di SetupScreen) supaya daftar suara
 * sudah panas sebelum pengumuman pertama.
 */
export function primeVoices(): void {
    if (!isSpeechAvailable()) return;

    const load = () => {
        cachedVoices = window.speechSynthesis.getVoices();
    };

    load();

    if (!voiceListenerAttached) {
        window.speechSynthesis.addEventListener("voiceschanged", load);
        voiceListenerAttached = true;
    }
}

function pickIndonesianVoice(): SpeechSynthesisVoice | null {
    if (cachedVoices.length === 0) primeVoices();

    const exact = cachedVoices.find(
        (v) => v.lang === "id-ID" || v.lang === "id_ID"
    );
    if (exact) return exact;

    return cachedVoices.find((v) => v.lang.toLowerCase().startsWith("id")) ?? null;
}

/** Perkiraan durasi bicara, dipakai sebagai fallback kalau `onend` tidak firing. */
export function estimateSpeechMs(text: string): number {
    return Math.min(Math.max(text.length * 105 + 1200, 1500), 30000);
}

export function cancelSpeech(): void {
    if (!isSpeechAvailable()) return;
    window.speechSynthesis.cancel();
}

interface SpeakOptions {
    onEnd?: () => void;
    rate?: number;
}

export function speak(text: string, options: SpeakOptions = {}): void {
    const trimmed = text.trim();

    if (!isSpeechAvailable() || !trimmed) {
        options.onEnd?.();
        return;
    }

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = "id-ID";
    utterance.rate = options.rate ?? 0.9;

    const voice = pickIndonesianVoice();
    if (voice) utterance.voice = voice;

    if (options.onEnd) {
        let settled = false;
        let fallbackTimer: number | undefined;

        const finish = () => {
            if (settled) return;
            settled = true;
            if (fallbackTimer !== undefined) window.clearTimeout(fallbackTimer);
            options.onEnd?.();
        };

        utterance.onend = finish;
        utterance.onerror = finish;
        fallbackTimer = window.setTimeout(finish, estimateSpeechMs(trimmed));
    }

    window.speechSynthesis.speak(utterance);

    // Pengaman untuk bug Chrome di mana speak() setelah cancel() diam saja.
    // resume() pada engine yang tidak paused tidak melakukan apa-apa.
    window.speechSynthesis.resume();
}