import { describe, expect, it } from "vitest";
import {
  buildGameRecord,
  computeStats,
  formatDuration,
  isValidGameRecord,
  mergeGames,
  parseHistoryFile,
  serializeHistory,
  suggestNames,
  type GameRecord,
} from "./history";

function game(
  id: string,
  opts: {
    names?: string[];
    rounds?: number[][];
    winner?: number;
    loser?: number;
    startedAt?: number;
    finishedAt?: number;
    shoots?: GameRecord["shoots"];
  } = {}
): GameRecord {
  const names = opts.names ?? ["Ani", "Budi", "Cici"];
  const rounds = opts.rounds ?? [names.map((_, i) => (i === 0 ? 10 : i === 1 ? 5 : 0))];
  const totals = names.map((_, p) => rounds.reduce((n, row) => n + row[p], 0));

  return {
    id,
    startedAt: opts.startedAt ?? 1000,
    finishedAt: opts.finishedAt ?? 1000 + Number(id) * 1000,
    players: names.map((name, i) => ({ key: name.toLowerCase(), name, total: totals[i] })),
    winnerKey: names[opts.winner ?? 0].toLowerCase(),
    loserKey: names[opts.loser ?? names.length - 1].toLowerCase(),
    rounds,
    shoots: opts.shoots ?? [],
    tieBreaks: 0,
  };
}

describe("buildGameRecord", () => {
  const players = [
    { id: "player-1", name: "Mas Bagong" },
    { id: "player-2", name: "Budi" },
    { id: "player-3", name: "Cici" },
  ];

  const score = (playerId: string, finalScore: number) => ({ playerId, baseScore: finalScore, finalScore });

  const state = {
    players,
    gameStartTime: 5000,
    currentLastPlacePlayerId: "player-3",
    rounds: [
      {
        roundId: "6000",
        scores: [score("player-1", 110), score("player-2", -90), score("player-3", 0)],
        tiedForLast: ["player-2"],
        resolvedLastPlaceId: "player-2",
      },
      {
        roundId: "7000",
        scores: [score("player-1", 0), score("player-2", 100), score("player-3", 5)],
        tiedForLast: ["player-3"],
        resolvedLastPlaceId: "player-3",
        tieBreak: { candidates: ["player-3"], results: { "player-3": 4 } },
      },
    ],
    shootRecords: [{ roundId: "6000", shooterId: "player-1", victimId: "player-2", penaltyPoints: 100 }],
  };

  it("meringkas game jadi angka mentah dengan urutan pemain tetap", () => {
    const r = buildGameRecord(state, 9000);
    expect(r).not.toBeNull();
    expect(r).toMatchObject({
      id: "5000",
      startedAt: 5000,
      finishedAt: 9000,
      winnerKey: "mas bagong",
      loserKey: "cici",
      tieBreaks: 1,
      rounds: [
        [110, -90, 0],
        [0, 100, 5],
      ],
      shoots: [{ round: 0, shooter: 0, victim: 1, points: 100 }],
    });
    expect(r!.players.map((p) => [p.key, p.total])).toEqual([
      ["mas bagong", 110],
      ["budi", 10],
      ["cici", 5],
    ]);
  });

  it("juru kunci diambil dari store, bukan dari posisi terakhir hasil sort", () => {
    // Budi dan Cici sama-sama terendah di total; hasil spin bilang Budi.
    const tied = {
      ...state,
      currentLastPlacePlayerId: "player-2",
      rounds: [{ ...state.rounds[0], scores: [score("player-1", 50), score("player-2", 0), score("player-3", 0)] }],
      shootRecords: [],
    };
    expect(buildGameRecord(tied, 9000)!.loserKey).toBe("budi");
  });

  it("tidak mencatat game tanpa ronde", () => {
    expect(buildGameRecord({ ...state, rounds: [], shootRecords: [] }, 9000)).toBeNull();
  });

  it("membuang gepuk yang merujuk ronde atau pemain yang sudah tidak ada", () => {
    const r = buildGameRecord(
      { ...state, shootRecords: [{ roundId: "tidak-ada", shooterId: "player-1", victimId: "player-2", penaltyPoints: 100 }] },
      9000
    );
    expect(r!.shoots).toEqual([]);
  });
});

describe("isValidGameRecord", () => {
  it("menerima record yang benar", () => {
    expect(isValidGameRecord(game("1"))).toBe(true);
  });

  it.each([
    ["bukan objek", null],
    ["id kosong", { ...game("1"), id: "" }],
    ["baris ronde panjangnya beda dengan jumlah pemain", { ...game("1"), rounds: [[1, 2]] }],
    ["skor bukan angka", { ...game("1"), rounds: [[1, 2, "x"]] }],
    ["winnerKey bukan pemain", { ...game("1"), winnerKey: "hantu" }],
    ["indeks gepuk di luar jangkauan", { ...game("1"), shoots: [{ round: 0, shooter: 0, victim: 9, points: 100 }] }],
    ["tanpa ronde", { ...game("1"), rounds: [] }],
    ["NaN", { ...game("1"), finishedAt: NaN }],
  ])("menolak: %s", (_label, value) => {
    expect(isValidGameRecord(value)).toBe(false);
  });
});

describe("mergeGames", () => {
  it("melewati id yang sudah ada dan mengurutkan kronologis", () => {
    const a = game("2");
    const b = game("1");
    const { games, added } = mergeGames([a], [b, { ...a, players: [] as never }]);
    expect(added).toBe(1);
    expect(games.map((g) => g.id)).toEqual(["1", "2"]);
    expect(games.find((g) => g.id === "2")).toBe(a); // yang lama tidak ditimpa
  });

  it("tidak menggandakan id yang kembar di dalam data masuk", () => {
    expect(mergeGames([], [game("1"), game("1")]).added).toBe(1);
  });
});

describe("export / import", () => {
  it("round-trip tanpa kehilangan data", () => {
    const games = [game("1"), game("2")];
    const parsed = parseHistoryFile(serializeHistory(games, 123));
    expect(parsed).toEqual({ ok: true, games, skipped: 0 });
  });

  it("melewati game rusak tapi tetap mengimpor yang benar", () => {
    const text = JSON.stringify({ app: "jengkeng-history", version: 1, exportedAt: 1, games: [game("1"), { id: "x" }] });
    expect(parseHistoryFile(text)).toMatchObject({ ok: true, skipped: 1 });
  });

  it.each([
    ["bukan JSON", "{ rusak"],
    ["berkas aplikasi lain", JSON.stringify({ app: "lain", version: 1, games: [] })],
    ["versi lebih baru", JSON.stringify({ app: "jengkeng-history", version: 99, games: [] })],
    ["games bukan array", JSON.stringify({ app: "jengkeng-history", version: 1, games: {} })],
    ["semua game rusak", JSON.stringify({ app: "jengkeng-history", version: 1, games: [{ a: 1 }] })],
  ])("menolak: %s", (_label, text) => {
    expect(parseHistoryFile(text).ok).toBe(false);
  });

  it("berkas tanpa game sama sekali masih valid (kosong)", () => {
    expect(parseHistoryFile(JSON.stringify({ app: "jengkeng-history", version: 1, games: [] }))).toEqual({
      ok: true,
      games: [],
      skipped: 0,
    });
  });
});

describe("computeStats", () => {
  it("menghitung menang, juru kunci, dan streak juru kunci", () => {
    const games = [
      game("1", { winner: 0, loser: 2 }),
      game("2", { winner: 1, loser: 2 }),
      game("3", { winner: 0, loser: 2 }),
      game("4", { winner: 0, loser: 1 }),
    ];
    const { players, overall } = computeStats(games);
    const cici = players.find((p) => p.key === "cici")!;
    const budi = players.find((p) => p.key === "budi")!;
    const ani = players.find((p) => p.key === "ani")!;

    expect(overall.games).toBe(4);
    expect(ani.wins).toBe(3);
    expect(cici).toMatchObject({ losses: 3, loserStreakBest: 3, loserStreakNow: 0 });
    expect(budi).toMatchObject({ losses: 1, loserStreakNow: 1, loserStreakBest: 1 });
  });

  it("streak hanya menghitung game yang diikuti pemain itu", () => {
    const games = [
      game("1", { names: ["Ani", "Budi"], loser: 1 }),
      game("2", { names: ["Ani", "Cici"], loser: 1 }), // Budi absen
      game("3", { names: ["Ani", "Budi"], loser: 1 }),
    ];
    const budi = computeStats(games).players.find((p) => p.key === "budi")!;
    expect(budi.loserStreakBest).toBe(2);
    expect(budi.loserStreakNow).toBe(2);
  });

  it("mendeteksi nyewu hanya kalau skor berjalan pernah >= 1000", () => {
    const g = game("1", {
      names: ["Ani", "Budi"],
      rounds: [
        [600, 0],
        [500, 0],
        [-700, 0], // total akhir Ani cuma 400, tapi sempat 1100
      ],
    });
    const stats = computeStats([g]).players;
    expect(stats.find((p) => p.key === "ani")!.nyewu).toBe(1);
    expect(stats.find((p) => p.key === "budi")!.nyewu).toBe(0);
  });

  it("menghitung gepuk dikasih dan diterima", () => {
    const g = game("1", {
      shoots: [
        { round: 0, shooter: 0, victim: 1, points: 100 },
        { round: 0, shooter: 0, victim: 2, points: 200 },
      ],
    });
    const stats = computeStats([g]).players;
    expect(stats.find((p) => p.key === "ani")).toMatchObject({ shotsGiven: 2, shotsTaken: 0 });
    expect(stats.find((p) => p.key === "budi")).toMatchObject({ shotsGiven: 0, shotsTaken: 1 });
  });

  it("memakai nama terbaru dan menangani riwayat kosong", () => {
    const old = game("1", { names: ["bagong", "Budi"] });
    const recent = game("2", { names: ["Bagong", "Budi"] });
    expect(computeStats([old, recent]).players.find((p) => p.key === "bagong")!.name).toBe("Bagong");
    expect(computeStats([])).toEqual({
      overall: { games: 0, rounds: 0, avgDurationMs: 0, longestDurationMs: 0, mostRounds: 0 },
      players: [],
    });
  });

  it("durasi rata-rata dan terpanjang", () => {
    const games = [
      game("1", { startedAt: 0, finishedAt: 60_000 }),
      game("2", { startedAt: 0, finishedAt: 180_000 }),
    ];
    const { overall } = computeStats(games);
    expect(overall.avgDurationMs).toBe(120_000);
    expect(overall.longestDurationMs).toBe(180_000);
  });
});

describe("suggestNames", () => {
  it("paling sering dipakai dulu, nama tidak kembar meski beda huruf besar", () => {
    const games = [
      game("1", { names: ["Ani", "Budi"] }),
      game("2", { names: ["ani", "Cici"] }),
      game("3", { names: ["Ani", "Budi"] }),
    ];
    expect(suggestNames(games)).toEqual(["Ani", "Budi", "Cici"]);
  });

  it("menghormati limit", () => {
    expect(suggestNames([game("1")], 2)).toHaveLength(2);
  });
});

describe("formatDuration", () => {
  it("format menit dan jam", () => {
    expect(formatDuration(5 * 60_000)).toBe("5 menit");
    expect(formatDuration(65 * 60_000)).toBe("1 jam 5 menit");
    expect(formatDuration(-1)).toBe("0 menit");
  });
});
