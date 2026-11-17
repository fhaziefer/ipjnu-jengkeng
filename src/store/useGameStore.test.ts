import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "./useGameStore";

const players = [
  { id: "a", name: "Ani" },
  { id: "b", name: "Budi" },
  { id: "c", name: "Cici" },
];

type Shoot = { shooterId: string; victimId: string; penaltyPoints: number };

function play(base: Record<string, number>, shoot?: Shoot, edited = false) {
  vi.advanceTimersByTime(1000);
  useGameStore.getState().addRound(
    players.map((p) => ({ playerId: p.id, baseScore: base[p.id] })),
    shoot,
    edited
  );
}

/** Paksa hasil undian: byte b menghasilkan angka b + 1. */
function stubDraws(bytes: number[]) {
  const queue = [...bytes];
  vi.stubGlobal("crypto", {
    getRandomValues: (buf: Uint8Array) => {
      buf[0] = queue.shift() ?? 0;
      return buf;
    },
  });
}

const get = () => useGameStore.getState();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  get().resetGame();
  get().startGame(players);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("addRound", () => {
  it("tanpa seri: juru kunci langsung ketahuan, tidak ada spin", () => {
    play({ a: 10, b: 5, c: 0 });
    expect(get().pendingTieBreak).toBeNull();
    expect(get().currentLastPlacePlayerId).toBe("c");
    expect(get().rounds[0].tiedForLast).toEqual(["c"]);
    expect(get().rounds[0].resolvedLastPlaceId).toBe("c");
  });

  it("gepuk: penembak dapat +poin, korban -poin", () => {
    play({ a: 10, b: 10, c: 10 }, { shooterId: "a", victimId: "b", penaltyPoints: 100 });
    const finals = Object.fromEntries(get().rounds[0].scores.map((s) => [s.playerId, s.finalScore]));
    expect(finals).toEqual({ a: 110, b: -90, c: 10 });
    expect(get().shootRecords).toHaveLength(1);
  });

  it("seri di dasar klasemen: ronde masuk tapi hukuman menggantung", () => {
    play({ a: 10, b: 0, c: 0 });
    expect(get().rounds).toHaveLength(1);
    expect(get().pendingTieBreak?.candidates).toEqual(["b", "c"]);
    expect(get().rounds[0].resolvedLastPlaceId).toBeNull();
    expect(get().currentLastPlacePlayerId).toBeNull();
  });

  it("lastPlaceSince tidak berubah selama juru kunci sama", () => {
    play({ a: 10, b: 5, c: 0 });
    const since = get().lastPlaceSinceTimestamp;
    play({ a: 10, b: 5, c: 0 });
    expect(get().lastPlaceSinceTimestamp).toBe(since);
  });
});

describe("tie-break", () => {
  beforeEach(() => play({ a: 10, b: 0, c: 0 }));

  it("hanya kandidat yang boleh spin, dan sekali saja", () => {
    expect(get().spinTieBreak("a")).toBeNull();
    stubDraws([9]);
    expect(get().spinTieBreak("b")).toBe(10);
    expect(get().spinTieBreak("b")).toBeNull();
  });

  it("commit menunggu kalau masih ada kandidat belum spin", () => {
    stubDraws([9]);
    get().spinTieBreak("b");
    expect(get().commitTieBreak()).toEqual({ status: "waiting", remaining: ["c"] });
    expect(get().pendingTieBreak).not.toBeNull();
  });

  it("angka terendah kena hukuman dan tersimpan di ronde", () => {
    stubDraws([9, 49]);
    get().spinTieBreak("b");
    get().spinTieBreak("c");
    expect(get().commitTieBreak()).toEqual({ status: "resolved", loserId: "b" });

    expect(get().pendingTieBreak).toBeNull();
    expect(get().currentLastPlacePlayerId).toBe("b");
    expect(get().rounds[0].resolvedLastPlaceId).toBe("b");
    expect(get().rounds[0].tieBreak?.results).toEqual({ b: 10, c: 50 });
  });

  it("angka terendah kembar: respin hanya untuk yang seri", () => {
    stubDraws([9, 9]);
    get().spinTieBreak("b");
    get().spinTieBreak("c");
    expect(get().commitTieBreak()).toEqual({ status: "respin", candidates: ["b", "c"] });
    expect(get().pendingTieBreak?.results).toEqual({});
    expect(get().currentLastPlacePlayerId).toBeNull();
  });

  it("finishGame ditolak selama tie-break menggantung", () => {
    get().finishGame();
    expect(get().gameStatus).toBe("active");

    stubDraws([9, 49]);
    get().spinTieBreak("b");
    get().spinTieBreak("c");
    get().commitTieBreak();
    get().finishGame();
    expect(get().gameStatus).toBe("finished");
  });
});

describe("undo dan edit ronde", () => {
  it("undo mengembalikan juru kunci dan waktu 'sejak' dari ronde sebelumnya", () => {
    play({ a: 10, b: 5, c: 0 });
    const since = get().lastPlaceSinceTimestamp;
    play({ a: 10, b: 5, c: 0 });
    get().undoLastRound();

    expect(get().rounds).toHaveLength(1);
    expect(get().currentLastPlacePlayerId).toBe("c");
    expect(get().lastPlaceSinceTimestamp).toBe(since);
  });

  it("undo menghapus catatan gepuk ronde itu", () => {
    play({ a: 10, b: 5, c: 0 }, { shooterId: "a", victimId: "b", penaltyPoints: 100 });
    get().undoLastRound();
    expect(get().shootRecords).toEqual([]);
  });

  it("edit dengan kandidat seri yang sama memakai ulang hasil spin (bukan reroll)", () => {
    play({ a: 10, b: 0, c: 0 });
    stubDraws([9, 49]);
    get().spinTieBreak("b");
    get().spinTieBreak("c");
    get().commitTieBreak();

    get().undoLastRound();
    expect(get().carriedTieBreak?.results).toEqual({ b: 10, c: 50 });

    play({ a: 10, b: 0, c: 0 }, undefined, true);
    expect(get().pendingTieBreak).toBeNull();
    expect(get().currentLastPlacePlayerId).toBe("b");
    expect(get().rounds[0].isEdited).toBe(true);
  });

  it("edit yang mengubah kandidat seri harus spin lagi", () => {
    play({ a: 10, b: 0, c: 0 });
    stubDraws([9, 49]);
    get().spinTieBreak("b");
    get().spinTieBreak("c");
    get().commitTieBreak();

    get().undoLastRound();
    play({ a: 0, b: 0, c: 0 }, undefined, true); // semua seri sekarang
    expect(get().pendingTieBreak?.candidates).toEqual(["a", "b", "c"]);
  });

  it("undo ronde yang sedang menunggu spin membatalkan tie-break-nya", () => {
    play({ a: 10, b: 0, c: 0 });
    get().undoLastRound();
    expect(get().pendingTieBreak).toBeNull();
    expect(get().rounds).toEqual([]);
  });
});

describe("persist", () => {
  it("menulis ke key dan versi yang sama dengan produksi", () => {
    const raw = localStorage.getItem("jengkeng-score-storage");
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).version).toBe(1);
  });
});
