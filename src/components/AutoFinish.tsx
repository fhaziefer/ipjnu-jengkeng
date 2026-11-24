"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/store/useGameStore";
import { dueAutoFinish } from "@/lib/autoFinish";

const CHECK_INTERVAL_MS = 15_000;

/**
 * Menutup game yang lama tanpa itungan (lihat src/lib/autoFinish.ts).
 * Tidak menampilkan apa pun.
 *
 * Selama ada modal terbuka (`paused`, mis. lagi ngisi biji) game tidak ditutup,
 * dan menutup modal dihitung sebagai aktivitas: orang yang baru membatalkan
 * isian jelas masih main.
 */
export default function AutoFinish({ paused }: { paused: boolean }) {
  const pausedRef = useRef(paused);
  const lastScreenActivity = useRef<number | null>(null);

  useEffect(() => {
    if (pausedRef.current && !paused) lastScreenActivity.current = Date.now();
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    const check = () => {
      if (pausedRef.current) return;
      const game = useGameStore.getState();
      const finishedAt = dueAutoFinish(game, Date.now(), lastScreenActivity.current);
      if (finishedAt !== null) game.finishGame({ auto: { finishedAt } });
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
