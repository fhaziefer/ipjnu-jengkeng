import { describe, expect, it } from "vitest";
import { MIN_GAMES_FOR_RATE, computeHallOfFame } from "./hallOfFame";
import type { GameRecord } from "./history";

function game(
  id: number,
  o: {
    names?: string[];
    rounds?: number[][];
    winner: number;
    loser: number;
    shoots?: GameRecord["shoots"];
    startedAt?: number;
  }
): GameRecord {
  const names = o.names ?? ["Ani", "Budi", "Cici"];
  const rounds = o.rounds ?? [names.map(() => 10)];
  const totals = names.map((_, p) => rounds.reduce((n, r) => n + r[p], 0));
  return {
    id: String(id),
    startedAt: o.startedAt ?? id * 1000,
    finishedAt: id * 1000 + 600,
    players: names.map((n, i) => ({ key: n.toLowerCase(), name: n, total: totals[i] })),
    winnerKey: names[o.winner].toLowerCase(),
    loserKey: names[o.loser].toLowerCase(),
    rounds,
    shoots: o.shoots ?? [],
    tieBreaks: 0,
  };
}

const rec = (h: ReturnType<typeof computeHallOfFame>, id: string) =>
  h.records.find((r) => r.id === id);

describe("computeHallOfFame", () => {
  it("data kosong: statistik nol, tanpa rekor, tanpa error", () => {
    const h = computeHallOfFame([]);
    expect(h.records).toEqual([]);
    expect(h.global).toMatchObject({
      games: 0,
      rounds: 0,
      players: 0,
      shoots: 0,
      nyewuGames: 0,
      avgDurationMs: 0,
      firstAt: null,
      lastAt: null,
    });
  });

  it("statistik global: jumlah game, ronde, pemain unik, gepuk, rentang waktu", () => {
    const h = computeHallOfFame([
      game(1, {
        winner: 0,
        loser: 2,
        rounds: [[1, 2, 3], [4, 5, 6]],
        shoots: [{ round: 0, shooter: 0, victim: 1, points: 10 }],
      }),
      game(2, { names: ["Ani", "Dedi"], winner: 1, loser: 0 }),
    ]);
    expect(h.global.games).toBe(2);
    expect(h.global.rounds).toBe(3);
    expect(h.global.players).toBe(4);
    expect(h.global.shoots).toBe(1);
    expect(h.global.mostRounds).toBe(2);
    expect(h.global.firstAt).toBe(1600);
    expect(h.global.lastAt).toBe(2600);
  });

  it("nyewuGames menghitung game, bukan pemain", () => {
    const h = computeHallOfFame([
      game(1, { winner: 0, loser: 1, rounds: [[600, 600, 0], [500, 500, 0]] }), // dua pemain nyewu
      game(2, { winner: 0, loser: 1 }),
    ]);
    expect(h.global.nyewuGames).toBe(1);
  });

  it("rekor menang terbanyak; seri memuat semua pemegang", () => {
    const h = computeHallOfFame([
      game(1, { winner: 0, loser: 2 }),
      game(2, { winner: 1, loser: 2 }),
      game(3, { winner: 0, loser: 2 }),
      game(4, { winner: 1, loser: 2 }),
    ]);
    const r = rec(h, "mostWins")!;
    expect(r.value).toBe(2);
    expect(r.holders.map((x) => x.name).sort()).toEqual(["Ani", "Budi"]);
  });

  it("rekor bernilai nol tidak ditampilkan", () => {
    const h = computeHallOfFame([game(1, { winner: 0, loser: 2 })]);
    expect(rec(h, "mostNyewu")).toBeUndefined();
    expect(rec(h, "mostShotsGiven")).toBeUndefined();
    expect(rec(h, "mostWins")?.value).toBe(1);
  });

  it("rentetan menang: dihitung urut waktu, putus kalau kalah, game urutan acak tetap benar", () => {
    const games = [
      game(3, { winner: 0, loser: 2 }),
      game(1, { winner: 0, loser: 2 }),
      game(2, { winner: 0, loser: 2 }),
      game(4, { winner: 1, loser: 2 }),
      game(5, { winner: 0, loser: 2 }),
    ];
    const r = rec(computeHallOfFame(games), "longestWinStreak")!;
    expect(r.value).toBe(3);
    expect(r.holders).toEqual([{ key: "ani", name: "Ani" }]);
  });

  it("rentetan menang tidak putus oleh game yang pemain itu tidak ikut", () => {
    const games = [
      game(1, { winner: 0, loser: 1 }),
      game(2, { names: ["Budi", "Cici"], winner: 0, loser: 1 }),
      game(3, { winner: 0, loser: 1 }),
    ];
    expect(rec(computeHallOfFame(games), "longestWinStreak")?.value).toBe(2);
  });

  it("persentase menang butuh minimal game; pemain 1 game 1 menang tidak merebut rekor", () => {
    const games = [
      game(1, { names: ["Eko", "Fani"], winner: 0, loser: 1 }),
      ...Array.from({ length: MIN_GAMES_FOR_RATE }, (_, i) =>
        game(10 + i, { winner: i === 0 ? 0 : 1, loser: 2 })
      ),
    ];
    const r = rec(computeHallOfFame(games), "bestWinRate")!;
    expect(r.holders.map((x) => x.name)).toEqual(["Budi"]);
    expect(r.value).toBe(67);
    expect(r.games).toBe(MIN_GAMES_FOR_RATE);
  });

  it("tanpa pemain yang cukup game, rekor persentase tidak ada", () => {
    expect(rec(computeHallOfFame([game(1, { winner: 0, loser: 2 })]), "bestWinRate")).toBeUndefined();
  });

  it("juru kunci terbanyak, rentetan juru kunci, gepuk, dan total tertinggi/terendah", () => {
    const h = computeHallOfFame([
      game(1, { winner: 0, loser: 2, rounds: [[50, 20, -5]], shoots: [{ round: 0, shooter: 1, victim: 2, points: 5 }] }),
      game(2, { winner: 0, loser: 2, rounds: [[30, 10, 0]], shoots: [{ round: 0, shooter: 1, victim: 2, points: 5 }] }),
    ]);
    expect(rec(h, "mostLosses")).toMatchObject({ value: 2, holders: [{ name: "Cici" }] });
    expect(rec(h, "longestLoserStreak")?.value).toBe(2);
    expect(rec(h, "mostShotsGiven")).toMatchObject({ value: 2, holders: [{ name: "Budi" }] });
    expect(rec(h, "mostShotsTaken")).toMatchObject({ value: 2, holders: [{ name: "Cici" }] });
    expect(rec(h, "highestTotal")?.value).toBe(50);
    expect(rec(h, "lowestTotal")).toMatchObject({ value: -5, holders: [{ name: "Cici" }] });
  });
});
