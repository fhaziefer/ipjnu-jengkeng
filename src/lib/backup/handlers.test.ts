import { describe, expect, it } from "vitest";
import type { GameRecord } from "@/lib/history";
import {
  handleGet,
  handlePost,
  isSameOrigin,
  parseBodyText,
  type BackupGetResponse,
  type BackupPostResponse,
} from "./handlers";
import { hashBackupCode, MemoryBackupStorage } from "./storage";
import { MAX_BODY_BYTES, MAX_GAMES_PER_CODE, MAX_GAMES_PER_REQUEST } from "./constants";

function game(id: string, finishedAt = Number(id) * 1000): GameRecord {
  return {
    id,
    startedAt: finishedAt - 600000,
    finishedAt,
    players: [
      { key: "ani", name: "Ani", total: 10 },
      { key: "budi", name: "Budi", total: -5 },
    ],
    winnerKey: "ani",
    loserKey: "budi",
    rounds: [[10, -5]],
    shoots: [],
    tieBreaks: 0,
  };
}

const post = (storage: MemoryBackupStorage, body: object) => handlePost(body, storage);
const asPost = (r: { body: unknown }) => r.body as unknown as BackupPostResponse;
const asGet = (r: { body: unknown }) => r.body as unknown as BackupGetResponse;

describe("handlePost", () => {
  it("menyimpan game dan mengakui id-nya", async () => {
    const storage = new MemoryBackupStorage();
    const r = await post(storage, { code: "0000", games: [game("1"), game("2")] });

    expect(r.status).toBe(200);
    expect(asPost(r).acked).toEqual(["1", "2"]);
    expect(asPost(r).inserted).toBe(2);
    expect(asPost(r).total).toBe(2);
  });

  it("idempoten: kirim ulang tidak menggandakan, id tetap diakui", async () => {
    const storage = new MemoryBackupStorage();
    await post(storage, { code: "0000", games: [game("1")] });
    const again = await post(storage, { code: "0000", games: [game("1"), game("2")] });

    expect(asPost(again).inserted).toBe(1);
    expect(asPost(again).acked).toEqual(["1", "2"]);
    expect(asPost(again).total).toBe(2);
  });

  it("append-only: game dengan id sama tidak menimpa isi yang sudah ada", async () => {
    const storage = new MemoryBackupStorage();
    await post(storage, { code: "0000", games: [game("1")] });

    const tampered = { ...game("1"), players: [
      { key: "ani", name: "DIUBAH", total: 10 },
      { key: "budi", name: "Budi", total: -5 },
    ] };
    await post(storage, { code: "0000", games: [tampered] });

    const stored = await storage.listGames(hashBackupCode("0000"));
    expect(stored[0].players[0].name).toBe("Ani");
  });

  it("record rusak ditolak permanen dan dilaporkan lewat rejectedIds", async () => {
    const storage = new MemoryBackupStorage();
    const broken = { ...game("9"), rounds: [] };
    const r = await post(storage, { code: "0000", games: [game("1"), broken] });

    expect(asPost(r).acked).toEqual(["1"]);
    expect(asPost(r).rejectedIds).toEqual(["9"]);
    expect(asPost(r).total).toBe(1);
  });

  it("menolak record yang kelewat besar walau lolos isValidGameRecord", async () => {
    const storage = new MemoryBackupStorage();
    const longName = "x".repeat(41);
    const bigName = { ...game("3"), players: [
      { key: "ani", name: longName, total: 1 },
      { key: "budi", name: "Budi", total: 1 },
    ] };
    const manyRounds = { ...game("4"), rounds: Array.from({ length: 501 }, () => [1, 1]) };

    const r = await post(storage, { code: "0000", games: [bigName, manyRounds] });
    expect(asPost(r).acked).toEqual([]);
    expect(asPost(r).rejectedIds.sort()).toEqual(["3", "4"]);
  });

  it("kode tidak valid ditolak 400", async () => {
    const storage = new MemoryBackupStorage();
    expect((await post(storage, { games: [] })).status).toBe(400);
    expect((await post(storage, { code: "ab", games: [] })).status).toBe(400);
    expect((await post(storage, { code: "a b c d", games: [] })).status).toBe(400);
    expect((await post(storage, { code: 1234, games: [] })).status).toBe(400);
  });

  it("lebih dari batas per permintaan ditolak 413", async () => {
    const storage = new MemoryBackupStorage();
    const games = Array.from({ length: MAX_GAMES_PER_REQUEST + 1 }, (_, i) => game(String(i + 1)));
    expect((await post(storage, { code: "0000", games })).status).toBe(413);
  });

  it("melewati batas total per kode ditolak 422 dan tidak menyimpan apa pun", async () => {
    const storage = new MemoryBackupStorage();
    const hash = hashBackupCode("0000");
    // Isi sampai tepat batas, lalu kirim satu lagi.
    const filler = Array.from({ length: MAX_GAMES_PER_CODE }, (_, i) => game(String(i + 1)));
    await storage.putGames(hash, filler);

    const r = await post(storage, { code: "0000", games: [game("999999")] });
    expect(r.status).toBe(422);
    expect(await storage.countGames(hash)).toBe(MAX_GAMES_PER_CODE);
  });

  it("tanpa storage (DATABASE_URL belum diset) membalas 503", async () => {
    expect((await handlePost({ code: "0000", games: [] }, null)).status).toBe(503);
    expect((await handleGet("0000", null)).status).toBe(503);
  });

  it("pengaturan TTS disimpan, tapi yang kosong tidak pernah menimpa", async () => {
    const storage = new MemoryBackupStorage();
    const saved = await post(storage, { code: "0000", settings: { gepuk: "Mantap {penembak}" } });
    expect(asPost(saved).settingsSaved).toBe(true);

    const empty = await post(storage, { code: "0000", settings: {} });
    expect(asPost(empty).settingsSaved).toBe(false);

    const got = asGet(await handleGet("0000", storage));
    expect(got.settings).toEqual({ gepuk: "Mantap {penembak}" });
  });

  it("pengaturan: kunci asing dan placeholder tak dikenal dibuang", async () => {
    const storage = new MemoryBackupStorage();
    await post(storage, {
      code: "0000",
      settings: { gepuk: "ok {penembak}", kunciAsing: "x", nyewu: "halo {tidak_ada}" },
    });
    const got = asGet(await handleGet("0000", storage));
    expect(got.settings).toEqual({ gepuk: "ok {penembak}" });
  });
});

describe("handleGet", () => {
  it("mengembalikan game urut kronologis, terpisah per kode", async () => {
    const storage = new MemoryBackupStorage();
    await post(storage, { code: "0000", games: [game("3"), game("1"), game("2")] });
    await post(storage, { code: "9999", games: [game("7")] });

    const a = asGet(await handleGet("0000", storage));
    expect(a.games.map((g) => g.id)).toEqual(["1", "2", "3"]);

    const b = asGet(await handleGet("9999", storage));
    expect(b.games.map((g) => g.id)).toEqual(["7"]);
  });

  it("kode kosong atau salah bentuk ditolak", async () => {
    const storage = new MemoryBackupStorage();
    expect((await handleGet(null, storage)).status).toBe(400);
    expect((await handleGet("x", storage)).status).toBe(400);
  });
});

describe("hashBackupCode", () => {
  it("deterministik dan tidak memuat kode mentah", () => {
    expect(hashBackupCode("0000")).toBe(hashBackupCode("0000"));
    expect(hashBackupCode("0000")).not.toContain("0000".repeat(2));
    expect(hashBackupCode("0000")).not.toBe(hashBackupCode("0001"));
    expect(hashBackupCode("0000")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("parseBodyText", () => {
  it("menolak body kebesaran, bukan JSON, dan bukan object", () => {
    expect(parseBodyText("x".repeat(MAX_BODY_BYTES + 1))).toBe("too-large");
    expect(parseBodyText("{rusak")).toBeNull();
    expect(parseBodyText("[1,2]")).toBeNull();
    expect(parseBodyText("null")).toBeNull();
    expect(parseBodyText('{"code":"0000"}')).toEqual({ code: "0000" });
  });
});

describe("isSameOrigin", () => {
  it("origin sama atau tanpa origin lolos, origin lain ditolak", () => {
    expect(isSameOrigin(null, "app.vercel.app")).toBe(true);
    expect(isSameOrigin("https://app.vercel.app", "app.vercel.app")).toBe(true);
    expect(isSameOrigin("https://jahat.example", "app.vercel.app")).toBe(false);
    expect(isSameOrigin("bukan-url", "app.vercel.app")).toBe(false);
  });
});
