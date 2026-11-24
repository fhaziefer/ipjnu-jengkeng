"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Dices } from "lucide-react";
import { useGameStore } from "@/store/useGameStore";
import { buildShortLabels } from "@/lib/playerName";
import { cn } from "@/lib/utils";

const ROLL_DURATION_MS = 1800;
const FIRST_TICK_MS = 70;
const LAST_TICK_MS = 260;

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Undian giliran pertama, sekali per game, sebelum ronde pertama.
 *
 * Hasil diundi dan disimpan DULU, animasi menyusul (sama seperti spin seri):
 * reload di tengah animasi tidak memberi kesempatan mengundi ulang.
 * Tidak bisa ditutup dengan klik luar; ditutup lewat tombol sesudah hasil terlihat.
 */
export default function FirstTurnModal() {
  const players = useGameStore((s) => s.players);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const roundCount = useGameStore((s) => s.rounds.length);
  const firstTurnPlayerId = useGameStore((s) => s.firstTurnPlayerId);
  const drawFirstTurn = useGameStore((s) => s.drawFirstTurn);

  /** Hasil yang sedang ditampilkan di modal (tetap tampil sesudah tersimpan). */
  const [shown, setShown] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [rolling, setRolling] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const needsDraw = gameStatus === "active" && roundCount === 0 && firstTurnPlayerId === null;
  if (!needsDraw && shown === null) return null;

  const shortLabels = buildShortLabels(players);
  const winner = players.find((p) => p.id === shown);
  const done = shown !== null && !rolling;

  const handleSpin = () => {
    if (rolling || shown !== null) return;
    const chosen = drawFirstTurn();
    if (!chosen) return;
    setShown(chosen);

    if (prefersReducedMotion() || players.length < 2) {
      setHighlight(chosen);
      return;
    }

    // Sorotan berpindah makin pelan, lalu berhenti tepat di pemain terpilih.
    setRolling(true);
    const ids = players.map((p) => p.id);
    const target = ids.indexOf(chosen);
    const ticks: number[] = [];
    let elapsed = 0;
    while (elapsed < ROLL_DURATION_MS) {
      const t = elapsed / ROLL_DURATION_MS;
      const step = FIRST_TICK_MS + (LAST_TICK_MS - FIRST_TICK_MS) * t * t;
      elapsed += step;
      ticks.push(elapsed);
    }
    const startIndex = (((target - (ticks.length - 1)) % ids.length) + ids.length) % ids.length;
    ticks.forEach((at, i) => {
      timers.current.push(
        window.setTimeout(() => setHighlight(ids[(startIndex + i) % ids.length]), at)
      );
    });
    const end = ticks[ticks.length - 1] ?? 0;
    timers.current.push(window.setTimeout(() => setRolling(false), end + 50));
  };

  return (
    <div
      // Di atas prompt pasang aplikasi (z-100), yang kalau tidak menutupi tombol di bawah.
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/90 p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="giliran-judul"
    >
      <div className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-line overflow-hidden max-h-[92dvh] flex flex-col">
        <div className="bg-bg p-6 text-center border-b border-line space-y-2">
          <div className="flex items-center justify-center gap-2 text-fg">
            <Dices className="w-6 h-6" />
            <h2 id="giliran-judul" className="text-xl font-black text-fg">
              Sopo Sing Mulai?
            </h2>
            <Dices className="w-6 h-6" />
          </div>
          <p className="text-sm text-fg-subtle">
            {done ? "Wes ketemu sing mulai disik." : "Spin sek, sing metu dheweke sing mulai giliran pertama."}
          </p>
        </div>

        <ul className="p-4 sm:p-6 space-y-2 overflow-y-auto" aria-live="polite">
          {players.map((p) => {
            const isLit = highlight === p.id;
            const isWinner = done && shown === p.id;
            return (
              <li
                key={p.id}
                data-testid={`giliran-${p.id}`}
                data-terpilih={isWinner ? "ya" : undefined}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                  isWinner
                    ? "bg-accent/10 border-accent"
                    : isLit
                      ? "bg-bg border-line-strong"
                      : done
                        ? "bg-bg/50 border-line opacity-50"
                        : "bg-bg/50 border-line"
                )}
              >
                <div className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-surface-3">
                  <span className="font-black text-sm text-fg">{shortLabels[p.id]}</span>
                </div>
                <span className="flex-1 min-w-0 truncate font-bold text-fg">{p.name}</span>
              </li>
            );
          })}
        </ul>

        {done && winner && (
          <div className="px-4 sm:px-6 pb-2">
            <div className="bg-accent/10 border border-accent/40 rounded-2xl p-4 text-center space-y-1">
              <p className="text-[11px] font-bold text-fg-soft uppercase tracking-widest">Sing mulai disik</p>
              <p data-testid="giliran-hasil" className="text-2xl font-black text-fg break-words">
                {winner.name}
              </p>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-6 border-t border-line bg-bg shrink-0">
          {done ? (
            <button
              type="button"
              onClick={() => setShown(null)}
              className="w-full flex items-center justify-center gap-2 min-h-11 py-3.5 rounded-xl font-bold active:scale-[0.98] transition-all bg-accent text-on-accent hover:bg-accent-hover"
            >
              Wes, Lanjut
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSpin}
              disabled={rolling}
              className="w-full min-h-11 py-3.5 rounded-xl font-black active:scale-[0.98] transition-all bg-accent text-on-accent hover:bg-accent-hover disabled:bg-surface-2 disabled:text-fg-subtle disabled:cursor-not-allowed"
            >
              {rolling ? "Lagi muter..." : "SPIN"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
