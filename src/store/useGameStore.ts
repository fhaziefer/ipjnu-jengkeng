import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GameStatus = 'idle' | 'active' | 'finished';

export const SPIN_MIN = 1;
export const SPIN_MAX = 100;

export interface Player {
  id: string;
  /** Nama lengkap, boleh mengandung spasi. Dulu bernama `initials`. */
  name: string;
}

export interface RoundScore {
  playerId: string;
  baseScore: number;
  finalScore: number;
}

export interface TieBreak {
  candidates: string[];
  /** playerId -> angka hasil spin (SPIN_MIN..SPIN_MAX) */
  results: Record<string, number>;
}

export interface Round {
  roundId: string;
  scores: RoundScore[];
  isEdited?: boolean;
  /** Semua pemain yang skornya terendah setelah ronde ini. Fakta skor. */
  tiedForLast: string[];
  /** Siapa yang benar-benar kena hukuman. Hasil spin kalau `tiedForLast` > 1. */
  resolvedLastPlaceId: string | null;
  tieBreak?: TieBreak;
}

export interface ShootRecord {
  roundId: string;
  shooterId: string;
  victimId: string;
  penaltyPoints: number;
}

export interface PendingTieBreak {
  roundId: string;
  candidates: string[];
  results: Record<string, number>;
}

export type TieOutcome =
  | { status: 'waiting'; remaining: string[] }
  | { status: 'respin'; candidates: string[] }
  | { status: 'resolved'; loserId: string };

// ============================================================
// HELPER MURNI
// ============================================================

function computeTotals(players: Player[], rounds: Round[]): Record<string, number> {
  const totals: Record<string, number> = {};
  players.forEach((p) => (totals[p.id] = 0));

  rounds.forEach((r) => {
    r.scores.forEach((s) => {
      if (totals[s.playerId] !== undefined) totals[s.playerId] += s.finalScore;
    });
  });

  return totals;
}

function findTiedForLast(totals: Record<string, number>): string[] {
  let minScore = Infinity;
  let tied: string[] = [];

  for (const playerId in totals) {
    const score = totals[playerId];
    if (score < minScore) {
      minScore = score;
      tied = [playerId];
    } else if (score === minScore) {
      tied.push(playerId);
    }
  }

  return tied;
}

function isSameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id) => b.includes(id));
}

/**
 * Cari sejak kapan pemain ini terus-menerus kena hukuman, dengan menelusuri
 * mundur selama `resolvedLastPlaceId` masih dia.
 */
function computeLastPlaceSince(
  rounds: Round[],
  lastPlaceId: string | null,
  gameStartTime: number | null
): number | null {
  if (!lastPlaceId) return gameStartTime;

  let since = gameStartTime;

  for (let i = rounds.length - 1; i >= 0; i--) {
    if (rounds[i].resolvedLastPlaceId !== lastPlaceId) break;
    since = Number.parseInt(rounds[i].roundId, 10);
  }

  return since;
}

/**
 * Undian 1..100 tanpa modulo bias.
 *
 * `Math.random() % 100` maupun `byte % 100` bikin angka 1..56 sedikit lebih
 * sering keluar. Untuk fitur yang seluruh nilainya ada di persepsi adil, itu
 * tidak sepadan. Rejection sampling: byte >= 200 dibuang, diundi ulang.
 */
export function drawSpin(): number {
  const range = SPIN_MAX - SPIN_MIN + 1;
  const webCrypto = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;

  if (webCrypto?.getRandomValues) {
    const limit = Math.floor(256 / range) * range;
    const buffer = new Uint8Array(1);

    for (let attempt = 0; attempt < 32; attempt++) {
      webCrypto.getRandomValues(buffer);
      if (buffer[0] < limit) return SPIN_MIN + (buffer[0] % range);
    }
  }

  return SPIN_MIN + Math.floor(Math.random() * range);
}

/**
 * Satu-satunya tempat hasil spin diterjemahkan jadi keputusan. Dipakai
 * bersama oleh store dan UI supaya tidak ada dua versi aturan.
 */
export function evaluateTieResults(
  candidates: string[],
  results: Record<string, number>
): TieOutcome {
  const remaining = candidates.filter((id) => results[id] === undefined);
  if (remaining.length > 0) return { status: 'waiting', remaining };

  let minValue = Infinity;
  let lowest: string[] = [];

  candidates.forEach((id) => {
    const value = results[id];
    if (value < minValue) {
      minValue = value;
      lowest = [id];
    } else if (value === minValue) {
      lowest.push(id);
    }
  });

  if (lowest.length > 1) return { status: 'respin', candidates: lowest };
  return { status: 'resolved', loserId: lowest[0] };
}

// ============================================================
// STORE
// ============================================================

interface GameState {
  gameStatus: GameStatus;
  gameStartTime: number | null;
  /** Siapa yang kena hukuman saat ini. Null selama spin belum kelar. */
  currentLastPlacePlayerId: string | null;
  lastPlaceSinceTimestamp: number | null;
  players: Player[];
  rounds: Round[];
  shootRecords: ShootRecord[];
  pendingTieBreak: PendingTieBreak | null;
  /**
   * Hasil spin dari ronde yang baru saja di-undo. Dipakai ulang kalau ronde
   * pengganti menghasilkan kandidat yang sama persis, supaya tombol
   * "Salah Ngitung" tidak berubah jadi tombol reroll.
   */
  carriedTieBreak: TieBreak | null;

  startGame: (players: Player[]) => void;
  addRound: (
    scores: { playerId: string; baseScore: number }[],
    shoot?: { shooterId: string; victimId: string; penaltyPoints: number },
    isEdited?: boolean
  ) => void;
  /** Mengundi dan langsung commit angka untuk satu pemain. Animasi menyusul. */
  spinTieBreak: (playerId: string) => number | null;
  /** Dipanggil UI setelah semua kandidat spin dan hasilnya selesai di-reveal. */
  commitTieBreak: () => TieOutcome;
  undoLastRound: () => void;
  finishGame: () => void;
  resetGame: () => void;
}

const INITIAL_STATE = {
  gameStatus: 'idle' as GameStatus,
  gameStartTime: null,
  currentLastPlacePlayerId: null,
  lastPlaceSinceTimestamp: null,
  players: [],
  rounds: [],
  shootRecords: [],
  pendingTieBreak: null,
  carriedTieBreak: null,
};

// --- Bentuk data versi 0, hanya dipakai oleh migrate ---
interface LegacyPlayer {
  id: string;
  initials?: string;
  name?: string;
}

interface LegacyRound {
  roundId: string;
  scores: RoundScore[];
  isEdited?: boolean;
}

type LegacyState = Partial<Omit<GameState, 'players' | 'rounds'>> & {
  players?: LegacyPlayer[];
  rounds?: LegacyRound[];
};

/**
 * v0 -> v1
 *
 * Tanpa ini, semua user yang sedang di tengah permainan akan rehydrate state
 * lama yang key-nya masih `initials`, sementara komponen baru membaca `name`.
 * Hasilnya "undefined" di seluruh layar.
 *
 * `resolvedLastPlaceId` untuk ronde lama direkonstruksi dengan mengulang
 * algoritma sticky yang lama persis, supaya riwayat yang sudah dilihat user
 * tidak berubah setelah update.
 */
function migrateGameState(persisted: unknown, version: number): GameState {
  const legacy = persisted as LegacyState;

  if (version >= 1) return legacy as GameState;

  const players: Player[] = (legacy.players ?? []).map((p) => ({
    id: p.id,
    name: (p.name ?? p.initials ?? '').trim(),
  }));

  const runningTotals: Record<string, number> = {};
  players.forEach((p) => (runningTotals[p.id] = 0));

  let sticky: string | null = null;

  const rounds: Round[] = (legacy.rounds ?? []).map((r) => {
    r.scores.forEach((s) => {
      if (runningTotals[s.playerId] !== undefined) {
        runningTotals[s.playerId] += s.finalScore;
      }
    });

    const tiedForLast = findTiedForLast(runningTotals);
    if (!sticky || !tiedForLast.includes(sticky)) sticky = tiedForLast[0] ?? null;

    return {
      roundId: r.roundId,
      scores: r.scores,
      isEdited: r.isEdited,
      tiedForLast,
      resolvedLastPlaceId: sticky,
    };
  });

  return {
    ...(legacy as GameState),
    players,
    rounds,
    pendingTieBreak: null,
    carriedTieBreak: null,
  };
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      startGame: (players) => {
        set({
          ...INITIAL_STATE,
          gameStatus: 'active',
          gameStartTime: Date.now(),
          lastPlaceSinceTimestamp: Date.now(),
          players,
        });
      },

      addRound: (scores, shoot, isEdited = false) => {
        const state = get();
        const roundTimestamp = Date.now();
        const roundId = roundTimestamp.toString();

        const finalScores = scores.map((s) => {
          let finalScore = s.baseScore;

          if (shoot) {
            if (s.playerId === shoot.shooterId) finalScore += shoot.penaltyPoints;
            else if (s.playerId === shoot.victimId) finalScore -= shoot.penaltyPoints;
          }

          return { ...s, finalScore };
        });

        const newRound: Round = {
          roundId,
          scores: finalScores,
          isEdited,
          tiedForLast: [],
          resolvedLastPlaceId: null,
        };

        const newRounds = [...state.rounds, newRound];
        const newShootRecords = shoot
          ? [...state.shootRecords, { ...shoot, roundId }]
          : state.shootRecords;

        const tiedForLast = findTiedForLast(computeTotals(state.players, newRounds));
        newRound.tiedForLast = tiedForLast;

        const applyResolved = (loserId: string | null, tieBreak?: TieBreak) => {
          newRound.resolvedLastPlaceId = loserId;
          if (tieBreak) newRound.tieBreak = tieBreak;

          const hasChanged = loserId !== state.currentLastPlacePlayerId;

          set({
            rounds: newRounds,
            shootRecords: newShootRecords,
            currentLastPlacePlayerId: loserId,
            lastPlaceSinceTimestamp: hasChanged
              ? roundTimestamp
              : state.lastPlaceSinceTimestamp,
            pendingTieBreak: null,
            carriedTieBreak: null,
          });
        };

        // Tidak seri: langsung ketahuan, tidak perlu spin.
        if (tiedForLast.length <= 1) {
          applyResolved(tiedForLast[0] ?? null);
          return;
        }

        // Edit ronde dengan kandidat identik: pakai hasil spin sebelumnya.
        const carried = state.carriedTieBreak;

        if (isEdited && carried && isSameSet(carried.candidates, tiedForLast)) {
          const outcome = evaluateTieResults(carried.candidates, carried.results);

          if (outcome.status === 'resolved') {
            applyResolved(outcome.loserId, carried);
            return;
          }
        }

        // Seri: ronde tetap masuk, tapi hukumannya menggantung sampai spin selesai.
        set({
          rounds: newRounds,
          shootRecords: newShootRecords,
          pendingTieBreak: { roundId, candidates: tiedForLast, results: {} },
          carriedTieBreak: null,
        });
      },

      spinTieBreak: (playerId) => {
        const pending = get().pendingTieBreak;

        if (!pending) return null;
        if (!pending.candidates.includes(playerId)) return null;
        if (pending.results[playerId] !== undefined) return null;

        const value = drawSpin();

        set({
          pendingTieBreak: {
            ...pending,
            results: { ...pending.results, [playerId]: value },
          },
        });

        return value;
      },

      commitTieBreak: () => {
        const state = get();
        const pending = state.pendingTieBreak;

        if (!pending) return { status: 'waiting', remaining: [] };

        const outcome = evaluateTieResults(pending.candidates, pending.results);

        if (outcome.status === 'waiting') return outcome;

        if (outcome.status === 'respin') {
          set({
            pendingTieBreak: {
              roundId: pending.roundId,
              candidates: outcome.candidates,
              results: {},
            },
          });
          return outcome;
        }

        const rounds = state.rounds.map((r) =>
          r.roundId === pending.roundId
            ? {
              ...r,
              resolvedLastPlaceId: outcome.loserId,
              tieBreak: { candidates: pending.candidates, results: pending.results },
            }
            : r
        );

        const hasChanged = outcome.loserId !== state.currentLastPlacePlayerId;

        set({
          rounds,
          currentLastPlacePlayerId: outcome.loserId,
          lastPlaceSinceTimestamp: hasChanged
            ? Number.parseInt(pending.roundId, 10)
            : state.lastPlaceSinceTimestamp,
          pendingTieBreak: null,
        });

        return outcome;
      },

      undoLastRound: () => {
        const state = get();
        if (state.rounds.length === 0) return;

        const removed = state.rounds[state.rounds.length - 1];
        const newRounds = state.rounds.slice(0, -1);

        const newShootRecords = state.shootRecords.filter(
          (record) => record.roundId !== removed.roundId
        );

        const restoredLastPlaceId =
          newRounds.length > 0 ? newRounds[newRounds.length - 1].resolvedLastPlaceId : null;

        set({
          rounds: newRounds,
          shootRecords: newShootRecords,
          currentLastPlacePlayerId: restoredLastPlaceId,
          lastPlaceSinceTimestamp: computeLastPlaceSince(
            newRounds,
            restoredLastPlaceId,
            state.gameStartTime
          ),
          pendingTieBreak:
            state.pendingTieBreak?.roundId === removed.roundId
              ? null
              : state.pendingTieBreak,
          carriedTieBreak: removed.tieBreak ?? null,
        });
      },

      finishGame: () => {
        // Jangan biarkan permainan ditutup sementara hukumannya masih menggantung.
        if (get().pendingTieBreak) return;
        set({ gameStatus: 'finished' });
      },

      resetGame: () => {
        set({ ...INITIAL_STATE });
      },
    }),
    {
      name: 'jengkeng-score-storage',
      version: 1,
      migrate: migrateGameState,
    }
  )
);