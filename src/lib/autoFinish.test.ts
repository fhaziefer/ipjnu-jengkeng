import { describe, expect, it } from "vitest";
import {
  AUTO_FINISH_IDLE_MS,
  RESUME_WINDOW_MS,
  canResume,
  dueAutoFinish,
  heldBackupId,
  lastActivity,
  type IdleSnapshot,
} from "./autoFinish";

const START = 1_000_000;
const snap = (o: Partial<IdleSnapshot> = {}): IdleSnapshot => ({
  gameStatus: "active",
  gameStartTime: START,
  lastActivityAt: START + 5_000,
  rounds: [{ roundId: String(START + 5_000) }],
  pendingTieBreak: null,
  ...o,
});

describe("lastActivity", () => {
  it("ambil yang paling akhir dari lastActivityAt, mulai game, dan ronde terakhir", () => {
    expect(lastActivity(snap({ lastActivityAt: START + 9_000 }))).toBe(START + 9_000);
    expect(lastActivity(snap({ lastActivityAt: START + 1, rounds: [{ roundId: String(START + 7_000) }] }))).toBe(
      START + 7_000
    );
  });

  it("data lama tanpa lastActivityAt jatuh ke ronde terakhir / mulai game", () => {
    expect(lastActivity(snap({ lastActivityAt: undefined }))).toBe(START + 5_000);
    expect(lastActivity(snap({ lastActivityAt: null, rounds: [] }))).toBe(START);
    expect(lastActivity(snap({ lastActivityAt: null, rounds: [], gameStartTime: null }))).toBeNull();
  });

  it("roundId rusak diabaikan", () => {
    expect(lastActivity(snap({ lastActivityAt: null, rounds: [{ roundId: "x" }] }))).toBe(START);
  });
});

describe("dueAutoFinish", () => {
  const last = START + 5_000;

  it("belum 30 menit: tidak ditutup; tepat 30 menit: ditutup dengan waktu aktivitas terakhir", () => {
    expect(dueAutoFinish(snap(), last + AUTO_FINISH_IDLE_MS - 1)).toBeNull();
    expect(dueAutoFinish(snap(), last + AUTO_FINISH_IDLE_MS)).toBe(last);
    expect(dueAutoFinish(snap(), last + 12 * 3_600_000)).toBe(last);
  });

  it("tidak menutup game tanpa ronde, game yang bukan aktif, atau saat spin seri menggantung", () => {
    const late = last + 2 * AUTO_FINISH_IDLE_MS;
    expect(dueAutoFinish(snap({ rounds: [] }), late)).toBeNull();
    expect(dueAutoFinish(snap({ gameStatus: "finished" }), late)).toBeNull();
    expect(dueAutoFinish(snap({ gameStatus: "idle" }), late)).toBeNull();
    expect(dueAutoFinish(snap({ pendingTieBreak: { roundId: "1" } }), late)).toBeNull();
  });

  it("aktivitas layar (modal baru ditutup) menunda, tapi yang dicatat tetap aktivitas store", () => {
    const screen = last + 20 * 60_000;
    expect(dueAutoFinish(snap(), last + AUTO_FINISH_IDLE_MS, screen)).toBeNull();
    expect(dueAutoFinish(snap(), screen + AUTO_FINISH_IDLE_MS, screen)).toBe(last);
  });
});

describe("canResume / heldBackupId", () => {
  const info = { detectedAt: 5_000_000, recordId: "1000000" };

  it("bisa dilanjutkan selama 3 jam sesudah ditutup, lalu tidak", () => {
    expect(canResume("finished", info, info.detectedAt)).toBe(true);
    expect(canResume("finished", info, info.detectedAt + RESUME_WINDOW_MS - 1)).toBe(true);
    expect(canResume("finished", info, info.detectedAt + RESUME_WINDOW_MS)).toBe(false);
  });

  it("tidak bisa dilanjutkan kalau bukan ditutup otomatis atau sudah bukan layar selesai", () => {
    expect(canResume("finished", null, info.detectedAt)).toBe(false);
    expect(canResume("active", info, info.detectedAt)).toBe(false);
    expect(canResume("idle", info, info.detectedAt)).toBe(false);
  });

  it("id riwayat ditahan dari cadangan hanya selama masih bisa dilanjutkan", () => {
    expect(heldBackupId("finished", info, info.detectedAt + 1)).toBe("1000000");
    expect(heldBackupId("finished", info, info.detectedAt + RESUME_WINDOW_MS)).toBeNull();
    expect(heldBackupId("idle", info, info.detectedAt + 1)).toBeNull();
    expect(heldBackupId("finished", { ...info, recordId: null }, info.detectedAt + 1)).toBeNull();
  });
});
