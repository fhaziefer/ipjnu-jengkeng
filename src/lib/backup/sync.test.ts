import { describe, expect, it } from "vitest";
import type { GameRecord } from "@/lib/history";
import { MAX_GAMES_PER_REQUEST } from "./constants";
import { pendingGames, runBackup, settingsKey, type Send } from "./sync";
import type { BackupPostPayload } from "./types";

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

const games = (n: number) => Array.from({ length: n }, (_, i) => game(String(i + 1)));

/** Server palsu: mengakui semua game, menolak id yang ada di `reject`. */
function fakeServer(opts: { reject?: string[]; failOnCall?: number; failStatus?: number | null } = {}) {
  const calls: BackupPostPayload[] = [];
  const send: Send = async (payload) => {
    calls.push(payload);
    if (opts.failOnCall === calls.length) return { ok: false, status: opts.failStatus ?? null };

    const ids = (payload.games ?? []).map((g) => g.id);
    const rejected = ids.filter((id) => opts.reject?.includes(id));
    return {
      ok: true,
      data: {
        ok: true,
        acked: ids.filter((id) => !rejected.includes(id)),
        rejectedIds: rejected,
        inserted: ids.length,
        settingsSaved: payload.settings !== undefined,
        total: 0,
      },
    };
  };
  return { calls, send };
}

const base = { overrides: {}, syncedSettingsKey: null, doneIds: new Set<string>() };

describe("runBackup", () => {
  it("tidak ada yang tertunda dan pengaturan kosong: tidak ada request sama sekali", async () => {
    const { calls, send } = fakeServer();
    const out = await runBackup({ ...base, games: games(3), doneIds: new Set(["1", "2", "3"]) }, send);

    expect(calls).toHaveLength(0);
    expect(out.requests).toBe(0);
    expect(out.failed).toBe(false);
  });

  it("hanya mengirim game yang belum diakui", async () => {
    const { calls, send } = fakeServer();
    const out = await runBackup({ ...base, games: games(4), doneIds: new Set(["1", "2"]) }, send);

    expect(calls).toHaveLength(1);
    expect(calls[0].games?.map((g) => g.id)).toEqual(["3", "4"]);
    expect(out.newDoneIds).toEqual(["3", "4"]);
  });

  it("backfill besar dipecah per batas permintaan", async () => {
    const { calls, send } = fakeServer();
    const total = MAX_GAMES_PER_REQUEST * 2 + 7;
    const out = await runBackup({ ...base, games: games(total) }, send);

    expect(calls.map((c) => c.games?.length)).toEqual([MAX_GAMES_PER_REQUEST, MAX_GAMES_PER_REQUEST, 7]);
    expect(out.newDoneIds).toHaveLength(total);
    expect(out.failed).toBe(false);
  });

  it("gagal di tengah: batch yang sudah berhasil tetap dilaporkan, sisanya berhenti", async () => {
    const { calls, send } = fakeServer({ failOnCall: 2, failStatus: 500 });
    const total = MAX_GAMES_PER_REQUEST * 3;
    const out = await runBackup({ ...base, games: games(total) }, send);

    expect(calls).toHaveLength(2);
    expect(out.failed).toBe(true);
    expect(out.failStatus).toBe(500);
    expect(out.newDoneIds).toHaveLength(MAX_GAMES_PER_REQUEST);
  });

  it("id yang ditolak permanen dianggap selesai supaya tidak dikirim berulang", async () => {
    const { send } = fakeServer({ reject: ["2"] });
    const out = await runBackup({ ...base, games: games(3) }, send);

    expect(out.newDoneIds.sort()).toEqual(["1", "2", "3"]);
  });

  it("pengaturan ikut di request pertama saja, dan hanya kalau berubah", async () => {
    const { calls, send } = fakeServer();
    const overrides = { gepuk: "Mantap {penembak}" };

    const first = await runBackup({ ...base, games: games(MAX_GAMES_PER_REQUEST + 1), overrides }, send);
    expect(calls[0].settings).toEqual(overrides);
    expect(calls[1].settings).toBeUndefined();
    expect(first.syncedSettingsKey).toBe(settingsKey(overrides));

    // Sudah tersinkron dan tidak ada game baru: tidak ada request.
    const second = await runBackup(
      {
        ...base,
        games: [],
        overrides,
        syncedSettingsKey: first.syncedSettingsKey,
      },
      send
    );
    expect(second.requests).toBe(0);
  });

  it("pengaturan berubah tanpa game baru: satu request tanpa game", async () => {
    const { calls, send } = fakeServer();
    const out = await runBackup({ ...base, games: [], overrides: { nyewu: "Nyewu {nama}" } }, send);

    expect(calls).toHaveLength(1);
    expect(calls[0].games).toEqual([]);
    expect(out.syncedSettingsKey).not.toBeNull();
  });

  it("pengaturan kosong tidak pernah dikirim (tidak menghapus cadangan lama)", async () => {
    const { calls, send } = fakeServer();
    await runBackup({ ...base, games: [], overrides: {}, syncedSettingsKey: "kunci-lama" }, send);
    expect(calls).toHaveLength(0);
  });

  it("kode yang dikirim selalu 0000", async () => {
    const { calls, send } = fakeServer();
    await runBackup({ ...base, games: games(1) }, send);
    expect(calls[0].code).toBe("0000");
  });
});

describe("settingsKey & pendingGames", () => {
  it("kunci stabil terhadap urutan kunci, null untuk kosong", () => {
    expect(settingsKey({})).toBeNull();
    expect(settingsKey({ gepuk: "a", nyewu: "b" })).toBe(settingsKey({ nyewu: "b", gepuk: "a" }));
    expect(settingsKey({ gepuk: "a" })).not.toBe(settingsKey({ gepuk: "b" }));
  });

  it("pendingGames membuang yang sudah selesai", () => {
    expect(pendingGames(games(3), new Set(["2"])).map((g) => g.id)).toEqual(["1", "3"]);
  });
});
