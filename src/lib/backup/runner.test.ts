import { beforeEach, describe, expect, it } from "vitest";
import type { GameRecord } from "@/lib/history";
import { HISTORY_STORAGE_KEY, useHistoryStore } from "@/store/useHistoryStore";
import { SETTINGS_STORAGE_KEY, useSettingsStore } from "@/store/useSettingsStore";
import { useSyncStore } from "@/store/useSyncStore";
import { handleGet, handlePost } from "./handlers";
import { MemoryBackupStorage } from "./storage";
import { resetRunnerForTests, restoreFromServer, runBackupNow } from "./runner";

const GAME_STORAGE_KEY = "jengkeng-score-storage";

function game(id: string): GameRecord {
  return {
    id,
    startedAt: 1,
    finishedAt: Number(id),
    players: [
      { key: "a", name: "A", total: 1 },
      { key: "b", name: "B", total: 0 },
    ],
    winnerKey: "a",
    loserKey: "b",
    rounds: [[1, 0]],
    shoots: [],
    tieBreaks: 0,
  };
}

/** fetch palsu yang berbicara ke handler sungguhan dengan storage memori. */
function serverFetch(storage: MemoryBackupStorage) {
  const log: Array<{ method: string; url: string }> = [];
  const impl = (async (url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    log.push({ method, url });
    const result =
      method === "POST"
        ? await handlePost(JSON.parse(String(init?.body)), storage)
        : await handleGet(new URL(url, "http://x").searchParams.get("code"), storage);
    return new Response(JSON.stringify(result.body), { status: result.status });
  }) as typeof fetch;
  return { impl, log };
}

const failingFetch = (status: number) =>
  (async () => new Response("{}", { status })) as typeof fetch;
const throwingFetch = (async () => {
  throw new TypeError("network down");
}) as typeof fetch;

beforeEach(() => {
  localStorage.clear();
  resetRunnerForTests();
  useHistoryStore.setState({ games: [] });
  useSettingsStore.setState({ overrides: {} });
  useSyncStore.setState({ doneIds: [], syncedSettingsKey: null, lastSyncAt: null, lastResult: null });
});

describe("runBackupNow", () => {
  it("backup pertama mengirim semua riwayat lama, buka kedua tidak mengirim apa pun", async () => {
    useHistoryStore.setState({ games: [game("1"), game("2"), game("3")] });
    const storage = new MemoryBackupStorage();
    const { impl, log } = serverFetch(storage);

    expect(await runBackupNow({ fetchImpl: impl })).toBe("ok");
    expect(log).toHaveLength(1);
    expect(useSyncStore.getState().doneIds.sort()).toEqual(["1", "2", "3"]);
    expect(useSyncStore.getState().lastResult).toBe("ok");

    expect(await runBackupNow({ fetchImpl: impl })).toBe("nothing");
    expect(log).toHaveLength(1); // tidak ada request baru
  });

  it("sinkronisasi TIDAK menyentuh byte store riwayat dan store game", async () => {
    useHistoryStore.setState({ games: [game("1"), game("2")] });
    localStorage.setItem(GAME_STORAGE_KEY, '{"state":{"players":[]},"version":1}');
    useSettingsStore.setState({ overrides: { gepuk: "Mantap {penembak}" } });

    const before = {
      history: localStorage.getItem(HISTORY_STORAGE_KEY),
      game: localStorage.getItem(GAME_STORAGE_KEY),
      settings: localStorage.getItem(SETTINGS_STORAGE_KEY),
    };

    await runBackupNow({ fetchImpl: serverFetch(new MemoryBackupStorage()).impl });

    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBe(before.history);
    expect(localStorage.getItem(GAME_STORAGE_KEY)).toBe(before.game);
    expect(localStorage.getItem(SETTINGS_STORAGE_KEY)).toBe(before.settings);
    expect(localStorage.getItem("jengkeng-sync")).not.toBeNull();
  });

  it("game baru selesai sesudahnya: hanya game itu yang dikirim", async () => {
    const storage = new MemoryBackupStorage();
    const { impl, log } = serverFetch(storage);

    useHistoryStore.setState({ games: [game("1")] });
    await runBackupNow({ fetchImpl: impl });

    useHistoryStore.setState({ games: [game("1"), game("2")] });
    await runBackupNow({ fetchImpl: impl });

    expect(log).toHaveLength(2);
    expect(await storage.countGames((await import("./storage")).hashBackupCode("0000"))).toBe(2);
  });

  for (const status of [500, 429, 503]) {
    it(`server ${status}: tidak melempar, tidak ada yang ditandai selesai, lalu jeda`, async () => {
      useHistoryStore.setState({ games: [game("1")] });
      let clock = 1_000_000;
      const now = () => clock;

      expect(await runBackupNow({ fetchImpl: failingFetch(status), now })).toBe("failed");
      expect(useSyncStore.getState().doneIds).toEqual([]);
      expect(useSyncStore.getState().lastResult).toBe("failed");

      // Masih dalam jeda: dilewati tanpa menyentuh jaringan.
      clock += 5_000;
      const { impl, log } = serverFetch(new MemoryBackupStorage());
      expect(await runBackupNow({ fetchImpl: impl, now })).toBe("skipped");
      expect(log).toHaveLength(0);

      // "Kirim sekarang" (force) menembus jeda dan berhasil begitu server pulih.
      expect(await runBackupNow({ fetchImpl: impl, now, force: true })).toBe("ok");
      expect(useSyncStore.getState().doneIds).toEqual(["1"]);
    });
  }

  it("jaringan mati / timeout (fetch melempar): tidak melempar, riwayat utuh", async () => {
    useHistoryStore.setState({ games: [game("1")] });
    const before = localStorage.getItem(HISTORY_STORAGE_KEY);

    expect(await runBackupNow({ fetchImpl: throwingFetch })).toBe("failed");
    expect(localStorage.getItem(HISTORY_STORAGE_KEY)).toBe(before);
    expect(useHistoryStore.getState().games).toHaveLength(1);
  });

  it("respons 200 tapi bentuknya rusak dianggap gagal", async () => {
    useHistoryStore.setState({ games: [game("1")] });
    const garbage = (async () => new Response("<html>oops</html>", { status: 200 })) as typeof fetch;

    expect(await runBackupNow({ fetchImpl: garbage })).toBe("failed");
    expect(useSyncStore.getState().doneIds).toEqual([]);
  });

  it("dua pemanggilan serentak digabung: satu request, bukan dua", async () => {
    useHistoryStore.setState({ games: [game("1")] });
    const { impl, log } = serverFetch(new MemoryBackupStorage());

    const [a, b] = await Promise.all([
      runBackupNow({ fetchImpl: impl }),
      runBackupNow({ fetchImpl: impl }),
    ]);

    expect(a).toBe("ok");
    expect(b).toBe("ok");
    expect(log).toHaveLength(1);
  });

  it("game yang masuk saat run berjalan tidak ketinggalan (run ulang)", async () => {
    useHistoryStore.setState({ games: [game("1")] });
    const storage = new MemoryBackupStorage();
    const real = serverFetch(storage);

    let first = true;
    const impl = (async (url: string, init?: RequestInit) => {
      if (first) {
        first = false;
        // Game kedua selesai tepat saat request pertama sedang terbang.
        useHistoryStore.setState({ games: [game("1"), game("2")] });
        void runBackupNow({ fetchImpl: real.impl });
      }
      return real.impl(url, init);
    }) as typeof fetch;

    await runBackupNow({ fetchImpl: impl });
    expect(useSyncStore.getState().doneIds.sort()).toEqual(["1", "2"]);
  });
});

describe("restoreFromServer", () => {
  it("hapus data lalu pulihkan: riwayat kembali, dan tidak dikirim balik", async () => {
    const storage = new MemoryBackupStorage();
    const { impl, log } = serverFetch(storage);

    useHistoryStore.setState({ games: [game("1"), game("2")] });
    await runBackupNow({ fetchImpl: impl });

    // Simulasi: data browser terhapus total.
    localStorage.clear();
    useHistoryStore.setState({ games: [] });
    useSyncStore.setState({ doneIds: [], syncedSettingsKey: null, lastSyncAt: null, lastResult: null });

    const res = await restoreFromServer({ fetchImpl: impl });
    expect(res).toEqual({ ok: true, added: 2, total: 2, settingsRestored: 0 });
    expect(useHistoryStore.getState().games.map((g) => g.id)).toEqual(["1", "2"]);

    const postsBefore = log.filter((l) => l.method === "POST").length;
    expect(await runBackupNow({ fetchImpl: impl })).toBe("nothing");
    expect(log.filter((l) => l.method === "POST").length).toBe(postsBefore);
  });

  it("menggabungkan, tidak menimpa: game lokal yang belum tercadang tetap ada", async () => {
    const storage = new MemoryBackupStorage();
    const { impl } = serverFetch(storage);

    useHistoryStore.setState({ games: [game("1")] });
    await runBackupNow({ fetchImpl: impl });

    useHistoryStore.setState({ games: [game("1"), game("5")] }); // 5 belum tercadang
    const res = await restoreFromServer({ fetchImpl: impl });

    expect(res).toEqual({ ok: true, added: 0, total: 1, settingsRestored: 0 });
    expect(useHistoryStore.getState().games.map((g) => g.id)).toEqual(["1", "5"]);
  });

  it("kalimat TTS hanya mengisi yang kosong, tidak menimpa yang sudah diubah di HP ini", async () => {
    const storage = new MemoryBackupStorage();
    const { impl } = serverFetch(storage);

    useSettingsStore.setState({ overrides: { gepuk: "dari server {penembak}", nyewu: "server {nama}" } });
    await runBackupNow({ fetchImpl: impl });

    useSettingsStore.setState({ overrides: { gepuk: "lokal {penembak}" } });
    const res = await restoreFromServer({ fetchImpl: impl });

    expect(res).toMatchObject({ ok: true, settingsRestored: 1 });
    expect(useSettingsStore.getState().overrides).toEqual({
      gepuk: "lokal {penembak}",
      nyewu: "server {nama}",
    });
  });

  it("server tidak terjangkau: ok false, riwayat lokal tidak berubah", async () => {
    useHistoryStore.setState({ games: [game("1")] });
    expect(await restoreFromServer({ fetchImpl: failingFetch(500) })).toEqual({ ok: false });
    expect(await restoreFromServer({ fetchImpl: throwingFetch })).toEqual({ ok: false });
    expect(useHistoryStore.getState().games).toHaveLength(1);
  });
});
