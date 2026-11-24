import { describe, expect, it } from "vitest";
import { detectRoundEvents, detectTieEvents, type EventSnapshot } from "./gameEvents";

const players = [{ id: "a" }, { id: "b" }, { id: "c" }];
const round = (id: number, a: number, b: number, c: number) => ({
  roundId: String(id),
  scores: [
    { playerId: "a", baseScore: a, finalScore: a },
    { playerId: "b", baseScore: b, finalScore: b },
    { playerId: "c", baseScore: c, finalScore: c },
  ],
});
const snap = (o: Partial<EventSnapshot>): EventSnapshot => ({
  players,
  rounds: [],
  shootRecords: [],
  currentLastPlacePlayerId: null,
  pendingTieBreak: null,
  ...o,
});

describe("detectRoundEvents", () => {
  const r1 = round(1, 50, 10, -20);

  it("gepuk dari ronde baru saja (gepuk ronde lama tidak diulang)", () => {
    const before = snap({ rounds: [r1], shootRecords: [{ roundId: "1", shooterId: "a", victimId: "b", penaltyPoints: 50 }], currentLastPlacePlayerId: "c" });
    const after = snap({
      rounds: [r1, round(2, 100, -100, 0)],
      shootRecords: [...before.shootRecords, { roundId: "2", shooterId: "a", victimId: "b", penaltyPoints: 100 }],
      currentLastPlacePlayerId: "b",
    });
    const ev = detectRoundEvents(before, after);
    expect(ev.filter((e) => e.type === "gepuk")).toEqual([{ type: "gepuk", shooterId: "a", victimId: "b", points: 100 }]);
  });

  it("ganti juru kunci hanya kalau sebelumnya sudah ada juru kunci", () => {
    expect(detectRoundEvents(snap({}), snap({ rounds: [r1], currentLastPlacePlayerId: "c" }))).toEqual([]);
    const before = snap({ rounds: [r1], currentLastPlacePlayerId: "c" });
    const after = snap({ rounds: [r1, round(2, 0, -40, 30)], currentLastPlacePlayerId: "b" });
    expect(detectRoundEvents(before, after)).toContainEqual({ type: "jurukunci", playerId: "b" });
  });

  it("juru kunci tetap: tidak ada efek ganti", () => {
    const before = snap({ rounds: [r1], currentLastPlacePlayerId: "c" });
    const after = snap({ rounds: [r1, round(2, 1, 1, 1)], currentLastPlacePlayerId: "c" });
    expect(detectRoundEvents(before, after)).toEqual([]);
  });

  it("seri menggantung: ganti juru kunci ditunda ke detectTieEvents", () => {
    const before = snap({ rounds: [r1], currentLastPlacePlayerId: "c" });
    const after = snap({ rounds: [r1, round(2, 0, -30, 0)], currentLastPlacePlayerId: "c", pendingTieBreak: { roundId: "2" } });
    expect(detectRoundEvents(before, after).some((e) => e.type === "jurukunci")).toBe(false);
  });

  it("nyewu: menyeberang +1000 atau -1000 sekali, tidak berulang kalau sudah di atas", () => {
    const before = snap({ rounds: [round(1, 900, -900, 0)], currentLastPlacePlayerId: "b" });
    const after = snap({ rounds: [...before.rounds, round(2, 100, -100, 0)], currentLastPlacePlayerId: "b" });
    expect(detectRoundEvents(before, after)).toEqual([
      { type: "nyewu", playerId: "a", tone: "god" },
      { type: "nyewu", playerId: "b", tone: "hell" },
    ]);
    const later = snap({ rounds: [...after.rounds, round(3, 50, -50, 0)], currentLastPlacePlayerId: "b" });
    expect(detectRoundEvents(after, later)).toEqual([]);
  });

  it("comeback: juru kunci sebelum ronde jadi pemimpin tunggal", () => {
    const before = snap({ rounds: [r1], currentLastPlacePlayerId: "c" });
    const after = snap({ rounds: [r1, round(2, 0, 0, 200)], currentLastPlacePlayerId: "b" });
    expect(detectRoundEvents(before, after)).toContainEqual({ type: "comeback", playerId: "c" });
  });

  it("comeback tidak berlaku kalau hanya seri di puncak", () => {
    const before = snap({ rounds: [r1], currentLastPlacePlayerId: "c" });
    const after = snap({ rounds: [r1, round(2, 0, 0, 70)], currentLastPlacePlayerId: "b" }); // a=50, c=50
    expect(detectRoundEvents(before, after).some((e) => e.type === "comeback")).toBe(false);
  });

  it("edit (jumlah ronde tidak bertambah) dan undo tidak memicu apa pun", () => {
    const before = snap({ rounds: [r1, round(2, 900, 0, 0)], currentLastPlacePlayerId: "c" });
    const edited = snap({ rounds: [r1, round(3, 2000, -2000, 0)], currentLastPlacePlayerId: "b" });
    expect(detectRoundEvents(before, edited)).toEqual([]);
    expect(detectRoundEvents(before, snap({ rounds: [r1], currentLastPlacePlayerId: "c" }))).toEqual([]);
  });
});

describe("detectTieEvents", () => {
  it("hanya kalau juru kunci benar-benar berganti", () => {
    expect(detectTieEvents("c", "b")).toEqual([{ type: "jurukunci", playerId: "b" }]);
    expect(detectTieEvents("c", "c")).toEqual([]);
    expect(detectTieEvents(null, "b")).toEqual([]);
  });
});
