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
    shoot?: { shooterId: string; victimId: string; penaltyPoints: number }
  ) => void;
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

      addRound: (scores, shoot) => {
        const roundId = Date.now().toString();

        // Calculate final scores by applying shoot penalties/bonuses
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
        };

        set((state) => {
          const newRounds = [...state.rounds, newRound];
          const newShootRecords = shoot
            ? [...state.shootRecords, { ...shoot, roundId }]
            : state.shootRecords;

          // Calculate running totals
          const totals = state.players.reduce((acc, p) => {
            acc[p.id] = 0;
            return acc;
          }, {} as Record<string, number>);

          newRounds.forEach((r) => {
            r.scores.forEach((s) => {
              totals[s.playerId] += s.finalScore;
            });
          });

          // Find the new last place player
          // If there's a tie for last place, we might just pick one or keep the current one if they are part of the tie.
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

          // If the current last place is not among the lowest anymore, we must pick a new one.
          // Or if there was no last place previously.
          if (
            !newLastPlaceId ||
            !tiedForLast.includes(newLastPlaceId)
          ) {
            // Just pick the first one from the tie, or the only one
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
      name: 'jengkeng-score-storage', // key in localStorage
    }
  )
);
