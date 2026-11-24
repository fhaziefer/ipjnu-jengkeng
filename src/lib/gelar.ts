import { computeStats, type GameRecord, type PlayerStats } from "./history";
import { MIN_GAMES_FOR_RATE } from "./hallOfFame";

/**
 * Gelar otomatis dari riwayat. Syarat sama dengan persentase menang di Hall
 * of Fame: pemain minimal MIN_GAMES_FOR_RATE game, supaya satu malam
 * beruntung tidak langsung jadi gelar. Nilai nol tidak dapat gelar. Seri:
 * semua pemegang dapat. Satu pemain boleh punya beberapa gelar.
 *
 * Pemain dikenali dari nama (lewat key riwayat), jadi beda ejaan = beda orang.
 */

export type GelarId = "rajaMenang" | "juruKunciAbadi" | "rajaGepuk" | "langgananDigepuk" | "jawaraNyewu";

export const GELAR_INFO: Record<GelarId, { label: string; emoji: string; unit: string; pick: (p: PlayerStats) => number }> = {
  rajaMenang: { label: "Raja Menang", emoji: "👑", unit: "menang", pick: (p) => p.wins },
  juruKunciAbadi: { label: "Juru Kunci Abadi", emoji: "💩", unit: "kali jengkeng", pick: (p) => p.losses },
  rajaGepuk: { label: "Raja Gepuk", emoji: "👊🏻", unit: "gepuk", pick: (p) => p.shotsGiven },
  langgananDigepuk: { label: "Langganan Digepuk", emoji: "🤕", unit: "kali digepuk", pick: (p) => p.shotsTaken },
  jawaraNyewu: { label: "Jawara Nyewu", emoji: "", unit: "kali nyewu", pick: (p) => p.nyewu },
};

export const GELAR_ORDER: GelarId[] = ["rajaMenang", "jawaraNyewu", "rajaGepuk", "juruKunciAbadi", "langgananDigepuk"];

export interface Gelar {
  id: GelarId;
  value: number;
  holders: Array<{ key: string; name: string }>;
}

export function computeGelar(games: ReadonlyArray<GameRecord>): Gelar[] {
  const eligible = computeStats(games).players.filter((p) => p.games >= MIN_GAMES_FOR_RATE);
  if (eligible.length === 0) return [];

  const result: Gelar[] = [];
  for (const id of GELAR_ORDER) {
    const pick = GELAR_INFO[id].pick;
    const max = Math.max(...eligible.map(pick));
    if (max <= 0) continue;
    result.push({
      id,
      value: max,
      holders: eligible.filter((p) => pick(p) === max).map((p) => ({ key: p.key, name: p.name })),
    });
  }
  return result;
}

/** Gelar milik satu pemain (key riwayat). */
export function gelarOf(gelar: ReadonlyArray<Gelar>, key: string): Gelar[] {
  return gelar.filter((g) => g.holders.some((h) => h.key === key));
}
