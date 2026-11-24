import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EFFECT_MS, emitRoundEffects, useEffectsStore } from "./useEffectsStore";
import { useSettingsStore } from "./useSettingsStore";

const gepuk = { type: "gepuk" as const, shooterId: "a", victimId: "b", points: 100 };
const ganti = { type: "jurukunci" as const, playerId: "b" };
const get = () => useEffectsStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  useSettingsStore.setState({ animations: true });
  get().clearAll();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useEffectsStore", () => {
  it("efek diputar lalu hilang sendiri setelah EFFECT_MS", () => {
    get().play([gepuk]);
    expect(get().active.map((e) => e.event)).toEqual([gepuk]);
    vi.advanceTimersByTime(EFFECT_MS + 100);
    expect(get().active).toEqual([]);
  });

  it("saklar Animasi mati: tidak ada efek", () => {
    useSettingsStore.setState({ animations: false });
    get().play([gepuk]);
    expect(get().active).toEqual([]);
  });

  it("reduced-motion: tidak ada efek", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: q.includes("reduce") }));
    get().play([gepuk]);
    expect(get().active).toEqual([]);
  });

  it("menunggu spin seri: ditahan, lalu diputar bersama hasil spin saat ditutup", () => {
    emitRoundEffects([gepuk], true);
    expect(get().active).toEqual([]);
    get().defer([ganti]);
    get().flush();
    expect(get().active.map((e) => e.event)).toEqual([gepuk, ganti]);
    expect(get().deferred).toEqual([]);
  });

  it("tanpa seri: langsung diputar", () => {
    emitRoundEffects([gepuk], false);
    expect(get().active).toHaveLength(1);
  });

  it("tiap efek punya id unik (animasi yang sama bisa diulang)", () => {
    get().play([gepuk]);
    get().play([gepuk]);
    const ids = get().active.map((e) => e.id);
    expect(new Set(ids).size).toBe(2);
  });
});
