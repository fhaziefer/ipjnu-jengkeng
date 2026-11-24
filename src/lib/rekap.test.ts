import { describe, expect, it } from "vitest";
import { availableMonths, buildMonthlyRecap, monthKey, monthLabel } from "./rekap";
import type { GameRecord } from "./history";

const at = (y: number, m: number, d: number, h = 22) => new Date(y, m - 1, d, h).getTime();
function game(finishedAt: number, winner: number, loser: number, shoots: GameRecord["shoots"] = [], names = ["Ani", "Budi", "Cici"]): GameRecord {
  return {
    id: String(finishedAt),
    startedAt: finishedAt - 3_600_000,
    finishedAt,
    players: names.map((n, i) => ({ key: n.toLowerCase(), name: n, total: (i === winner ? 100 : i === loser ? -50 : 10) })),
    winnerKey: names[winner].toLowerCase(),
    loserKey: names[loser].toLowerCase(),
    rounds: [names.map((_, i) => (i === winner ? 100 : i === loser ? -50 : 10))],
    shoots,
    tieBreaks: 0,
  };
}

describe("bulan", () => {
  it("monthKey pakai waktu lokal; 31 Okt jam 23 tetap Oktober", () => {
    expect(monthKey(at(2026, 10, 31, 23))).toBe("2026-10");
    expect(monthKey(at(2026, 11, 1, 0))).toBe("2026-11");
  });

  it("label bulan berbahasa Indonesia", () => {
    expect(monthLabel("2026-11")).toBe("November 2026");
    expect(monthLabel("2027-01")).toBe("Januari 2027");
  });

  it("availableMonths: unik, terbaru dulu", () => {
    const games = [game(at(2026, 10, 3), 0, 2), game(at(2026, 11, 2), 0, 2), game(at(2026, 10, 9), 1, 2)];
    expect(availableMonths(games)).toEqual(["2026-11", "2026-10"]);
    expect(availableMonths([])).toEqual([]);
  });
});

describe("buildMonthlyRecap", () => {
  const games = [
    game(at(2026, 10, 30), 2, 0),
    game(at(2026, 11, 2), 0, 2, [{ round: 0, shooter: 1, victim: 2, points: 100 }]),
    game(at(2026, 11, 9), 0, 2),
    game(at(2026, 11, 16), 1, 2),
  ];

  it("hanya menghitung game di bulan itu", () => {
    const r = buildMonthlyRecap(games, "2026-11");
    expect(r.games).toBe(3);
    expect(r.rounds).toBe(3);
    expect(r.players).toBe(3);
    expect(r.shoots).toBe(1);
    expect(r.label).toBe("November 2026");
  });

  it("pemimpin bulan dan klasemen", () => {
    const r = buildMonthlyRecap(games, "2026-11");
    expect(r.leaders.find((l) => l.label.includes("Menang"))).toMatchObject({ names: ["Ani"], value: 2 });
    expect(r.leaders.find((l) => l.label.includes("Juru kunci"))).toMatchObject({ names: ["Cici"], value: 3 });
    expect(r.leaders.find((l) => l.label.includes("Gepuk"))).toMatchObject({ names: ["Budi"], value: 1 });
    expect(r.standings.map((s) => [s.name, s.wins, s.losses])).toEqual([
      ["Ani", 2, 0],
      ["Budi", 1, 0],
      ["Cici", 0, 3],
    ]);
  });

  it("bulan tanpa game: nol semua, tanpa error", () => {
    const r = buildMonthlyRecap(games, "2026-12");
    expect(r).toMatchObject({ games: 0, rounds: 0, leaders: [], standings: [], firstAt: null });
  });
});
