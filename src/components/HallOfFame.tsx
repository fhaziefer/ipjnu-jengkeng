"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { computeHallOfFame, MIN_GAMES_FOR_RATE, type HallRecord, type RecordId } from "@/lib/hallOfFame";
import { formatDuration, type GameRecord } from "@/lib/history";
import Stat from "@/components/Stat";

const RECORD_INFO: Record<RecordId, { label: string; emoji?: string; penalty?: boolean; unit?: string }> = {
  mostWins: { label: "Menang terbanyak", emoji: "👑", unit: "kali" },
  bestWinRate: { label: `Persentase menang tertinggi (min. ${MIN_GAMES_FOR_RATE} game)`, emoji: "👑" },
  longestWinStreak: { label: "Menang beruntun terpanjang", emoji: "👑", unit: "game" },
  highestTotal: { label: "Skor akhir tertinggi" },
  mostLosses: { label: "Juru kunci terbanyak", emoji: "💩", penalty: true, unit: "kali" },
  longestLoserStreak: { label: "Jengkeng beruntun terpanjang", emoji: "💩", penalty: true, unit: "game" },
  lowestTotal: { label: "Skor akhir terendah", penalty: true },
  mostNyewu: { label: "Paling sering nyewu", penalty: true, unit: "kali" },
  mostShotsGiven: { label: "Penggepuk terbanyak", unit: "gepuk" },
  mostShotsTaken: { label: "Paling sering digepuk", penalty: true, unit: "gepuk" },
};

const ORDER: RecordId[] = [
  "mostWins",
  "bestWinRate",
  "longestWinStreak",
  "highestTotal",
  "mostShotsGiven",
  "mostLosses",
  "longestLoserStreak",
  "lowestTotal",
  "mostNyewu",
  "mostShotsTaken",
];

function valueText(r: HallRecord): string {
  if (r.id === "bestWinRate") return `${r.value}%`;
  const unit = RECORD_INFO[r.id].unit;
  return unit ? `${r.value} ${unit}` : String(r.value);
}

export default function HallOfFame({ games }: { games: ReadonlyArray<GameRecord> }) {
  const hof = useMemo(() => computeHallOfFame(games), [games]);
  const { global } = hof;

  if (global.games === 0) {
    return (
      <p data-testid="hof-empty" className="text-center text-sm text-fg-subtle py-12">
        Hall of Fame terisi setelah ada game yang selesai.
      </p>
    );
  }

  const byId = new Map(hof.records.map((r) => [r.id, r]));
  const ordered = ORDER.map((id) => byId.get(id)).filter((r): r is HallRecord => Boolean(r));
  const fmt = (ts: number | null) => (ts === null ? "-" : format(new Date(ts), "d MMM yyyy", { locale: localeId }));

  return (
    <section className="space-y-5" data-testid="hall-of-fame">
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-fg">Statistik global</h2>
        <dl className="grid grid-cols-2 gap-2" data-testid="global-stats">
          <Stat label="Game" value={global.games} />
          <Stat label="Total ronde" value={global.rounds} />
          <Stat label="Pemain" value={global.players} />
          <Stat label="Total gepuk" value={global.shoots} />
          <Stat label="Game ada nyewu" value={global.nyewuGames} />
          <Stat label="Ronde terbanyak" value={global.mostRounds} />
          <Stat label="Rata-rata durasi" value={formatDuration(global.avgDurationMs)} />
          <Stat label="Game terlama" value={formatDuration(global.longestDurationMs)} />
        </dl>
        <p className="text-xs text-fg-subtle">
          Dari {fmt(global.firstAt)} sampai {fmt(global.lastAt)}. Hitungan semua game di riwayat HP ini.
        </p>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-bold text-fg">Hall of Fame</h2>
        {ordered.length === 0 ? (
          <p className="text-sm text-fg-subtle">Belum ada rekor.</p>
        ) : (
          <ul className="space-y-2">
            {ordered.map((r) => {
              const info = RECORD_INFO[r.id];
              return (
                <li
                  key={r.id}
                  data-testid={`rekor-${r.id}`}
                  className="rounded-xl bg-surface border border-line p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-fg-subtle leading-tight">{info.label}</p>
                    <p className="font-bold text-fg break-words">
                      {info.emoji ? `${info.emoji} ` : ""}
                      {r.holders.map((h) => h.name).join(", ")}
                    </p>
                    {r.games !== undefined && (
                      <p className="text-xs text-fg-subtle">dari {r.games} game</p>
                    )}
                  </div>
                  <span
                    className={
                      "shrink-0 font-mono font-semibold " + (info.penalty ? "text-danger" : "text-fg")
                    }
                  >
                    {valueText(r)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
