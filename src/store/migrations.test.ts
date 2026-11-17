import { describe, expect, it } from "vitest";
import { migrateGameState } from "./migrations";

const score = (playerId: string, finalScore: number) => ({
  playerId,
  baseScore: finalScore,
  finalScore,
});

describe("migrateGameState v0 -> v1", () => {
  it("memindahkan `initials` ke `name` dan merapikan spasi", () => {
    const out = migrateGameState(
      { players: [{ id: "a", initials: "  BGN " }, { id: "b", name: "Mas Budi" }], rounds: [] },
      0
    );
    expect(out.players).toEqual([
      { id: "a", name: "BGN" },
      { id: "b", name: "Mas Budi" },
    ]);
  });

  it("merekonstruksi tiedForLast dan juru kunci 'sticky' seperti algoritma lama", () => {
    const out = migrateGameState(
      {
        players: [{ id: "a", initials: "A" }, { id: "b", initials: "B" }],
        rounds: [
          { roundId: "1", scores: [score("a", 10), score("b", 0)] }, // a10 b0   -> b
          { roundId: "2", scores: [score("a", 0), score("b", 10)] }, // a10 b10  -> seri, tetap b
          { roundId: "3", scores: [score("a", 0), score("b", 5)] }, //  a10 b15  -> a
        ],
      },
      0
    );

    expect(out.rounds.map((r) => r.tiedForLast)).toEqual([["b"], ["a", "b"], ["a"]]);
    expect(out.rounds.map((r) => r.resolvedLastPlaceId)).toEqual(["b", "b", "a"]);
  });

  it("membuang sisa tie-break yang menggantung", () => {
    const out = migrateGameState({ players: [], rounds: [], pendingTieBreak: { roundId: "x" } }, 0);
    expect(out.pendingTieBreak).toBeNull();
    expect(out.carriedTieBreak).toBeNull();
  });

  it("tidak menyentuh state yang sudah versi 1", () => {
    const state = { players: [{ id: "a", name: "A" }], rounds: [] };
    expect(migrateGameState(state, 1)).toBe(state);
  });
});
