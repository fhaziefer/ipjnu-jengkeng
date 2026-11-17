import { describe, expect, it } from "vitest";
import type { Player, Round, ShootRecord } from "@/store/useGameStore";
import { buildRoundAnnouncement } from "./announcement";
import { DEFAULT_TEMPLATES, resolveTemplates } from "./speechTemplates";
import { legacyBuildRoundAnnouncement } from "@/test/legacyAnnouncement";

const NAMES = ["Mas Bagong", "Budi", "Cici", "Dodo"];

function mkPlayers(n: number): Player[] {
  return NAMES.slice(0, n).map((name, i) => ({ id: `p${i}`, name }));
}

interface Spec {
  scores: number[][];
  shoots?: Array<{ round: number; shooter: number; victim: number; points: number }>;
  tie?: { round: number; candidates: number[]; results: number[]; loser: number };
}

function mkGame(players: Player[], spec: Spec) {
  const rounds: Round[] = spec.scores.map((row, r) => {
    const totals = players.map((_, i) => spec.scores.slice(0, r + 1).reduce((s, x) => s + x[i], 0));
    const min = Math.min(...totals);
    const tied = players.filter((_, i) => totals[i] === min).map((p) => p.id);
    const tie = spec.tie && spec.tie.round === r ? spec.tie : undefined;
    return {
      roundId: String(1000 + r),
      scores: players.map((p, i) => ({ playerId: p.id, baseScore: row[i], finalScore: row[i] })),
      tiedForLast: tied,
      resolvedLastPlaceId: tie ? players[tie.loser].id : tied[tied.length - 1],
      ...(tie
        ? {
            tieBreak: {
              candidates: tie.candidates.map((i) => players[i].id),
              results: Object.fromEntries(tie.candidates.map((c, k) => [players[c].id, tie.results[k]])),
            },
          }
        : {}),
    };
  });
  const shoots: ShootRecord[] = (spec.shoots ?? []).map((s) => ({
    roundId: String(1000 + s.round),
    shooterId: players[s.shooter].id,
    victimId: players[s.victim].id,
    penaltyPoints: s.points,
  }));
  return { rounds, shoots };
}

const SPECS: Array<[string, number, Spec]> = [
  ["dua pemain, skor biasa", 2, { scores: [[50, 10], [20, -30]] }],
  ["empat pemain, juru kunci berganti", 4, { scores: [[10, 20, 30, 5], [40, 10, 0, 50]] }],
  ["gepuk 100", 3, { scores: [[10, 20, 30], [5, 5, 5]], shoots: [{ round: 1, shooter: 0, victim: 1, points: 100 }] }],
  ["gepuk 200", 3, { scores: [[10, 20, 30]], shoots: [{ round: 0, shooter: 2, victim: 0, points: 200 }] }],
  ["gepuk 300", 3, { scores: [[10, 20, 30]], shoots: [{ round: 0, shooter: 1, victim: 2, points: 300 }] }],
  ["gepuk 500", 3, { scores: [[10, 20, 30]], shoots: [{ round: 0, shooter: 1, victim: 2, points: 500 }] }],
  ["gepuk 1000", 3, { scores: [[10, 20, 30]], shoots: [{ round: 0, shooter: 0, victim: 1, points: 1000 }] }],
  ["gepuk nilai di luar tabel", 3, { scores: [[10, 20, 30]], shoots: [{ round: 0, shooter: 0, victim: 1, points: 750 }] }],
  ["nyewu satu orang", 3, { scores: [[900, 10, 10], [150, 5, 5]] }],
  ["nyewu dua orang sekaligus", 4, { scores: [[990, 1005, 10, 10], [20, 20, 5, 5]] }],
  ["jarak 500 atau lebih", 3, { scores: [[600, 100, 10]] }],
  ["skor minus", 3, { scores: [[-50, -10, -90]] }],
  ["seri, hasil spin", 4, { scores: [[50, 50, 10, 10], [5, 5, 5, 5]], tie: { round: 0, candidates: [2, 3], results: [41, 12], loser: 3 } }],
  ["seri + gepuk + nyewu", 3, {
    scores: [[1005, 10, 10]],
    shoots: [{ round: 0, shooter: 0, victim: 2, points: 500 }],
    tie: { round: 0, candidates: [1, 2], results: [7, 30], loser: 2 },
  }],
];

describe("buildRoundAnnouncement tanpa override", () => {
  for (const [label, n, spec] of SPECS) {
    it(`sama persis dengan versi sebelum template: ${label}`, () => {
      const players = mkPlayers(n);
      const { rounds, shoots } = mkGame(players, spec);
      for (let i = 0; i < rounds.length; i++) {
        expect(buildRoundAnnouncement(players, rounds, shoots, i)).toBe(
          legacyBuildRoundAnnouncement(players, rounds, shoots, i)
        );
        expect(buildRoundAnnouncement(players, rounds, shoots, i, resolveTemplates({}))).toBe(
          legacyBuildRoundAnnouncement(players, rounds, shoots, i)
        );
      }
    });
  }

  it("ronde yang tidak ada = string kosong, seperti dulu", () => {
    const players = mkPlayers(2);
    expect(buildRoundAnnouncement(players, [], [], 0)).toBe("");
  });
});

describe("buildRoundAnnouncement dengan override", () => {
  const players = mkPlayers(3);
  const { rounds, shoots } = mkGame(players, {
    scores: [[1005, 10, 10]],
    shoots: [{ round: 0, shooter: 0, victim: 2, points: 500 }],
  });

  it("memakai kalimat baru dan mengisi placeholder", () => {
    const t = resolveTemplates({
      roundHeader: "Rekap!",
      scoreLine: "{nama} punya {skor} biji ...",
      gepuk: "Awas! {penembak} nembak {korban} {poin} poin, {psywar}",
      psywar500: "mampus",
      nyewu: "{nama} tembus seribu ...",
    });
    const text = buildRoundAnnouncement(players, rounds, shoots, 0, t);
    expect(text).toContain("Rekap! Mas Bagong punya 1005 biji ... Budi punya 10 biji ...");
    expect(text).toContain("Awas! Mas Bagong nembak Cici 500 poin, mampus");
    expect(text).toContain("Mas Bagong tembus seribu ...");
    expect(text).not.toContain("Biji sak iki");
  });

  it("bagian yang dikosongkan dibisukan, tanpa spasi ganda", () => {
    const t = resolveTemplates({ roundHeader: "", gepuk: "", nyewu: "", gapWarning: "" });
    const text = buildRoundAnnouncement(players, rounds, shoots, 0, t);
    expect(text).toBe("Mas Bagong, 1005 ... Budi, 10 ... Cici, 10 ... ");
    expect(text).not.toMatch(/\s{2,}/);
  });

  it("semua dibisukan = kosong", () => {
    const t = resolveTemplates({ roundHeader: "", scoreLine: "", gepuk: "", nyewu: "", gapWarning: "", lastPlaceChange: "", tieResult: "" });
    expect(buildRoundAnnouncement(players, rounds, shoots, 0, t)).toBe("");
  });

  it("DEFAULT_TEMPLATES tidak bisa dimutasi", () => {
    expect(Object.isFrozen(DEFAULT_TEMPLATES)).toBe(true);
  });
});
