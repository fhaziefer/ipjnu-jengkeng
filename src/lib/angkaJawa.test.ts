import { describe, expect, it } from "vitest";
import { MAX_ANGKA_JAWA, angkaJawa } from "./angkaJawa";
import { renderTemplate } from "./speechTemplates";

const GOLDEN: Array<[number, string]> = [
  [0, "nol"], [1, "siji"], [2, "loro"], [3, "telu"], [4, "papat"], [5, "limo"],
  [6, "enem"], [7, "pitu"], [8, "wolu"], [9, "songo"],
  [10, "sepuluh"], [11, "sewelas"], [12, "rolas"], [13, "telulas"], [14, "patbelas"],
  [15, "limolas"], [16, "nembelas"], [17, "pitulas"], [18, "wolulas"], [19, "songolas"],
  [20, "rongpuluh"], [21, "selikur"], [22, "rolikur"], [23, "telulikur"], [24, "patlikur"],
  [25, "selawe"], [26, "nemlikur"], [27, "pitulikur"], [28, "wolulikur"], [29, "songolikur"],
  [30, "telungpuluh"], [31, "telungpuluh siji"], [40, "patangpuluh"], [45, "patangpuluh limo"],
  [50, "seket"], [51, "seket siji"], [60, "sewidak"], [66, "sewidak enem"],
  [70, "pitungpuluh"], [80, "wolungpuluh"], [90, "songongpuluh"], [99, "songongpuluh songo"],
  [100, "satus"], [101, "satus siji"], [110, "satus sepuluh"], [111, "satus sewelas"],
  [112, "satus rolas"], [125, "satus selawe"], [150, "satus seket"], [199, "satus songongpuluh songo"],
  [200, "rongatus"], [300, "telungatus"], [400, "patangatus"], [500, "limangatus"],
  [600, "nematus"], [700, "pitungatus"], [800, "wolungatus"], [900, "songongatus"],
  [1000, "sewu"], [1005, "sewu limo"], [1250, "sewu rongatus seket"], [1999, "sewu songongatus songongpuluh songo"],
  [2000, "rongewu"], [3000, "telungewu"], [6000, "nemewu"], [9999, "songongewu songongatus songongpuluh songo"],
  [10000, "sepuluh ewu"], [12000, "rolas ewu"], [25000, "selawe ewu"], [999999, "songongatus songongpuluh songo ewu songongatus songongpuluh songo"],
];

describe("angkaJawa", () => {
  it.each(GOLDEN)("%i -> %s", (n, kata) => {
    expect(angkaJawa(n)).toBe(kata);
  });

  it("negatif diawali minus", () => {
    expect(angkaJawa(-90)).toBe("minus songongpuluh");
    expect(angkaJawa(-1)).toBe("minus siji");
    expect(angkaJawa(-1250)).toBe("minus sewu rongatus seket");
  });

  it("di luar jangkauan atau bukan bilangan bulat kembali ke digit, tidak crash", () => {
    expect(angkaJawa(MAX_ANGKA_JAWA + 1)).toBe("1000000");
    expect(angkaJawa(-1_000_000)).toBe("-1000000");
    expect(angkaJawa(1.5)).toBe("1.5");
    expect(angkaJawa(Number.NaN)).toBe("NaN");
    expect(angkaJawa(Infinity)).toBe("Infinity");
  });

  it("sifat: -9999..9999 tidak ada digit, tidak kosong, tanpa spasi ganda/ujung, semua unik", () => {
    const seen = new Map<string, number>();
    for (let n = -9999; n <= 9999; n++) {
      const kata = angkaJawa(n);
      expect(kata, String(n)).not.toMatch(/\d/);
      expect(kata.length, String(n)).toBeGreaterThan(0);
      expect(kata, String(n)).not.toMatch(/\s{2,}|^\s|\s$/);
      expect(seen.has(kata), `${n} bentrok dengan ${seen.get(kata)}`).toBe(false);
      seen.set(kata, n);
    }
  });
});

describe("renderTemplate dengan number", () => {
  it("number dibaca Jawa, string apa adanya (nama dengan digit tidak berubah)", () => {
    expect(renderTemplate("{nama}, {skor} ...", { nama: "Dodo 2", skor: 150 })).toBe("Dodo 2, satus seket ...");
    expect(renderTemplate("{nama}, {skor}", { nama: "Dodo", skor: -90 })).toBe("Dodo, minus songongpuluh");
  });

  it("string berisi digit tidak diubah", () => {
    expect(renderTemplate("{x}", { x: "150" })).toBe("150");
  });

  it("variabel yang tidak ada jadi kosong", () => {
    expect(renderTemplate("a{x}b", {})).toBe("ab");
  });
});
