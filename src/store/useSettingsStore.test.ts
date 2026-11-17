import { beforeEach, describe, expect, it } from "vitest";
import { SETTINGS_STORAGE_KEY, getTemplates, useSettingsStore } from "./useSettingsStore";
import { DEFAULT_TEMPLATES } from "@/lib/speechTemplates";

const get = () => useSettingsStore.getState();

beforeEach(() => {
  get().resetAll();
  localStorage.removeItem(SETTINGS_STORAGE_KEY);
});

describe("useSettingsStore", () => {
  it("awalnya default", () => {
    expect(getTemplates()).toEqual(DEFAULT_TEMPLATES);
  });

  it("menyimpan override valid, menolak yang tidak valid tanpa mengubah apa pun", () => {
    expect(get().setOverride("roundHeader", "  Rekap   ronde. ").ok).toBe(true);
    expect(get().overrides.roundHeader).toBe("Rekap ronde.");
    expect(getTemplates().roundHeader).toBe("Rekap ronde.");

    const bad = get().setOverride("roundHeader", "{ngawur}");
    expect(bad.ok).toBe(false);
    expect(get().overrides.roundHeader).toBe("Rekap ronde.");
  });

  it("kosong disimpan sebagai bisu (bukan kembali ke default)", () => {
    get().setOverride("gapWarning", "");
    expect(get().overrides.gapWarning).toBe("");
    expect(getTemplates().gapWarning).toBe("");
  });

  it("reset satu dan reset semua", () => {
    get().setOverride("roundHeader", "A");
    get().setOverride("nyewu", "B");
    get().resetOverride("roundHeader");
    expect(getTemplates().roundHeader).toBe(DEFAULT_TEMPLATES.roundHeader);
    expect(getTemplates().nyewu).toBe("B");
    get().resetAll();
    expect(getTemplates()).toEqual(DEFAULT_TEMPLATES);
  });

  it("tersimpan di key sendiri dan tidak menyentuh key game/riwayat", () => {
    localStorage.setItem("jengkeng-score-storage", "GAME");
    localStorage.setItem("jengkeng-history", "HIST");
    get().setOverride("roundHeader", "A");
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) ?? "null");
    expect(saved.state.overrides.roundHeader).toBe("A");
    expect(saved.version).toBe(1);
    expect(localStorage.getItem("jengkeng-score-storage")).toBe("GAME");
    expect(localStorage.getItem("jengkeng-history")).toBe("HIST");
  });

  it("rehydrate membuang data rusak dan kunci tak dikenal", async () => {
    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        state: { overrides: { roundHeader: "Halo", scoreLine: "{kacau}", nyewu: 7, hantu: "x" } },
        version: 1,
      })
    );
    await useSettingsStore.persist.rehydrate();
    expect(get().overrides).toEqual({ roundHeader: "Halo" });
  });
});
