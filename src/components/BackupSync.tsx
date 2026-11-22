"use client";

import { useEffect } from "react";
import { runBackupNow } from "@/lib/backup/runner";
import { useHistoryStore } from "@/store/useHistoryStore";
import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * Pemicu cadangan online. Tidak menampilkan apa pun: tidak ada toast, tidak
 * ada layar galat, tidak ada spinner. Gagal = diam dan coba lagi nanti.
 *
 * Kapan jalan: 3 detik setelah app dibuka, saat koneksi kembali, saat tab
 * aktif lagi, dan beberapa detik setelah riwayat atau pengaturan berubah
 * (mis. game baru selesai).
 */

const STARTUP_DELAY_MS = 3000;
const CHANGE_DEBOUNCE_MS = 4000;
const VISIBLE_MIN_GAP_MS = 30_000;

export default function BackupSync() {
  useEffect(() => {
    let changeTimer: number | undefined;
    let lastVisibleRun = 0;

    const run = () => {
      void runBackupNow();
    };

    const startupTimer = window.setTimeout(run, STARTUP_DELAY_MS);

    const scheduleAfterChange = () => {
      window.clearTimeout(changeTimer);
      changeTimer = window.setTimeout(run, CHANGE_DEBOUNCE_MS);
    };

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastVisibleRun < VISIBLE_MIN_GAP_MS) return;
      lastVisibleRun = now;
      run();
    };

    const unsubHistory = useHistoryStore.subscribe((state, prev) => {
      if (state.games !== prev.games) scheduleAfterChange();
    });
    const unsubSettings = useSettingsStore.subscribe((state, prev) => {
      if (state.overrides !== prev.overrides) scheduleAfterChange();
    });

    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearTimeout(startupTimer);
      window.clearTimeout(changeTimer);
      unsubHistory();
      unsubSettings();
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
