import { computeTotals } from "./scoring";
import type { Round } from "@/store/useGameStore";
import { NYEWU_SCORE as NYEWU_THRESHOLD } from "./history";

/**
 * Kejadian game yang pantas diberi animasi. Murni: dihitung dari state
 * sebelum dan sesudah AKSI SIMPAN ronde, bukan dari perubahan state apa pun.
 * Jadi undo, edit ronde, reload, dan memuat riwayat tidak memicu apa-apa.
 */
export type GameEvent =
  | { type: "gepuk"; shooterId: string; victimId: string; points: number }
  | { type: "nyewu"; playerId: string; tone: "god" | "hell" }
  | { type: "jurukunci"; playerId: string }
  | { type: "comeback"; playerId: string };

export interface EventSnapshot {
  players: ReadonlyArray<{ id: string }>;
  rounds: ReadonlyArray<Pick<Round, "roundId" | "scores">>;
  shootRecords: ReadonlyArray<{ roundId: string; shooterId: string; victimId: string; penaltyPoints: number }>;
  currentLastPlacePlayerId: string | null;
  pendingTieBreak: unknown | null;
}

/** Pemimpin tunggal (skor tertinggi tanpa seri), atau null. */
function soleLeader(totals: Record<string, number>): string | null {
  const entries = Object.entries(totals);
  if (entries.length === 0) return null;
  const max = Math.max(...entries.map(([, v]) => v));
  const top = entries.filter(([, v]) => v === max);
  return top.length === 1 ? top[0][0] : null;
}

/**
 * Kejadian dari satu ronde baru. Kosong kalau jumlah ronde tidak bertambah
 * tepat satu (mis. edit = undo + simpan ulang).
 */
export function detectRoundEvents(before: EventSnapshot, after: EventSnapshot): GameEvent[] {
  if (after.rounds.length !== before.rounds.length + 1) return [];
  const round = after.rounds[after.rounds.length - 1];
  const events: GameEvent[] = [];

  for (const s of after.shootRecords) {
    if (s.roundId !== round.roundId) continue;
    events.push({ type: "gepuk", shooterId: s.shooterId, victimId: s.victimId, points: s.penaltyPoints });
  }

  const t0 = computeTotals(before.players, before.rounds);
  const t1 = computeTotals(after.players, after.rounds);

  for (const p of after.players) {
    const a = t0[p.id] ?? 0;
    const b = t1[p.id] ?? 0;
    if (a < NYEWU_THRESHOLD && b >= NYEWU_THRESHOLD) events.push({ type: "nyewu", playerId: p.id, tone: "god" });
    if (a > -NYEWU_THRESHOLD && b <= -NYEWU_THRESHOLD) events.push({ type: "nyewu", playerId: p.id, tone: "hell" });
  }

  // Sama seperti TTS "sing jengkeng ganti": hanya kalau sebelumnya sudah ada juru kunci.
  // Kalau skor terendah seri, juru kunci baru diketahui sesudah spin (detectTieEvents).
  const prev = before.currentLastPlacePlayerId;
  const next = after.currentLastPlacePlayerId;
  if (!after.pendingTieBreak && prev && next && next !== prev) {
    events.push({ type: "jurukunci", playerId: next });
  }

  // Comeback: juru kunci sebelum ronde ini sekarang memimpin sendirian.
  if (prev && before.rounds.length > 0 && soleLeader(t1) === prev) {
    events.push({ type: "comeback", playerId: prev });
  }

  return events;
}

/** Sesudah spin seri selesai: juru kunci berganti atau tidak. */
export function detectTieEvents(beforeId: string | null, afterId: string | null): GameEvent[] {
  return beforeId && afterId && beforeId !== afterId ? [{ type: "jurukunci", playerId: afterId }] : [];
}
