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

/**
 * Pengaturan app, SENGAJA di store terpisah dari game dan riwayat.
 *
 * Key sendiri (`jengkeng-settings`) berarti game yang sedang berjalan dan
 * riwayat tidak tersentuh sama sekali oleh fitur ini. Yang disimpan hanya
 * kalimat TTS yang DIUBAH admin; default tetap di kode.
 */

interface SettingsState {
    overrides: TemplateOverrides;
    /** Mengembalikan hasil validasi; yang tidak valid tidak disimpan. */
    setOverride: (key: TemplateKey, text: string) => TemplateValidation;
    resetOverride: (key: TemplateKey) => void;
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

            resetAll: () => set({ overrides: {} }),
        }),
        {
            name: SETTINGS_STORAGE_KEY,
            version: 1,
            partialize: (state) => ({ overrides: state.overrides }),
            merge: (persisted, current) => ({
                ...current,
                overrides: sanitizeOverrides(
                    (persisted as { overrides?: unknown } | undefined)?.overrides
                ),
            }),
        }
    )
);

/** Kalimat yang berlaku sekarang (default + override). Aman dipanggil di luar React. */
export function getTemplates() {
    return resolveTemplates(useSettingsStore.getState().overrides);
}
