import { NYEWU_SCORE, computeStats, type GameRecord, type PlayerStats } from "./history";

/** Pemain baru masuk peringkat persentase menang kalau sudah main sebanyak ini. */
export const MIN_GAMES_FOR_RATE = 3;

export interface GlobalStats {
  games: number;
  rounds: number;
  players: number;
  shoots: number;
  /** Game yang ada pemain mencapai nyewu (1000). */
  nyewuGames: number;
  avgDurationMs: number;
  longestDurationMs: number;
  mostRounds: number;
  firstAt: number | null;
  lastAt: number | null;
}

export type RecordId =
  | "mostWins"
  | "bestWinRate"
  | "longestWinStreak"
  | "mostLosses"
  | "longestLoserStreak"
  | "mostNyewu"
  | "mostShotsGiven"
  | "mostShotsTaken"
  | "highestTotal"
  | "lowestTotal";

export interface RecordHolder {
  key: string;
  name: string;
}

export interface HallRecord {
  id: RecordId;
  value: number;
  /** Semua pemegang rekor; lebih dari satu kalau seri. */
  holders: RecordHolder[];
  /** Hanya untuk persentase menang: jumlah game pemegang rekor. */
  games?: number;
}

export interface HallOfFame {
  global: GlobalStats;
  records: HallRecord[];
}

/** Rentetan menang terpanjang per pemain, hanya dari game yang ia ikuti, urut waktu. */
function bestWinStreaks(games: ReadonlyArray<GameRecord>): Map<string, number> {
  const ordered = [...games].sort((a, b) => a.finishedAt - b.finishedAt);
  const now = new Map<string, number>();
  const best = new Map<string, number>();
  for (const game of ordered) {
    for (const p of game.players) {
      if (game.winnerKey === p.key) {
        const n = (now.get(p.key) ?? 0) + 1;
        now.set(p.key, n);
        best.set(p.key, Math.max(best.get(p.key) ?? 0, n));
      } else {
        now.set(p.key, 0);
      }
    }
  }
  return best;
}

function topBy(
  id: RecordId,
  players: ReadonlyArray<PlayerStats>,
  pick: (p: PlayerStats) => number,
  prefer: "max" | "min" = "max",
  extra?: (p: PlayerStats) => Partial<HallRecord>
): HallRecord | null {
  if (players.length === 0) return null;
  const values = players.map(pick).filter((v) => Number.isFinite(v));
  if (values.length === 0) return null;
  const target = prefer === "max" ? Math.max(...values) : Math.min(...values);
  // Rekor nol bukan rekor ("0 kali menang" bukan prestasi).
  if (prefer === "max" && target <= 0) return null;
  const holders = players.filter((p) => pick(p) === target);
  return {
    id,
    value: target,
    holders: holders.map((p) => ({ key: p.key, name: p.name })),
    ...(extra ? extra(holders[0]) : {}),
  };
}

export function computeHallOfFame(games: ReadonlyArray<GameRecord>): HallOfFame {
  const { overall, players } = computeStats(games);

  const global: GlobalStats = {
    games: overall.games,
    rounds: overall.rounds,
    players: players.length,
    shoots: games.reduce((n, g) => n + g.shoots.length, 0),
    nyewuGames: players.length === 0 ? 0 : countNyewuGames(games),
    avgDurationMs: overall.avgDurationMs,
    longestDurationMs: overall.longestDurationMs,
    mostRounds: overall.mostRounds,
    firstAt: games.length ? Math.min(...games.map((g) => g.finishedAt)) : null,
    lastAt: games.length ? Math.max(...games.map((g) => g.finishedAt)) : null,
  };

  const streaks = bestWinStreaks(games);
  const eligible = players.filter((p) => p.games >= MIN_GAMES_FOR_RATE);

  const records = [
    topBy("mostWins", players, (p) => p.wins),
    topBy("bestWinRate", eligible, (p) => Math.round((p.wins / p.games) * 100), "max", (p) => ({
      games: p.games,
    })),
    topBy("longestWinStreak", players, (p) => streaks.get(p.key) ?? 0),
    topBy("mostLosses", players, (p) => p.losses),
    topBy("longestLoserStreak", players, (p) => p.loserStreakBest),
    topBy("mostNyewu", players, (p) => p.nyewu),
    topBy("mostShotsGiven", players, (p) => p.shotsGiven),
    topBy("mostShotsTaken", players, (p) => p.shotsTaken),
    topBy("highestTotal", players, (p) => p.bestTotal),
    topBy("lowestTotal", players, (p) => p.worstTotal, "min"),
  ].filter((r): r is HallRecord => r !== null);

  return { global, records };
}

function countNyewuGames(games: ReadonlyArray<GameRecord>): number {
  return games.filter((g) =>
    g.players.some((_, i) => {
      let running = 0;
      for (const row of g.rounds) {
        running += row[i];
        if (running >= NYEWU_SCORE) return true;
      }
      return false;
    })
  ).length;
}
