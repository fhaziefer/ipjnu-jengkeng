import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  computeLastPlaceSince,
  computeTotals,
  drawIndex,
  drawSpin,
  evaluateTieResults,
  findTiedForLast,
  isSameSet,
  type TieOutcome,
} from '@/lib/scoring';
import { migrateGameState } from './migrations';
import { buildGameRecord } from '@/lib/history';
import { requestPersistentStorage } from '@/lib/storage';
import { useHistoryStore } from './useHistoryStore';
import { canResume, type AutoFinishInfo } from '@/lib/autoFinish';

// Aturan skor murni ada di src/lib/scoring.ts. Re-export supaya import lama tetap jalan.
export { SPIN_MIN, SPIN_MAX, drawSpin, evaluateTieResults } from '@/lib/scoring';
export type { TieOutcome } from '@/lib/scoring';

export type GameStatus = 'idle' | 'active' | 'finished';

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

// ============================================================
// STORE
// ============================================================

export interface GameState {
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
  /** Hasil undian giliran pertama. Null = belum diundi. Diundi sekali per game. */
  firstTurnPlayerId: string | null;
  /** Aktivitas terakhir (ronde, undo, spin). Dasar penutupan otomatis. */
  lastActivityAt: number | null;
  /** Terisi kalau game ditutup otomatis karena lama tanpa itungan. */
  autoFinish: AutoFinishInfo | null;

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
  /** Mengundi siapa yang mulai. Hanya sekali, sebelum ronde pertama. */
  drawFirstTurn: () => string | null;
  /** `auto` dipakai penutupan otomatis: `finishedAt` = aktivitas terakhir. */
  finishGame: (options?: { auto?: { finishedAt: number } }) => void;
  /** Membatalkan penutupan otomatis selama jendela lanjut masih terbuka. */
  resumeGame: () => boolean;
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
  firstTurnPlayerId: null as string | null,
  lastActivityAt: null as number | null,
  autoFinish: null as AutoFinishInfo | null,
};

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
          lastActivityAt: Date.now(),
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
            lastActivityAt: roundTimestamp,
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
          lastActivityAt: roundTimestamp,
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
          lastActivityAt: Date.now(),
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
          lastActivityAt: Date.now(),
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
          lastActivityAt: Date.now(),
        });
      },

      drawFirstTurn: () => {
        const state = get();
        if (state.gameStatus !== 'active') return null;
        if (state.rounds.length > 0) return null;
        if (state.firstTurnPlayerId) return null;
        if (state.players.length === 0) return null;

        const chosen = state.players[drawIndex(state.players.length)].id;
        set({ firstTurnPlayerId: chosen, lastActivityAt: Date.now() });
        return chosen;
      },

      finishGame: (options) => {
        const state = get();

        // Jangan biarkan permainan ditutup sementara hukumannya masih menggantung.
        if (state.pendingTieBreak) return;
        if (state.gameStatus !== 'active') return;

        const auto = options?.auto;
        const finishedAt = auto ? auto.finishedAt : Date.now();
        let recordId: string | null = null;

        set({ gameStatus: 'finished' });

        // Catat ke riwayat SEKARANG, bukan di layar skor akhir: tombol
        // Panggah/Ganti/Bubar bisa mengosongkan state kapan saja setelah ini.
        // Gagal menyimpan (mis. kuota localStorage penuh) tidak boleh
        // menggagalkan penutupan permainan.
        try {
          const record = buildGameRecord(state, finishedAt);
          if (record && useHistoryStore.getState().recordGame(record)) {
            recordId = record.id;
            requestPersistentStorage();
          }
        } catch (error) {
          console.error('[jengkeng] gagal mencatat riwayat', error);
        }

        if (auto) set({ autoFinish: { detectedAt: Date.now(), recordId } });
      },

      resumeGame: () => {
        const state = get();
        if (!canResume(state.gameStatus, state.autoFinish, Date.now())) return false;

        // Catatan riwayat dari penutupan otomatis dibuang; nanti dicatat ulang
        // utuh saat game benar-benar selesai (id-nya sama: waktu mulai game).
        const recordId = state.autoFinish?.recordId;
        if (recordId) useHistoryStore.getState().deleteGame(recordId);

        set({ gameStatus: 'active', autoFinish: null, lastActivityAt: Date.now() });
        return true;
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