import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { computeHallOfFame, type HallRecord, type RecordId } from "./hallOfFame";
import { computeStats, type GameRecord } from "./history";

/** "2026-11". Pakai jam HP (zona waktu lokal), sama seperti tanggal di riwayat. */
export function monthKey(ts: number): string {
  return format(new Date(ts), "yyyy-MM");
}

export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMMM yyyy", { locale: localeId });
}

/** Bulan yang punya game, terbaru dulu. */
export function availableMonths(games: ReadonlyArray<GameRecord>): string[] {
  return [...new Set(games.map((g) => monthKey(g.finishedAt)))].sort().reverse();
}

export interface RecapLeader {
  label: string;
  names: string[];
  value: number;
}

export interface RecapStanding {
  key: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
}

export interface MonthlyRecap {
  monthKey: string;
  label: string;
  games: number;
  rounds: number;
  players: number;
  shoots: number;
  leaders: RecapLeader[];
  standings: RecapStanding[];
  firstAt: number | null;
  lastAt: number | null;
}

const LEADERS: Array<{ id: RecordId; label: string }> = [
  { id: "mostWins", label: "👑 Menang terbanyak" },
  { id: "mostLosses", label: "💩 Juru kunci terbanyak" },
  { id: "mostShotsGiven", label: "👊🏻 Gepuk terbanyak" },
  { id: "highestTotal", label: "Skor akhir tertinggi" },
];

export function buildMonthlyRecap(games: ReadonlyArray<GameRecord>, key: string): MonthlyRecap {
  const inMonth = games.filter((g) => monthKey(g.finishedAt) === key);
  const hof = computeHallOfFame(inMonth);
  const byId = new Map<RecordId, HallRecord>(hof.records.map((r) => [r.id, r]));

  const leaders = LEADERS.flatMap(({ id, label }) => {
    const r = byId.get(id);
    return r ? [{ label, names: r.holders.map((h) => h.name), value: r.value }] : [];
  });

  // Klasemen: menang terbanyak, lalu jengkeng paling sedikit, lalu main terbanyak, lalu nama.
  const standings = computeStats(inMonth)
    .players.map((p) => ({ key: p.key, name: p.name, games: p.games, wins: p.wins, losses: p.losses }))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses || b.games - a.games || a.name.localeCompare(b.name));

  return {
    monthKey: key,
    label: monthLabel(key),
    games: hof.global.games,
    rounds: hof.global.rounds,
    players: hof.global.players,
    shoots: hof.global.shoots,
    leaders,
    standings,
    firstAt: hof.global.firstAt,
    lastAt: hof.global.lastAt,
  };
}
