import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SPIN_MAX,
  SPIN_MIN,
  computeLastPlaceSince,
  computeTotals,
  countConsecutiveLastPlace,
  drawSpin,
  evaluateTieResults,
  findTiedForLast,
  isSameSet,
  sortPlayersByTotal,
} from "./scoring";

const round = (roundId: string, finals: Record<string, number>, resolved: string | null = null) => ({
  roundId,
  resolvedLastPlaceId: resolved,
  scores: Object.entries(finals).map(([playerId, finalScore]) => ({
    playerId,
    baseScore: finalScore,
    finalScore,
  })),
});

describe("computeTotals", () => {
  const players = [{ id: "a" }, { id: "b" }];

  it("menjumlah finalScore semua ronde", () => {
    const totals = computeTotals(players, [round("1", { a: 10, b: -5 }), round("2", { a: 5, b: 0 })]);
    expect(totals).toEqual({ a: 15, b: -5 });
  });

  it("memberi 0 untuk semua pemain kalau belum ada ronde", () => {
    expect(computeTotals(players, [])).toEqual({ a: 0, b: 0 });
  });

  it("mengabaikan skor pemain yang tidak terdaftar", () => {
    const totals = computeTotals(players, [round("1", { a: 10, ghost: 999 })]);
    expect(totals).toEqual({ a: 10, b: 0 });
  });
});

describe("sortPlayersByTotal", () => {
  it("mengurutkan dari tertinggi dan tidak mengubah array asli", () => {
    const players = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const sorted = sortPlayersByTotal(players, { a: 5, b: 20, c: -3 });
    expect(sorted.map((p) => p.id)).toEqual(["b", "a", "c"]);
    expect(players.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });
});

describe("findTiedForLast", () => {
  it("mengembalikan satu pemain kalau tidak seri", () => {
    expect(findTiedForLast({ a: 10, b: 5, c: 0 })).toEqual(["c"]);
  });

  it("mengembalikan semua pemain yang skornya terendah saat seri", () => {
    expect(findTiedForLast({ a: 10, b: 0, c: 0 })).toEqual(["b", "c"]);
  });

  it("semua pemain seri di awal permainan", () => {
    expect(findTiedForLast({ a: 0, b: 0, c: 0 })).toEqual(["a", "b", "c"]);
  });

  it("skor negatif dihitung sebagai terendah", () => {
    expect(findTiedForLast({ a: 0, b: -100, c: 50 })).toEqual(["b"]);
  });
});

describe("isSameSet", () => {
  it("tidak peduli urutan", () => {
    expect(isSameSet(["a", "b"], ["b", "a"])).toBe(true);
  });
  it("beda panjang atau beda isi = beda", () => {
    expect(isSameSet(["a"], ["a", "b"])).toBe(false);
    expect(isSameSet(["a", "b"], ["a", "c"])).toBe(false);
  });
});

describe("computeLastPlaceSince", () => {
  const start = 100;

  it("tanpa juru kunci, kembali ke waktu mulai", () => {
    expect(computeLastPlaceSince([], null, start)).toBe(start);
  });

  it("menelusuri mundur selama pemain yang sama terus kena hukuman", () => {
    const rounds = [
      round("200", {}, "x"),
      round("300", {}, "c"),
      round("400", {}, "c"),
      round("500", {}, "c"),
    ];
    expect(computeLastPlaceSince(rounds, "c", start)).toBe(300);
  });

  it("berhenti begitu ada ronde dengan juru kunci lain", () => {
    const rounds = [round("200", {}, "c"), round("300", {}, "b")];
    expect(computeLastPlaceSince(rounds, "c", start)).toBe(start);
  });
});

describe("countConsecutiveLastPlace", () => {
  it("tanpa juru kunci atau tanpa ronde: 0", () => {
    expect(countConsecutiveLastPlace([], "c")).toBe(0);
    expect(countConsecutiveLastPlace([round("1", {}, "c")], null)).toBe(0);
  });

  it("menghitung mundur dari ronde terakhir sampai juru kunci lain", () => {
    const rounds = [
      round("1", {}, "c"),
      round("2", {}, "b"),
      round("3", {}, "c"),
      round("4", {}, "c"),
      round("5", {}, "c"),
    ];
    expect(countConsecutiveLastPlace(rounds, "c")).toBe(3);
  });

  it("ronde terakhir bukan dia: 0, walau dulu sering", () => {
    const rounds = [round("1", {}, "c"), round("2", {}, "c"), round("3", {}, "b")];
    expect(countConsecutiveLastPlace(rounds, "c")).toBe(0);
  });

  it("semua ronde dia: jumlah semua ronde", () => {
    const rounds = Array.from({ length: 7 }, (_, i) => round(String(i + 1), {}, "c"));
    expect(countConsecutiveLastPlace(rounds, "c")).toBe(7);
  });
});

describe("evaluateTieResults", () => {
  it("menunggu selama ada kandidat yang belum spin", () => {
    expect(evaluateTieResults(["a", "b", "c"], { a: 10 })).toEqual({
      status: "waiting",
      remaining: ["b", "c"],
    });
  });

  it("angka terendah kalah", () => {
    expect(evaluateTieResults(["a", "b"], { a: 40, b: 12 })).toEqual({
      status: "resolved",
      loserId: "b",
    });
  });

  it("seri di angka terendah = respin hanya untuk yang seri", () => {
    expect(evaluateTieResults(["a", "b", "c"], { a: 70, b: 12, c: 12 })).toEqual({
      status: "respin",
      candidates: ["b", "c"],
    });
  });
});

describe("drawSpin", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("selalu dalam rentang SPIN_MIN..SPIN_MAX dan semua angka bisa keluar", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 30000; i++) {
      const v = drawSpin();
      expect(v).toBeGreaterThanOrEqual(SPIN_MIN);
      expect(v).toBeLessThanOrEqual(SPIN_MAX);
      seen.add(v);
    }
    expect(seen.size).toBe(SPIN_MAX - SPIN_MIN + 1);
  });

  it("tidak bias: tiap angka muncul mendekati 1/100", () => {
    const counts = new Array(SPIN_MAX + 1).fill(0);
    const n = 60000;
    for (let i = 0; i < n; i++) counts[drawSpin()]++;
    // Ekspektasi 600, simpangan baku ~24. Batas 400..800 = >8 sigma, tidak flaky.
    for (let v = SPIN_MIN; v <= SPIN_MAX; v++) {
      expect(counts[v]).toBeGreaterThan(400);
      expect(counts[v]).toBeLessThan(800);
    }
  });

  it("membuang byte >= 200 (rejection sampling) lalu mengundi ulang", () => {
    const queue = [255, 200, 41];
    vi.stubGlobal("crypto", {
      getRandomValues: (buf: Uint8Array) => {
        buf[0] = queue.shift() ?? 0;
        return buf;
      },
    });
    expect(drawSpin()).toBe(SPIN_MIN + 41);
    expect(queue).toEqual([]);
  });
});
