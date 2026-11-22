"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { getTemplates } from "@/store/useSettingsStore";
import { renderTemplate } from "@/lib/speechTemplates";
import { buildSretVars } from "@/lib/speechContext";
import { isSpeechAvailable, speak } from "@/lib/speech";
import { dueStreakKey, readAnnouncedKey, writeAnnouncedKey } from "@/lib/lastPlaceAlert";

/**
 * Pemicu pengingat juru kunci kelamaan. Tidak menampilkan apa pun dan TIDAK
 * memakai state, jadi tidak ikut me-render ulang Dashboard tiap tik.
 *
 * Dicek tiap beberapa detik dan saat tab aktif lagi (timer di tab latar
 * belakang ditahan browser, jadi tanpa ini alarm yang jatuh tempo saat layar
 * mati baru bunyi di tik berikutnya).
 *
 * Tidak memotong suara lain: `speak()` membatalkan ucapan yang sedang jalan,
 * jadi alarm menunggu kalau ada ucapan berlangsung atau ada modal terbuka
 * (`paused`). Kunci rentetan baru ditandai saat alarm benar-benar diucapkan,
 * jadi yang tertunda tetap bunyi nanti.
 */

const CHECK_INTERVAL_MS = 5000;

export default function LastPlaceAlert({ paused }: { paused: boolean }) {
  const pausedRef = useRef(paused);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const check = () => {
      if (pausedRef.current) return;
      if (isSpeechAvailable() && window.speechSynthesis.speaking) return;

      const game = useGameStore.getState();
      const key = dueStreakKey(
        {
          gameStatus: game.gameStatus,
          roundCount: game.rounds.length,
          currentLastPlacePlayerId: game.currentLastPlacePlayerId,
          lastPlaceSinceTimestamp: game.lastPlaceSinceTimestamp,
          hasPendingTieBreak: game.pendingTieBreak !== null,
        },
        Date.now(),
        readAnnouncedKey()
      );
      if (key === null) return;

      // Ditandai SEBELUM bicara supaya dua pemicu berdekatan tidak menggandakan.
      writeAnnouncedKey(key);

      const text = renderTemplate(
        getTemplates().lastPlaceLong,
        buildSretVars(game.players, game.currentLastPlacePlayerId)
      );
      speak(text); // teks kosong (dibisukan di Pengaturan) = diam
    };

    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    check();

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return null;
}
