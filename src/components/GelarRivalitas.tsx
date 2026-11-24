"use client";

import { useMemo } from "react";
import { computeGelar, GELAR_INFO } from "@/lib/gelar";
import { MIN_GAMES_FOR_RATE } from "@/lib/hallOfFame";
import { computeRivalries, favoriteVictims } from "@/lib/rivalitas";
import type { GameRecord } from "@/lib/history";

const TOP_PAIRS = 5;

/** Bagian Gelar dan Rivalitas di tab Hall of Fame. */
export default function GelarRivalitas({ games }: { games: ReadonlyArray<GameRecord> }) {
  const gelar = useMemo(() => computeGelar(games), [games]);
  const rivalries = useMemo(() => computeRivalries(games), [games]);
  const favorites = useMemo(() => favoriteVictims(rivalries), [rivalries]);

  return (
    <>
      <div className="space-y-2" data-testid="gelar">
        <h2 className="text-sm font-bold text-fg">Gelar</h2>
        {gelar.length === 0 ? (
          <p className="text-sm text-fg-subtle">
            Gelar muncul setelah ada pemain yang main minimal {MIN_GAMES_FOR_RATE} game.
          </p>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {gelar.map((g) => {
              const info = GELAR_INFO[g.id];
              return (
                <li
                  key={g.id}
                  data-testid={`gelar-${g.id}`}
                  className="rounded-xl bg-surface border border-line p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-fg-subtle leading-tight">
                      {info.emoji ? `${info.emoji} ` : ""}
                      {info.label}
                    </p>
                    <p className="font-bold text-fg break-words">{g.holders.map((h) => h.name).join(", ")}</p>
                  </div>
                  <span className="shrink-0 font-mono font-semibold text-fg-soft text-sm">
                    {g.value} {info.unit}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-fg-subtle">Syarat: minimal {MIN_GAMES_FOR_RATE} game. Seri = gelar dibagi.</p>
      </div>

      <div className="space-y-2" data-testid="rivalitas">
        <h2 className="text-sm font-bold text-fg">Rivalitas</h2>
        {rivalries.length === 0 ? (
          <p className="text-sm text-fg-subtle">Belum ada gepukan di riwayat.</p>
        ) : (
          <>
            <p className="text-xs text-fg-subtle">Pasangan gepuk paling sering.</p>
            <ol className="space-y-2">
              {rivalries.slice(0, TOP_PAIRS).map((r, i) => (
                <li
                  key={`${r.shooterKey}>${r.victimKey}`}
                  data-testid="rival-pasangan"
                  className="rounded-xl bg-surface border border-line p-3 flex items-center justify-between gap-3"
                >
                  <p className="min-w-0 text-sm text-fg break-words">
                    <span className="text-fg-subtle font-mono mr-2">#{i + 1}</span>
                    <span className="font-bold">{r.shooterName}</span>
                    <span className="text-fg-subtle"> gepuk </span>
                    <span className="font-bold">{r.victimName}</span>
                  </p>
                  <span className="shrink-0 text-right">
                    <span className="block font-mono font-semibold text-fg">{r.count}x</span>
                    <span className="block font-mono text-xs text-danger">-{r.points}</span>
                  </span>
                </li>
              ))}
            </ol>

            <h3 className="text-xs font-bold text-fg-subtle pt-2">Korban favorit</h3>
            <dl className="rounded-xl bg-surface border border-line divide-y divide-line" data-testid="korban-favorit">
              {favorites.map((r) => (
                <div key={r.shooterKey} className="flex items-center justify-between gap-3 px-3 py-2.5">
                  <dt className="text-sm text-fg-soft truncate">{r.shooterName}</dt>
                  <dd className="text-sm text-fg font-semibold text-right break-words min-w-0">
                    {r.victimName} <span className="font-mono text-fg-subtle font-normal">({r.count}x)</span>
                  </dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>
    </>
  );
}

/** Gelar satu pemain dari riwayat, untuk kartu pemain. Kosong = tidak tampil. */
export function PlayerGelar({ games, playerKey }: { games: ReadonlyArray<GameRecord>; playerKey: string }) {
  const mine = useMemo(
    () => computeGelar(games).filter((g) => g.holders.some((h) => h.key === playerKey)),
    [games, playerKey]
  );
  if (mine.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-1.5 mt-1" data-testid="gelar-pemain" aria-label="Gelar">
      {mine.map((g) => {
        const info = GELAR_INFO[g.id];
        return (
          <li key={g.id} className="text-[11px] font-semibold text-fg-soft bg-surface-2 border border-line rounded-full px-2 py-0.5">
            {info.emoji ? `${info.emoji} ` : ""}
            {info.label}
          </li>
        );
      })}
    </ul>
  );
}
