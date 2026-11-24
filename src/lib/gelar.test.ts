import { describe, expect, it } from "vitest";
import { computeGelar, gelarOf } from "./gelar";
import { computeRivalries, favoriteVictims } from "./rivalitas";
import type { GameRecord } from "./history";

function game(
  id: number,
  o: { names?: string[]; rounds?: number[][]; winner: number; loser: number; shoots?: GameRecord["shoots"] }
): GameRecord {
  const names = o.names ?? ["Ani", "Budi", "Cici"];
  const rounds = o.rounds ?? [names.map(() => 10)];
  return {
    id: String(id),
    startedAt: id * 1000,
    finishedAt: id * 1000 + 600,
    players: names.map((n, i) => ({ key: n.toLowerCase(), name: n, total: rounds.reduce((s, r) => s + r[i], 0) })),
    winnerKey: names[o.winner].toLowerCase(),
    loserKey: names[o.loser].toLowerCase(),
    rounds,
    shoots: o.shoots ?? [],
    tieBreaks: 0,
  };
}
const shoot = (shooter: number, victim: number, points = 100) => ({ round: 0, shooter, victim, points });

describe("computeGelar", () => {
  it("pemain dengan kurang dari 3 game tidak dapat gelar", () => {
    const g = computeGelar([game(1, { winner: 0, loser: 2 }), game(2, { winner: 0, loser: 2 })]);
    expect(g).toEqual([]);
  });

  it("gelar diberikan ke pemegang nilai tertinggi; nilai nol tidak dapat gelar", () => {
    const games = [
      game(1, { winner: 0, loser: 2, shoots: [shoot(1, 2)] }),
      game(2, { winner: 0, loser: 2, shoots: [shoot(1, 2)] }),
      game(3, { winner: 1, loser: 2 }),
    ];
    const g = computeGelar(games);
    const by = Object.fromEntries(g.map((x) => [x.id, x]));
    expect(by.rajaMenang).toMatchObject({ value: 2, holders: [{ name: "Ani" }] });
    expect(by.juruKunciAbadi).toMatchObject({ value: 3, holders: [{ name: "Cici" }] });
    expect(by.rajaGepuk).toMatchObject({ value: 2, holders: [{ name: "Budi" }] });
    expect(by.langgananDigepuk).toMatchObject({ value: 2, holders: [{ name: "Cici" }] });
    expect(by.jawaraNyewu).toBeUndefined();
  });

  it("seri: semua pemegang dapat gelar; satu pemain bisa punya beberapa gelar", () => {
    const games = [
      game(1, { winner: 0, loser: 2 }),
      game(2, { winner: 1, loser: 2 }),
      game(3, { winner: 0, loser: 2, rounds: [[1000, 0, 0]] }),
      game(4, { winner: 1, loser: 2 }),
    ];
    const g = computeGelar(games);
    expect(g.find((x) => x.id === "rajaMenang")?.holders.map((h) => h.name).sort()).toEqual(["Ani", "Budi"]);
    expect(gelarOf(g, "ani").map((x) => x.id)).toEqual(["rajaMenang", "jawaraNyewu"]);
    expect(gelarOf(g, "dodo")).toEqual([]);
  });

  it("riwayat kosong: tanpa gelar, tanpa error", () => {
    expect(computeGelar([])).toEqual([]);
  });
});

describe("computeRivalries / favoriteVictims", () => {
  it("menghitung pasangan penggepuk -> korban lintas game, urut sering lalu poin", () => {
    const r = computeRivalries([
      game(1, { winner: 0, loser: 2, shoots: [shoot(0, 1, 100), shoot(0, 2, 500)] }),
      game(2, { winner: 0, loser: 2, shoots: [shoot(0, 1, 200), shoot(2, 0, 100)] }),
    ]);
    expect(r.map((x) => [x.shooterName, x.victimName, x.count, x.points])).toEqual([
      ["Ani", "Budi", 2, 300],
      ["Ani", "Cici", 1, 500],
      ["Cici", "Ani", 1, 100],
    ]);
  });

  it("indeks pemain dibaca per game (urutan pemain bisa beda tiap game)", () => {
    const r = computeRivalries([
      game(1, { names: ["Budi", "Ani"], winner: 0, loser: 1, shoots: [shoot(1, 0)] }),
      game(2, { names: ["Ani", "Budi"], winner: 0, loser: 1, shoots: [shoot(0, 1)] }),
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ shooterName: "Ani", victimName: "Budi", count: 2 });
  });

  it("indeks rusak dan gepuk diri sendiri diabaikan", () => {
    const r = computeRivalries([game(1, { winner: 0, loser: 2, shoots: [shoot(0, 9), shoot(1, 1)] })]);
    expect(r).toEqual([]);
  });

  it("korban favorit: satu baris per penggepuk, yang teratas", () => {
    const r = computeRivalries([
      game(1, { winner: 0, loser: 2, shoots: [shoot(0, 1), shoot(0, 1), shoot(0, 2), shoot(2, 0)] }),
    ]);
    expect(favoriteVictims(r).map((x) => `${x.shooterName}>${x.victimName}`)).toEqual(["Ani>Budi", "Cici>Ani"]);
  });

  it("nama terakhir yang dipakai yang ditampilkan", () => {
    const r = computeRivalries([
      game(1, { names: ["ani", "Budi", "Cici"], winner: 0, loser: 2, shoots: [shoot(0, 1)] }),
      game(2, { names: ["Ani", "Budi", "Cici"], winner: 0, loser: 2, shoots: [shoot(0, 1)] }),
    ]);
    expect(r[0].shooterName).toBe("Ani");
  });
});
