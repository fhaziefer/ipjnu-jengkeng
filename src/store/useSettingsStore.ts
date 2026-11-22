import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
    isTemplateKey,
    resolveTemplates,
    validateTemplate,
    type TemplateKey,
    type TemplateOverrides,
    type TemplateValidation,
} from "@/lib/speechTemplates";
import {
    LAST_PLACE_STREAK_ROUNDS,
    sanitizeStreakThreshold,
    validateStreakThreshold,
    type StreakThresholdValidation,
} from "@/lib/lastPlaceAlert";

/**
 * Pengaturan app, SENGAJA di store terpisah dari game dan riwayat.
 *
 * Key sendiri (`jengkeng-settings`) berarti game yang sedang berjalan dan
 * riwayat tidak tersentuh sama sekali oleh fitur ini. Yang disimpan hanya
 * kalimat TTS yang DIUBAH admin, dan ambang ronde beruntun. Default tetap di
 * kode. Pengaturan ini lokal di HP; hanya kalimat yang ikut dicadangkan online.
 */

interface SettingsState {
    overrides: TemplateOverrides;
    /** Berapa ronde berturut-turut jadi juru kunci sebelum TTS "beruntun" bunyi. */
    streakThreshold: number;
    /** Mengembalikan hasil validasi; yang tidak valid tidak disimpan. */
    setOverride: (key: TemplateKey, text: string) => TemplateValidation;
    resetOverride: (key: TemplateKey) => void;
    setStreakThreshold: (value: number) => StreakThresholdValidation;
    resetStreakThreshold: () => void;
    /** Kalimat dan ambang kembali ke bawaan. */
    resetAll: () => void;
}

export const SETTINGS_STORAGE_KEY = "jengkeng-settings";

/** Buang kunci tak dikenal dan nilai yang bukan string/tidak valid dari data tersimpan. */
function sanitizeOverrides(raw: unknown): TemplateOverrides {
    const clean: TemplateOverrides = {};
    if (typeof raw !== "object" || raw === null) return clean;

    for (const [key, value] of Object.entries(raw)) {
        if (!isTemplateKey(key) || typeof value !== "string") continue;
        const check = validateTemplate(key, value);
        if (check.ok) clean[key] = check.text;
    }
    return clean;
}

export const useSettingsStore = create<SettingsState>()(
    persist(
        (set, get) => ({
            overrides: {},
            streakThreshold: LAST_PLACE_STREAK_ROUNDS,

            setOverride: (key, text) => {
                const check = validateTemplate(key, text);
                if (check.ok) set({ overrides: { ...get().overrides, [key]: check.text } });
                return check;
            },

            resetOverride: (key) => {
                const next = { ...get().overrides };
                delete next[key];
                set({ overrides: next });
            },

            setStreakThreshold: (value) => {
                const check = validateStreakThreshold(value);
                if (check.ok) set({ streakThreshold: check.value });
                return check;
            },

            resetStreakThreshold: () => set({ streakThreshold: LAST_PLACE_STREAK_ROUNDS }),

            resetAll: () => set({ overrides: {}, streakThreshold: LAST_PLACE_STREAK_ROUNDS }),
        }),
        {
            name: SETTINGS_STORAGE_KEY,
            version: 1,
            partialize: (state) => ({
                overrides: state.overrides,
                streakThreshold: state.streakThreshold,
            }),
            // Data lama (hanya `overrides`) tetap terbaca: ambang yang tidak ada jatuh ke bawaan.
            merge: (persisted, current) => {
                const p = persisted as { overrides?: unknown; streakThreshold?: unknown } | undefined;
                return {
                    ...current,
                    overrides: sanitizeOverrides(p?.overrides),
                    streakThreshold: sanitizeStreakThreshold(p?.streakThreshold),
                };
            },
        }
    )
);

/** Kalimat yang berlaku sekarang (default + override). Aman dipanggil di luar React. */
export function getTemplates() {
    return resolveTemplates(useSettingsStore.getState().overrides);
}
