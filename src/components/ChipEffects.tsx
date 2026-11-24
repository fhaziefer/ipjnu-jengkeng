"use client";

import type { CSSProperties } from "react";
import { useEffectsStore, type ActiveEffect } from "@/store/useEffectsStore";

function involves(e: ActiveEffect, playerId: string): boolean {
  const ev = e.event;
  if (ev.type === "gepuk") return ev.shooterId === playerId || ev.victimId === playerId;
  return ev.playerId === playerId;
}

/** Besar goyangan korban mengikuti besar gepukan: 100 kecil, 1000 besar. */
export function shakeAmplitude(points: number): number {
  return Math.min(7, Math.max(2, Math.round(points / 150)));
}

export interface ChipMotion {
  key: string;
  className: string;
  style: CSSProperties | undefined;
  rankKey: string;
  rankClassName: string;
}

function motionFor(active: ReadonlyArray<ActiveEffect>, playerId: string): ChipMotion {
  const mine = active.filter((e) => involves(e, playerId));
  const victim = mine.find((e) => e.event.type === "gepuk" && e.event.victimId === playerId);
  const stamp = mine.find((e) => e.event.type === "nyewu" || e.event.type === "comeback");
  const drop = mine.find((e) => e.event.type === "jurukunci" || e.event.type === "comeback");

  const motion = victim ?? stamp;
  const amp = victim && victim.event.type === "gepuk" ? shakeAmplitude(victim.event.points) : null;

  return {
    key: motion ? String(motion.id) : "diam",
    className: victim ? "jk-shake" : stamp ? "jk-stamp" : "",
    style: amp !== null ? ({ "--jk-amp": `${amp}px` } as CSSProperties) : undefined,
    rankKey: drop ? `jatuh-${drop.id}` : "diam",
    rankClassName: drop ? "jk-drop" : "",
  };
}

/**
 * Gerak yang menempel di chip itu sendiri (goyang, membesar) dan di emoji
 * peringkatnya (jatuh masuk), untuk semua pemain sekaligus. `key` berubah per
 * efek supaya animasi CSS diulang dari awal kalau kejadian yang sama terulang.
 */
export function useChipMotions(playerIds: ReadonlyArray<string>): Record<string, ChipMotion> {
  const active = useEffectsStore((s) => s.active);
  return Object.fromEntries(playerIds.map((id) => [id, motionFor(active, id)]));
}

/** Lapisan efek di dalam chip pemain. Tidak menangkap sentuhan. */
export default function ChipEffects({ playerId }: { playerId: string }) {
  const mine = useEffectsStore((s) => s.active).filter((e) => involves(e, playerId));
  if (mine.length === 0) return null;

  return (
    <>
      {mine.map((e) => {
        const ev = e.event;
        switch (ev.type) {
          case "jurukunci":
            return <span key={e.id} data-efek="jurukunci" aria-hidden className="jk-fx-layer jk-fx-flash bg-danger/25" />;
          case "comeback":
            return <span key={e.id} data-efek="comeback" aria-hidden className="jk-fx-layer jk-fx-flash bg-fg/15" />;
          case "nyewu":
            return (
              <span
                key={e.id}
                data-efek={`nyewu-${ev.tone}`}
                aria-hidden
                className="jk-fx-layer jk-fx-ring"
                style={{ "--jk-ring": ev.tone === "god" ? "var(--color-accent-hover)" : "var(--color-danger)" } as CSSProperties}
              />
            );
          case "gepuk": {
            const isVictim = ev.victimId === playerId;
            return (
              <span key={e.id}>
                <span
                  data-efek={isVictim ? "digepuk" : "menggepuk"}
                  aria-hidden
                  className={`jk-fx-layer jk-fx-flash ${isVictim ? "bg-danger/20" : "bg-fg/10"}`}
                />
                <span
                  aria-hidden
                  className={`jk-fx-float font-mono font-black text-sm px-1.5 rounded-md bg-bg/85 ${isVictim ? "text-danger" : "text-fg"}`}
                >
                  {isVictim ? `-${ev.points}` : `+${ev.points}`}
                </span>
              </span>
            );
          }
        }
      })}
    </>
  );
}
