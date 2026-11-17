import { findTiedForLast } from "@/lib/scoring";
import type { GameState, Player, Round, RoundScore } from "./useGameStore";

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

type LegacyState = Partial<Omit<GameState, "players" | "rounds">> & {
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
export function migrateGameState(persisted: unknown, version: number): GameState {
  const legacy = persisted as LegacyState;

  if (version >= 1) return legacy as GameState;

  const players: Player[] = (legacy.players ?? []).map((p) => ({
    id: p.id,
    name: (p.name ?? p.initials ?? "").trim(),
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
