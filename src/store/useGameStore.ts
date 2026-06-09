import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GameStatus = 'idle' | 'active' | 'finished';

export interface Player {
  id: string;
  initials: string;
}

export interface RoundScore {
  playerId: string;
  baseScore: number;
  finalScore: number;
}

export interface Round {
  roundId: string;
  scores: RoundScore[];
  isEdited?: boolean; // Tanda apakah ronde ini hasil editan
}

export interface ShootRecord {
  roundId: string;
  shooterId: string;
  victimId: string;
  penaltyPoints: number;
}

interface GameState {
  gameStatus: GameStatus;
  gameStartTime: number | null;
  currentLastPlacePlayerId: string | null;
  lastPlaceSinceTimestamp: number | null;
  players: Player[];
  rounds: Round[];
  shootRecords: ShootRecord[];

  startGame: (players: Player[]) => void;
  addRound: (
    scores: { playerId: string; baseScore: number }[],
    shoot?: { shooterId: string; victimId: string; penaltyPoints: number },
    isEdited?: boolean // Parameter baru
  ) => void;
  undoLastRound: () => void;
  finishGame: () => void;
  resetGame: () => void;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      gameStatus: 'idle',
      gameStartTime: null,
      currentLastPlacePlayerId: null,
      lastPlaceSinceTimestamp: null,
      players: [],
      rounds: [],
      shootRecords: [],

      startGame: (players) => {
        set({
          gameStatus: 'active',
          gameStartTime: Date.now(),
          currentLastPlacePlayerId: null,
          lastPlaceSinceTimestamp: Date.now(),
          players,
          rounds: [],
          shootRecords: [],
        });
      },

      addRound: (scores, shoot, isEdited = false) => {
        const roundId = Date.now().toString();

        const finalScores = scores.map((s) => {
          let finalScore = s.baseScore;
          if (shoot) {
            if (s.playerId === shoot.shooterId) {
              finalScore += shoot.penaltyPoints;
            } else if (s.playerId === shoot.victimId) {
              finalScore -= shoot.penaltyPoints;
            }
          }
          return { ...s, finalScore };
        });

        const newRound: Round = {
          roundId,
          scores: finalScores,
          isEdited, // Masukin tandanya ke database
        };

        set((state) => {
          const newRounds = [...state.rounds, newRound];
          const newShootRecords = shoot
            ? [...state.shootRecords, { ...shoot, roundId }]
            : state.shootRecords;

          const totals = state.players.reduce((acc, p) => {
            acc[p.id] = 0;
            return acc;
          }, {} as Record<string, number>);

          newRounds.forEach((r) => {
            r.scores.forEach((s) => {
              totals[s.playerId] += s.finalScore;
            });
          });

          let minScore = Infinity;
          const tiedForLast: string[] = [];

          for (const playerId in totals) {
            const score = totals[playerId];
            if (score < minScore) {
              minScore = score;
              tiedForLast.length = 0;
              tiedForLast.push(playerId);
            } else if (score === minScore) {
              tiedForLast.push(playerId);
            }
          }

          let newLastPlaceId = state.currentLastPlacePlayerId;

          if (!newLastPlaceId || !tiedForLast.includes(newLastPlaceId)) {
            newLastPlaceId = tiedForLast[0];
          }

          const hasLastPlaceChanged = newLastPlaceId !== state.currentLastPlacePlayerId;

          return {
            rounds: newRounds,
            shootRecords: newShootRecords,
            currentLastPlacePlayerId: newLastPlaceId,
            lastPlaceSinceTimestamp: hasLastPlaceChanged ? Date.now() : state.lastPlaceSinceTimestamp,
          };
        });
      },

      undoLastRound: () => {
        set((state) => {
          if (state.rounds.length === 0) return state;

          const newRounds = state.rounds.slice(0, -1);
          const lastRound = state.rounds[state.rounds.length - 1];

          const newShootRecords = state.shootRecords.filter(
            (record) => record.roundId !== lastRound.roundId
          );

          const totals = state.players.reduce((acc, p) => {
            acc[p.id] = 0;
            return acc;
          }, {} as Record<string, number>);

          newRounds.forEach((r) => {
            r.scores.forEach((s) => {
              totals[s.playerId] += s.finalScore;
            });
          });

          let minScore = Infinity;
          const tiedForLast: string[] = [];

          for (const playerId in totals) {
            const score = totals[playerId];
            if (score < minScore) {
              minScore = score;
              tiedForLast.length = 0;
              tiedForLast.push(playerId);
            } else if (score === minScore) {
              tiedForLast.push(playerId);
            }
          }

          let newLastPlaceId = state.currentLastPlacePlayerId;

          if (!newLastPlaceId || !tiedForLast.includes(newLastPlaceId)) {
            newLastPlaceId = tiedForLast[0] || null;
          }

          const hasLastPlaceChanged = newLastPlaceId !== state.currentLastPlacePlayerId;

          return {
            rounds: newRounds,
            shootRecords: newShootRecords,
            currentLastPlacePlayerId: newLastPlaceId,
            lastPlaceSinceTimestamp: hasLastPlaceChanged ? Date.now() : state.lastPlaceSinceTimestamp,
          };
        });
      },

      finishGame: () => {
        set({ gameStatus: 'finished' });
      },

      resetGame: () => {
        set({
          gameStatus: 'idle',
          gameStartTime: null,
          currentLastPlacePlayerId: null,
          lastPlaceSinceTimestamp: null,
          players: [],
          rounds: [],
          shootRecords: [],
        });
      },
    }),
    {
      name: 'jengkeng-score-storage',
    }
  )
);