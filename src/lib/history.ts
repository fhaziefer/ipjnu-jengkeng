import type { GameState } from "@/store/useGameStore";
import { playerNameKey } from "./playerName";
import { computeTotals, sortPlayersByTotal } from "./scoring";

/**
 * Riwayat permainan.
 *
 * Satu `GameRecord` = satu permainan yang sudah di-SRET. Sengaja ringkas:
 * ronde disimpan sebagai angka mentah (urutan pemain = urutan `players`),
 * semua statistik dihitung ulang dari situ, jadi rumus statistik boleh
 * berubah tanpa migrasi data.
 *
 * Identitas pemain lintas game = `key` (nama yang di-lowercase dan dirapikan
 * lewat `playerNameKey`), karena id pemain di store game cuma "player-1" dst.
 */

export const HISTORY_EXPORT_APP = "jengkeng-history";
export const HISTORY_EXPORT_VERSION = 1;
export const NYEWU_SCORE = 1000;

export interface GameRecordPlayer {
  key: string;
  name: string;
  total: number;
}

export interface GameRecordShoot {
  /** Indeks ronde (0-based) di `rounds`. */
  round: number;
  /** Indeks pemain di `players`. */
  shooter: number;
  victim: number;
  points: number;
}

export interface GameRecord {
  /** `gameStartTime` sebagai string. Dipakai untuk dedup. */
  id: string;
  startedAt: number;
  finishedAt: number;
  players: GameRecordPlayer[];
  winnerKey: string;
  /** Juru kunci final. Hasil spin kalau skor terendah seri. */
  loserKey: string;
  /** rounds[r][p] = skor akhir pemain ke-p di ronde ke-r. */
  rounds: number[][];
  shoots: GameRecordShoot[];
  /** Berapa ronde yang harus diselesaikan dengan spin. */
  tieBreaks: number;
}

type RecordableState = Pick<
  GameState,
  "players" | "rounds" | "shootRecords" | "gameStartTime" | "currentLastPlacePlayerId"
>;

/** Snapshot permainan yang baru selesai. Null kalau belum ada ronde sama sekali. */
export function buildGameRecord(state: RecordableState, finishedAt: number): GameRecord | null {
  const { players, rounds, shootRecords, gameStartTime, currentLastPlacePlayerId } = state;

  if (rounds.length === 0 || players.length === 0) return null;

  const totals = computeTotals(players, rounds);
  const sorted = sortPlayersByTotal(players, totals);

  const winner = sorted[0];
  // Sama seperti layar skor akhir: juru kunci dari store, bukan dari posisi sort.
  const loser =
    players.find((p) => p.id === currentLastPlacePlayerId) ?? sorted[sorted.length - 1];

  const indexOfPlayer = (id: string) => players.findIndex((p) => p.id === id);

  return {
    id: String(gameStartTime ?? finishedAt),
    startedAt: gameStartTime ?? finishedAt,
    finishedAt,
    players: players.map((p) => ({
      key: playerNameKey(p.name),
      name: p.name,
      total: totals[p.id],
    })),
    winnerKey: playerNameKey(winner.name),
    loserKey: playerNameKey(loser.name),
    rounds: rounds.map((r) =>
      players.map((p) => r.scores.find((s) => s.playerId === p.id)?.finalScore ?? 0)
    ),
    shoots: shootRecords.flatMap((s) => {
      const round = rounds.findIndex((r) => r.roundId === s.roundId);
      const shooter = indexOfPlayer(s.shooterId);
      const victim = indexOfPlayer(s.victimId);
      if (round < 0 || shooter < 0 || victim < 0) return [];
      return [{ round, shooter, victim, points: s.penaltyPoints }];
    }),
    tieBreaks: rounds.filter((r) => r.tieBreak).length,
  };
}

// ============================================================
// VALIDASI, MERGE, EXPORT / IMPORT
// ============================================================

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Dipakai saat import: file dari luar tidak boleh dipercaya begitu saja. */
export function isValidGameRecord(value: unknown): value is GameRecord {
  if (!isObject(value)) return false;

  const { id, startedAt, finishedAt, players, winnerKey, loserKey, rounds, shoots, tieBreaks } =
    value;

  if (typeof id !== "string" || id.length === 0) return false;
  if (!isFiniteNumber(startedAt) || !isFiniteNumber(finishedAt)) return false;
  if (!isFiniteNumber(tieBreaks)) return false;
  if (typeof winnerKey !== "string" || typeof loserKey !== "string") return false;

  if (!Array.isArray(players) || players.length < 2 || players.length > 8) return false;
  const playersOk = players.every(
    (p) =>
      isObject(p) &&
      typeof p.key === "string" &&
      typeof p.name === "string" &&
      isFiniteNumber(p.total)
  );
  if (!playersOk) return false;

  const keys = (players as GameRecordPlayer[]).map((p) => p.key);
  if (!keys.includes(winnerKey) || !keys.includes(loserKey)) return false;

  if (!Array.isArray(rounds) || rounds.length === 0) return false;
  const roundsOk = rounds.every(
    (row) => Array.isArray(row) && row.length === players.length && row.every(isFiniteNumber)
  );
  if (!roundsOk) return false;

  if (!Array.isArray(shoots)) return false;
  return shoots.every(
    (s) =>
      isObject(s) &&
      isFiniteNumber(s.round) &&
      isFiniteNumber(s.shooter) &&
      isFiniteNumber(s.victim) &&
      isFiniteNumber(s.points) &&
      s.round >= 0 &&
      s.round < rounds.length &&
      s.shooter >= 0 &&
      s.shooter < players.length &&
      s.victim >= 0 &&
      s.victim < players.length
  );
}

/** Gabungkan tanpa menimpa: game dengan `id` yang sudah ada dilewati. Hasil urut kronologis. */
export function mergeGames(
  existing: ReadonlyArray<GameRecord>,
  incoming: ReadonlyArray<GameRecord>
): { games: GameRecord[]; added: number } {
  const seen = new Set(existing.map((g) => g.id));
  const fresh: GameRecord[] = [];

  incoming.forEach((g) => {
    if (seen.has(g.id)) return;
    seen.add(g.id);
    fresh.push(g);
  });

  const games = [...existing, ...fresh].sort((a, b) => a.finishedAt - b.finishedAt);
  return { games, added: fresh.length };
}

export interface HistoryExportFile {
  app: typeof HISTORY_EXPORT_APP;
  version: number;
  exportedAt: number;
  games: GameRecord[];
}

export function serializeHistory(games: ReadonlyArray<GameRecord>, now: number): string {
  const file: HistoryExportFile = {
    app: HISTORY_EXPORT_APP,
    version: HISTORY_EXPORT_VERSION,
    exportedAt: now,
    games: [...games],
  };
  return JSON.stringify(file, null, 2);
}

export type ParseResult =
  | { ok: true; games: GameRecord[]; skipped: number }
  | { ok: false; error: string };

export function parseHistoryFile(text: string): ParseResult {
  let data: unknown;

  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: "Berkas bukan JSON yang valid." };
  }

  if (!isObject(data) || data.app !== HISTORY_EXPORT_APP) {
    return { ok: false, error: "Ini bukan berkas riwayat Jengkeng." };
  }

  if (!isFiniteNumber(data.version) || data.version > HISTORY_EXPORT_VERSION) {
    return { ok: false, error: "Versi berkas lebih baru dari aplikasi ini. Perbarui dulu aplikasinya." };
  }

  if (!Array.isArray(data.games)) {
    return { ok: false, error: "Berkas tidak berisi daftar game." };
  }

  const games = data.games.filter(isValidGameRecord);
  const skipped = data.games.length - games.length;

  if (games.length === 0 && data.games.length > 0) {
    return { ok: false, error: "Semua game di berkas ini rusak, tidak ada yang bisa diimpor." };
  }

  return { ok: true, games, skipped };
}

// ============================================================
// STATISTIK
// ============================================================

export interface PlayerStats {
  key: string;
  /** Nama terbaru yang dipakai pemain ini. */
  name: string;
  games: number;
  wins: number;
  /** Berapa kali jadi juru kunci final. */
  losses: number;
  /** Berapa game dia sempat tembus 1000 (nyewu). */
  nyewu: number;
  shotsGiven: number;
  shotsTaken: number;
  bestTotal: number;
  worstTotal: number;
  /** Berturut-turut jadi juru kunci sampai game terakhir yang dia ikuti. */
  loserStreakNow: number;
  loserStreakBest: number;
}

export interface OverallStats {
  games: number;
  rounds: number;
  avgDurationMs: number;
  longestDurationMs: number;
  mostRounds: number;
}

export interface HistoryStats {
  overall: OverallStats;
  players: PlayerStats[];
}

function reachedNyewu(game: GameRecord, playerIndex: number): boolean {
  let running = 0;
  for (const row of game.rounds) {
    running += row[playerIndex];
    if (running >= NYEWU_SCORE) return true;
  }
  return false;
}

export function computeStats(games: ReadonlyArray<GameRecord>): HistoryStats {
  const ordered = [...games].sort((a, b) => a.finishedAt - b.finishedAt);
  const byKey = new Map<string, PlayerStats>();

  ordered.forEach((game) => {
    game.players.forEach((p, index) => {
      let s = byKey.get(p.key);

      if (!s) {
        s = {
          key: p.key,
          name: p.name,
          games: 0,
          wins: 0,
          losses: 0,
          nyewu: 0,
          shotsGiven: 0,
          shotsTaken: 0,
          bestTotal: -Infinity,
          worstTotal: Infinity,
          loserStreakNow: 0,
          loserStreakBest: 0,
        };
        byKey.set(p.key, s);
      }

      s.name = p.name; // game kronologis, jadi yang terakhir menang
      s.games += 1;
      if (game.winnerKey === p.key) s.wins += 1;
      if (reachedNyewu(game, index)) s.nyewu += 1;
      s.bestTotal = Math.max(s.bestTotal, p.total);
      s.worstTotal = Math.min(s.worstTotal, p.total);

      if (game.loserKey === p.key) {
        s.losses += 1;
        s.loserStreakNow += 1;
        s.loserStreakBest = Math.max(s.loserStreakBest, s.loserStreakNow);
      } else {
        s.loserStreakNow = 0;
      }
    });

    game.shoots.forEach((shoot) => {
      const shooter = byKey.get(game.players[shoot.shooter].key);
      const victim = byKey.get(game.players[shoot.victim].key);
      if (shooter) shooter.shotsGiven += 1;
      if (victim) victim.shotsTaken += 1;
    });
  });

  const durations = ordered.map((g) => Math.max(0, g.finishedAt - g.startedAt));
  const totalDuration = durations.reduce((a, b) => a + b, 0);

  const overall: OverallStats = {
    games: ordered.length,
    rounds: ordered.reduce((n, g) => n + g.rounds.length, 0),
    avgDurationMs: ordered.length > 0 ? Math.round(totalDuration / ordered.length) : 0,
    longestDurationMs: durations.length > 0 ? Math.max(...durations) : 0,
    mostRounds: ordered.length > 0 ? Math.max(...ordered.map((g) => g.rounds.length)) : 0,
  };

  const players = [...byKey.values()].sort(
    (a, b) => b.games - a.games || b.wins - a.wins || a.name.localeCompare(b.name, "id-ID")
  );

  return { overall, players };
}

// ============================================================
// AUTOCOMPLETE NAMA
// ============================================================

/** Nama yang pernah dipakai, paling sering dulu, lalu paling baru. */
export function suggestNames(games: ReadonlyArray<GameRecord>, limit = 12): string[] {
  const seen = new Map<string, { name: string; count: number; last: number }>();

  games.forEach((game) => {
    game.players.forEach((p) => {
      const current = seen.get(p.key);
      if (!current) {
        seen.set(p.key, { name: p.name, count: 1, last: game.finishedAt });
        return;
      }
      current.count += 1;
      if (game.finishedAt >= current.last) {
        current.last = game.finishedAt;
        current.name = p.name;
      }
    });
  });

  return [...seen.values()]
    .sort((a, b) => b.count - a.count || b.last - a.last)
    .slice(0, limit)
    .map((s) => s.name);
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.round(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) return `${minutes} menit`;
  return `${hours} jam ${minutes} menit`;
}
