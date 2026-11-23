"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { getTemplates, useSettingsStore } from "@/store/useSettingsStore";
import { renderTemplate, type TemplateVars } from "@/lib/speechTemplates";
import { buildSretVars, buildStreakVars } from "@/lib/speechContext";
import { countConsecutiveLastPlace } from "@/lib/scoring";
import { isSpeechAvailable, speak } from "@/lib/speech";
import {
  dueRounds,
  dueStreakKey,
  readAnnounced,
  writeAnnounced,
  type AlertSnapshot,
} from "@/lib/lastPlaceAlert";

/**
 * Pemicu pengingat juru kunci: kelamaan (30 menit) dan beruntun (7 ronde).
 * Tidak menampilkan apa pun dan TIDAK memakai state, jadi tidak ikut
 * me-render ulang Dashboard tiap tik.
 *
 * Dicek tiap beberapa detik dan saat tab aktif lagi (timer di tab latar
 * belakang ditahan browser, jadi tanpa ini alarm yang jatuh tempo saat layar
 * mati baru bunyi di tik berikutnya).
 *
 * Aturan bicara:
 * - Tidak memotong suara lain: `speak()` membatalkan ucapan yang sedang jalan,
 *   jadi alarm menunggu kalau ada ucapan berlangsung (termasuk pengumuman
 *   ronde yang baru disubmit) atau ada modal terbuka (`paused`).
 * - Paling banyak SATU alarm per pengecekan. Kalau dua jatuh tempo bersamaan,
 *   yang kedua menunggu tik berikutnya, sesudah yang pertama selesai.
 *   Ronde beruntun didahulukan karena terikat ke ronde yang baru saja jalan.
 * - Penanda ditulis saat alarm benar-benar diucapkan, jadi yang tertunda
 *   tetap bunyi nanti.
 */

const CHECK_INTERVAL_MS = 5000;

function speakTemplate(template: string, vars: TemplateVars): void {
  speak(renderTemplate(template, vars)); // teks kosong (dibisukan di Pengaturan) = diam
}

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
      const snapshot: AlertSnapshot = {
        gameStatus: game.gameStatus,
        roundCount: game.rounds.length,
        currentLastPlacePlayerId: game.currentLastPlacePlayerId,
        lastPlaceSinceTimestamp: game.lastPlaceSinceTimestamp,
        hasPendingTieBreak: game.pendingTieBreak !== null,
        consecutiveRounds: countConsecutiveLastPlace(game.rounds, game.currentLastPlacePlayerId),
      };

      const rounds = dueRounds(
        snapshot,
        readAnnounced("rounds"),
        useSettingsStore.getState().streakThreshold
      );
      if (rounds) {
        // Ditandai SEBELUM bicara supaya dua pemicu berdekatan tidak menggandakan.
        writeAnnounced("rounds", rounds.mark);
        speakTemplate(
          getTemplates().lastPlaceStreak,
          buildStreakVars(game.players, game.currentLastPlacePlayerId, rounds.count)
        );
        return;
      }

      const timeKey = dueStreakKey(snapshot, Date.now(), readAnnounced("time"));
      if (timeKey !== null) {
        writeAnnounced("time", timeKey);
        speakTemplate(
          getTemplates().lastPlaceLong,
          buildSretVars(game.players, game.currentLastPlacePlayerId)
        );
      }
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
