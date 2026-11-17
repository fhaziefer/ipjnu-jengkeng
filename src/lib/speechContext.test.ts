import { describe, expect, it } from "vitest";
import { NO_LAST_PLACE_WORD, buildSretVars, buildTieIntroVars, joinSpeechNames } from "./speechContext";

const players = [
  { id: "a", name: "Mas Bagong" },
  { id: "b", name: "Budi" },
  { id: "c", name: "BGN" },
  { id: "d", name: "Dodo" },
];

describe("joinSpeechNames", () => {
  it("menyambung 0, 1, 2, dan 3+ nama", () => {
    expect(joinSpeechNames([])).toBe("");
    expect(joinSpeechNames(["Ani"])).toBe("Ani");
    expect(joinSpeechNames(["Ani", "Budi"])).toBe("Ani dan Budi");
    expect(joinSpeechNames(["Ani", "Budi", "Cici"])).toBe("Ani, Budi dan Cici");
  });
});

describe("buildSretVars", () => {
  it("mengisi nama juru kunci", () => {
    expect(buildSretVars(players, "d")).toEqual({ nama_terburuk: "Dodo" });
  });

  it("memakai ejaan TTS yang sama dengan pengumuman (nama pendek dieja)", () => {
    expect(buildSretVars(players, "c").nama_terburuk).toBe("B. G. N");
  });

  it("belum ada juru kunci atau id tidak dikenal = kata cadangan, bukan kosong", () => {
    expect(buildSretVars(players, null)).toEqual({ nama_terburuk: NO_LAST_PLACE_WORD });
    expect(buildSretVars(players, "zzz")).toEqual({ nama_terburuk: NO_LAST_PLACE_WORD });
  });
});

describe("buildTieIntroVars", () => {
  it("menyebut semua pemain yang seri", () => {
    expect(buildTieIntroVars(players, ["b", "d"])).toEqual({ kandidat_seri: "Budi dan Dodo" });
    expect(buildTieIntroVars(players, ["a", "b", "d"])).toEqual({
      kandidat_seri: "Mas Bagong, Budi dan Dodo",
    });
  });

  it("id yang tidak dikenal dilewati", () => {
    expect(buildTieIntroVars(players, ["b", "zzz"])).toEqual({ kandidat_seri: "Budi" });
  });
});
