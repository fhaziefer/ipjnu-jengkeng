import { describe, expect, it } from "vitest";
import {
  DEFAULT_TEMPLATES,
  TEMPLATE_DEFS,
  TEMPLATE_KEYS,
  getTemplateDef,
  normalizeTemplate,
  renderTemplate,
  resolveTemplates,
  validateTemplate,
} from "./speechTemplates";

describe("default template", () => {
  it("semua default lolos validasi dan tidak berubah saat dinormalisasi", () => {
    for (const def of TEMPLATE_DEFS) {
      const result = validateTemplate(def.key, def.defaultText);
      expect(result, def.key).toEqual({ ok: true, text: def.defaultText });
    }
  });

  it("placeholder di default hanya yang diizinkan, dan sample lengkap", () => {
    for (const def of TEMPLATE_DEFS) {
      const used = [...def.defaultText.matchAll(/\{(\w+)\}/g)].map((m) => m[1]);
      for (const name of used) expect(def.placeholders, def.key).toContain(name);
      for (const name of def.placeholders) expect(def.sample[name], `${def.key}.${name}`).not.toBeUndefined();
    }
  });

  it("key unik", () => {
    expect(new Set(TEMPLATE_KEYS).size).toBe(TEMPLATE_KEYS.length);
  });
});

describe("validateTemplate", () => {
  it("menolak placeholder yang tidak diizinkan untuk kalimat itu", () => {
    const r = validateTemplate("roundHeader", "Halo {nama}");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("{nama}");
  });

  it("menolak kurung kurawal menggantung", () => {
    expect(validateTemplate("scoreLine", "{nama, {skor}").ok).toBe(false);
    expect(validateTemplate("scoreLine", "nama} skor").ok).toBe(false);
  });

  it("menolak yang melebihi batas, dan batas tieIntro lebih ketat (mengunci tombol)", () => {
    const long = "a".repeat(150);
    expect(validateTemplate("tieIntro", long).ok).toBe(false);
    expect(validateTemplate("roundHeader", long).ok).toBe(true);
    expect(getTemplateDef("tieIntro").maxLength).toBeLessThan(getTemplateDef("roundHeader").maxLength);
  });

  it("teks kosong lolos (artinya dibisukan)", () => {
    expect(validateTemplate("gapWarning", "   ")).toEqual({ ok: true, text: "" });
  });

  it("membersihkan karakter kontrol dan spasi berlebih", () => {
    expect(normalizeTemplate("  a\n\n b\t c \u0000d ")).toBe("a b c d");
  });
});

describe("renderTemplate", () => {
  it("mengisi placeholder, dan yang tidak ada jadi kosong", () => {
    expect(renderTemplate("{nama} dapat {skor}", { nama: "Ani", skor: "5" })).toBe("Ani dapat 5");
    expect(renderTemplate("{nama}!", {})).toBe("!");
  });

  it("tanda $ di nilai tidak ditafsirkan sebagai pola pengganti", () => {
    expect(renderTemplate("{nama}", { nama: "$& $1 $$" })).toBe("$& $1 $$");
  });
});

describe("resolveTemplates", () => {
  it("tanpa override = default", () => {
    expect(resolveTemplates(undefined)).toEqual(DEFAULT_TEMPLATES);
    expect(resolveTemplates({})).toEqual(DEFAULT_TEMPLATES);
  });

  it("memakai override yang valid dan mengabaikan yang rusak", () => {
    const r = resolveTemplates({
      roundHeader: "Hasil ronde:",
      scoreLine: "{kacau}",
      gapWarning: "",
      // @ts-expect-error data rusak dari storage
      nyewu: 42,
    });
    expect(r.roundHeader).toBe("Hasil ronde:");
    expect(r.scoreLine).toBe(DEFAULT_TEMPLATES.scoreLine);
    expect(r.gapWarning).toBe("");
    expect(r.nyewu).toBe(DEFAULT_TEMPLATES.nyewu);
  });
});

describe("lastPlaceLong (juru kunci kelamaan)", () => {
  it("default persis kalimat yang diminta", () => {
    expect(
      renderTemplate(DEFAULT_TEMPLATES.lastPlaceLong, { nama_terburuk: "Cici" })
    ).toBe("Cici wes jengkeng luweh teko setengah jam, ndang njaluk sret wae, lek gak isin tapi");
  });

  it("hanya menerima {nama_terburuk}; yang lain ditolak", () => {
    expect(validateTemplate("lastPlaceLong", "{nama_terburuk} kelamaan").ok).toBe(true);
    const bad = validateTemplate("lastPlaceLong", "{nama} kelamaan");
    expect(bad.ok).toBe(false);
  });

  it("boleh dikosongkan (dibisukan) dan placeholder boleh dipakai berulang", () => {
    expect(validateTemplate("lastPlaceLong", "   ")).toEqual({ ok: true, text: "" });
    expect(validateTemplate("lastPlaceLong", "{nama_terburuk}, {nama_terburuk}!").ok).toBe(true);
    expect(resolveTemplates({ lastPlaceLong: "" }).lastPlaceLong).toBe("");
  });

  it("nama dengan karakter $ tidak ditafsirkan sebagai pola pengganti", () => {
    expect(renderTemplate("{nama_terburuk} ya", { nama_terburuk: "A$&B" })).toBe("A$&B ya");
  });
});

describe("lastPlaceStreak (juru kunci beruntun)", () => {
  it("default memakai nama dan jumlah ronde", () => {
    expect(
      renderTemplate(DEFAULT_TEMPLATES.lastPlaceStreak, {
        nama_terburuk: "Cici",
        berapa_kali_terbawah: "7",
      })
    ).toBe("Cici wes jengkeng ping 7 njaluk sret ora? lek gak isin");
  });

  it("menerima dua placeholder-nya; yang lain ditolak", () => {
    expect(
      validateTemplate("lastPlaceStreak", "{nama_terburuk} ping {berapa_kali_terbawah}").ok
    ).toBe(true);
    expect(validateTemplate("lastPlaceStreak", "{nama} ping {berapa_kali}").ok).toBe(false);
  });

  it("boleh tanpa placeholder atau dikosongkan (dibisukan)", () => {
    expect(validateTemplate("lastPlaceStreak", "Sret wae!").ok).toBe(true);
    expect(validateTemplate("lastPlaceStreak", "")).toEqual({ ok: true, text: "" });
  });
});
