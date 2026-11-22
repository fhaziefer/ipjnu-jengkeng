import { beforeEach, describe, expect, it } from "vitest";
import {
  ANNOUNCED_STORAGE_KEY,
  LAST_PLACE_ALERT_MS,
  dueStreakKey,
  readAnnouncedKey,
  resetAnnouncedKeyForTests,
  streakKey,
  writeAnnouncedKey,
  type AlertSnapshot,
} from "./lastPlaceAlert";

const MIN = 60_000;
const SINCE = 1_700_000_000_000;

const snap = (over: Partial<AlertSnapshot> = {}): AlertSnapshot => ({
  gameStatus: "active",
  roundCount: 4,
  currentLastPlacePlayerId: "player-3",
  lastPlaceSinceTimestamp: SINCE,
  hasPendingTieBreak: false,
  ...over,
});

describe("dueStreakKey", () => {
  it("belum 30 menit: tidak bunyi", () => {
    expect(dueStreakKey(snap(), SINCE + 29 * MIN + 59_999, null)).toBeNull();
  });

  it("tepat 30 menit: bunyi", () => {
    expect(LAST_PLACE_ALERT_MS).toBe(30 * MIN);
    expect(dueStreakKey(snap(), SINCE + 30 * MIN, null)).toBe(`player-3@${SINCE}`);
  });

  it("lebih dari 30 menit (mis. app baru dibuka lagi): tetap bunyi sekali", () => {
    expect(dueStreakKey(snap(), SINCE + 95 * MIN, null)).toBe(`player-3@${SINCE}`);
  });

  it("rentetan yang sama tidak bunyi dua kali", () => {
    const key = `player-3@${SINCE}`;
    expect(dueStreakKey(snap(), SINCE + 31 * MIN, key)).toBeNull();
    expect(dueStreakKey(snap(), SINCE + 300 * MIN, key)).toBeNull();
  });

  it("juru kunci ganti: rentetan baru, hitungan 30 menit mulai dari awal", () => {
    const old = `player-3@${SINCE}`;
    const changedAt = SINCE + 40 * MIN;
    const s = snap({ currentLastPlacePlayerId: "player-1", lastPlaceSinceTimestamp: changedAt });

    expect(dueStreakKey(s, changedAt + 10 * MIN, old)).toBeNull();
    expect(dueStreakKey(s, changedAt + 30 * MIN, old)).toBe(`player-1@${changedAt}`);
  });

  it("orang yang sama kembali jadi juru kunci sesudah sempat lepas: boleh bunyi lagi", () => {
    const first = `player-3@${SINCE}`;
    const backAt = SINCE + 90 * MIN;
    const s = snap({ lastPlaceSinceTimestamp: backAt });
    expect(dueStreakKey(s, backAt + 30 * MIN, first)).toBe(`player-3@${backAt}`);
  });

  it("tanpa ronde, tanpa juru kunci, atau spin menggantung: diam", () => {
    const late = SINCE + 60 * MIN;
    expect(dueStreakKey(snap({ roundCount: 0 }), late, null)).toBeNull();
    expect(dueStreakKey(snap({ currentLastPlacePlayerId: null }), late, null)).toBeNull();
    expect(dueStreakKey(snap({ lastPlaceSinceTimestamp: null }), late, null)).toBeNull();
    expect(dueStreakKey(snap({ hasPendingTieBreak: true }), late, null)).toBeNull();
  });

  it("hanya saat game aktif", () => {
    const late = SINCE + 60 * MIN;
    expect(dueStreakKey(snap({ gameStatus: "idle" }), late, null)).toBeNull();
    expect(dueStreakKey(snap({ gameStatus: "finished" }), late, null)).toBeNull();
  });

  it("jam mundur (since di masa depan): diam, tidak error", () => {
    expect(dueStreakKey(snap(), SINCE - 5 * MIN, null)).toBeNull();
  });
});

describe("streakKey", () => {
  it("null kalau datanya belum lengkap", () => {
    expect(streakKey(snap({ currentLastPlacePlayerId: null }))).toBeNull();
    expect(streakKey(snap({ lastPlaceSinceTimestamp: null }))).toBeNull();
  });
});

describe("kunci yang sudah diumumkan", () => {
  beforeEach(() => resetAnnouncedKeyForTests());

  it("tersimpan di localStorage dan terbaca lagi (reload tidak mengulang)", () => {
    expect(readAnnouncedKey()).toBeNull();
    writeAnnouncedKey("player-3@123");
    expect(localStorage.getItem(ANNOUNCED_STORAGE_KEY)).toBe("player-3@123");
    expect(readAnnouncedKey()).toBe("player-3@123");
  });

  it("storage rusak/diblokir: tidak melempar, jatuh ke memori", () => {
    const real = globalThis.localStorage;
    Object.defineProperty(globalThis, "localStorage", {
      value: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {},
      },
      configurable: true,
    });
    try {
      expect(() => writeAnnouncedKey("player-1@9")).not.toThrow();
      expect(readAnnouncedKey()).toBe("player-1@9");
    } finally {
      Object.defineProperty(globalThis, "localStorage", { value: real, configurable: true });
    }
  });
});
