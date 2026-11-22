import { beforeEach, describe, expect, it } from "vitest";
import {
  ANNOUNCED_STORAGE_KEYS,
  LAST_PLACE_ALERT_MS,
  LAST_PLACE_STREAK_ROUNDS,
  dueRounds,
  dueStreakKey,
  readAnnounced,
  resetAnnouncedForTests,
  streakKey,
  writeAnnounced,
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
  consecutiveRounds: 1,
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

describe("penanda yang sudah diumumkan", () => {
  beforeEach(() => resetAnnouncedForTests());

  it("tersimpan di localStorage dan terbaca lagi (reload tidak mengulang)", () => {
    expect(readAnnounced("time")).toBeNull();
    writeAnnounced("time", "player-3@123");
    expect(localStorage.getItem(ANNOUNCED_STORAGE_KEYS.time)).toBe("player-3@123");
    expect(readAnnounced("time")).toBe("player-3@123");
  });

  it("dua alarm punya penanda sendiri-sendiri dan tidak saling menimpa", () => {
    writeAnnounced("time", "player-3@123");
    writeAnnounced("rounds", "player-3@123#7");
    expect(readAnnounced("time")).toBe("player-3@123");
    expect(readAnnounced("rounds")).toBe("player-3@123#7");
    expect(ANNOUNCED_STORAGE_KEYS.time).not.toBe(ANNOUNCED_STORAGE_KEYS.rounds);
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
      expect(() => writeAnnounced("rounds", "player-1@9#7")).not.toThrow();
      expect(readAnnounced("rounds")).toBe("player-1@9#7");
    } finally {
      Object.defineProperty(globalThis, "localStorage", { value: real, configurable: true });
    }
  });
});

describe("dueRounds (juru kunci beruntun)", () => {
  const streak = `player-3@${SINCE}`;
  const at = (n: number, over: Partial<AlertSnapshot> = {}) => snap({ consecutiveRounds: n, ...over });

  it("ambangnya 7", () => {
    expect(LAST_PLACE_STREAK_ROUNDS).toBe(7);
  });

  it("6 ronde: diam; ronde ke-7: bunyi dengan jumlah 7", () => {
    expect(dueRounds(at(6), null)).toBeNull();
    expect(dueRounds(at(7), null)).toEqual({ mark: `${streak}#7`, count: 7 });
  });

  it("ronde ke-8, ke-9, dst.: tiap ronde baru bunyi sekali dengan jumlah terkini", () => {
    const m7 = `${streak}#7`;
    expect(dueRounds(at(8), m7)).toEqual({ mark: `${streak}#8`, count: 8 });
    expect(dueRounds(at(9), `${streak}#8`)).toEqual({ mark: `${streak}#9`, count: 9 });
  });

  it("jumlah yang sama tidak bunyi dua kali (tik berikutnya, reload)", () => {
    expect(dueRounds(at(7), `${streak}#7`)).toBeNull();
    expect(dueRounds(at(8), `${streak}#8`)).toBeNull();
  });

  it("Salah Ngitung lalu input ulang: jumlah turun lalu naik lagi tidak mengulang", () => {
    const m8 = `${streak}#8`;
    expect(dueRounds(at(7), m8)).toBeNull(); // undo: 8 -> 7
    expect(dueRounds(at(8), m8)).toBeNull(); // input ulang: 7 -> 8
    expect(dueRounds(at(9), m8)).toEqual({ mark: `${streak}#9`, count: 9 }); // ronde baru sungguhan
  });

  it("rentetan baru dari orang yang sama (sempat lepas) boleh bunyi lagi di ke-7", () => {
    const later = SINCE + 90 * MIN;
    const s = at(7, { lastPlaceSinceTimestamp: later });
    expect(dueRounds(s, `${streak}#12`)).toEqual({ mark: `player-3@${later}#7`, count: 7 });
  });

  it("juru kunci ganti: rentetan baru, harus 7 lagi dari awal", () => {
    const s = at(3, { currentLastPlacePlayerId: "player-1", lastPlaceSinceTimestamp: SINCE + 5 * MIN });
    expect(dueRounds(s, `${streak}#9`)).toBeNull();
  });

  it("diam kalau game tidak aktif, tanpa ronde, spin menggantung, atau juru kunci belum ada", () => {
    expect(dueRounds(at(8, { gameStatus: "finished" }), null)).toBeNull();
    expect(dueRounds(at(8, { gameStatus: "idle" }), null)).toBeNull();
    expect(dueRounds(at(8, { roundCount: 0 }), null)).toBeNull();
    expect(dueRounds(at(8, { hasPendingTieBreak: true }), null)).toBeNull();
    expect(dueRounds(at(8, { currentLastPlacePlayerId: null }), null)).toBeNull();
    expect(dueRounds(at(8, { lastPlaceSinceTimestamp: null }), null)).toBeNull();
  });

  it("penanda rusak/asing diperlakukan seperti belum pernah diumumkan", () => {
    expect(dueRounds(at(7), "rusak")).toEqual({ mark: `${streak}#7`, count: 7 });
    expect(dueRounds(at(7), `${streak}#abc`)).toEqual({ mark: `${streak}#7`, count: 7 });
  });
});
