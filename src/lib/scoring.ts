import type { Player, Round } from "@/store/useGameStore";

/**
 * Semua aturan skor yang murni (tanpa React, tanpa zustand) ada di sini.
 *
 * Dulu `computeTotals` ditulis ulang di store, announcement, Dashboard,
 * Finished, dan PsywarFooter. Satu aturan skor, satu tempat.
 */

export const SPIN_MIN = 1;
export const SPIN_MAX = 100;

export type TieOutcome =
  | { status: "waiting"; remaining: string[] }
  | { status: "respin"; candidates: string[] }
  | { status: "resolved"; loserId: string };

/** Total skor kumulatif per pemain. Pemain yang tidak dikenal di `players` diabaikan. */
export function computeTotals(
  players: ReadonlyArray<Pick<Player, "id">>,
  rounds: ReadonlyArray<Pick<Round, "scores">>
): Record<string, number> {
  const totals: Record<string, number> = {};
  players.forEach((p) => (totals[p.id] = 0));

  rounds.forEach((r) => {
    r.scores.forEach((s) => {
      if (totals[s.playerId] !== undefined) totals[s.playerId] += s.finalScore;
    });
  });

  return totals;
}

/** Urutan pemain dari skor tertinggi ke terendah. Stabil untuk skor sama. */
export function sortPlayersByTotal<T extends { id: string }>(
  players: ReadonlyArray<T>,
  totals: Record<string, number>
): T[] {
  return [...players].sort((a, b) => totals[b.id] - totals[a.id]);
}

/** Semua pemain yang skornya paling rendah. Lebih dari satu = seri. */
export function findTiedForLast(totals: Record<string, number>): string[] {
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

export function isSameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((id) => b.includes(id));
}

/**
 * Cari sejak kapan pemain ini terus-menerus kena hukuman, dengan menelusuri
 * mundur selama `resolvedLastPlaceId` masih dia.
 */
export function computeLastPlaceSince(
  rounds: ReadonlyArray<Pick<Round, "roundId" | "resolvedLastPlaceId">>,
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
  const webCrypto = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;

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
  if (remaining.length > 0) return { status: "waiting", remaining };

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

  if (lowest.length > 1) return { status: "respin", candidates: lowest };
  return { status: "resolved", loserId: lowest[0] };
}
