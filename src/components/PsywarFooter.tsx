"use client";

import { useGameStore } from "@/store/useGameStore";
import { useNow } from "@/hooks/useNow";
import { useMemo } from "react";
import { Flame } from "lucide-react";

// ============================================================
// SUB-KOMPONEN OPTIMASI: Biar re-render timer gak bikin berat
// ============================================================
function GameDurationText({ startTime }: { startTime: number | null }) {
  const now = useNow(30000); // update setiap 30 detik
  const gameDurationMs = startTime ? now - startTime : 0;
  const gameDurationHrs = Math.floor(gameDurationMs / 3600000);
  const gameDurationMins = Math.floor((gameDurationMs % 3600000) / 60000);

  return <>{gameDurationHrs} Jam {gameDurationMins} Menit</>;
}

function StuckDurationText({ since }: { since: number | null }) {
  const now = useNow(30000); // update setiap 30 detik
  const stuckMs = since ? now - since : 0;
  const stuckHrs = Math.floor(stuckMs / 3600000);
  const stuckMins = Math.floor((stuckMs % 3600000) / 60000);

  return <>({stuckHrs} jam {stuckMins} menit)</>;
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function PsywarFooter() {
  const { players, rounds, currentLastPlacePlayerId, lastPlaceSinceTimestamp, gameStartTime } = useGameStore();

  // Kalkulasi total poin keseluruhan
  const totals = useMemo(() => {
    const acc: Record<string, number> = {};
    players.forEach((p) => (acc[p.id] = 0));
    rounds.forEach((r) => {
      r.scores.forEach((s) => {
        acc[s.playerId] += s.finalScore;
      });
    });
    return acc;
  }, [players, rounds]);

  // Urutkan pemain dari yang poinnya terbesar ke terkecil
  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => totals[b.id] - totals[a.id]);
  }, [players, totals]);

  // Render state awal jika permainan baru dimulai
  if (rounds.length === 0 || sortedPlayers.length < 2) {
    return (
      <div className="shrink-0 p-4 border-t border-zinc-800 bg-zinc-950 pb-28 text-center z-10">
        <p className="text-zinc-500 text-sm">
          0 Mainan | <GameDurationText startTime={gameStartTime} />
        </p>
      </div>
    );
  }

  // Tentukan Juru Kunci saat ini untuk tampilan Gap Poin
  const lastPlace = sortedPlayers[sortedPlayers.length - 1];
  const secondLastPlace = sortedPlayers[sortedPlayers.length - 2];
  const gap = totals[secondLastPlace.id] - totals[lastPlace.id];

  // Kalkulasi seberapa banyak Juru Kunci ini nyungsep berturut-turut
  let consecutiveRounds = 0;
  const tempTotals: Record<string, number> = {};
  players.forEach((p) => (tempTotals[p.id] = 0));

  const historyRanks: string[][] = [];

  rounds.forEach((r) => {
    r.scores.forEach((s) => {
      tempTotals[s.playerId] += s.finalScore;
    });

    let minScore = Infinity;
    let tiedForLast: string[] = [];

    // Logika pencarian posisi terakhir (mendukung hasil seri/tie)
    for (const [id, score] of Object.entries(tempTotals)) {
      if (score < minScore) {
        minScore = score;
        tiedForLast = [id];
      } else if (score === minScore) {
        tiedForLast.push(id);
      }
    }
    historyRanks.push(tiedForLast);
  });

  // Hitung mundur dari ronde terakhir ke awal
  for (let i = historyRanks.length - 1; i >= 0; i--) {
    if (historyRanks[i].includes(currentLastPlacePlayerId || "")) {
      consecutiveRounds++;
    } else {
      break;
    }
  }

  // Gunakan data dari Store sebagai sumber kebenaran utama
  const displayLastPlace = players.find(p => p.id === currentLastPlacePlayerId) || lastPlace;

  return (
    <div className="shrink-0 p-4 border-t border-zinc-800 bg-zinc-950 pb-28 space-y-4 z-10 relative shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">

      {/* Top Info Bar */}
      <div className="flex items-center justify-center gap-4 text-xs text-zinc-500 font-mono">
        <span>{rounds.length} Mainan</span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <GameDurationText startTime={gameStartTime} />
        </span>
      </div>

      {/* Dashed Psywar Box */}
      <div className="bg-zinc-900/50 border border-dashed border-zinc-700 rounded-2xl p-4 text-center space-y-3">
        <div className="flex items-center justify-center gap-2 text-rose-400 font-medium text-sm">
          <Flame className="w-4 h-4" />
          <span>Woro-woro</span>
          <Flame className="w-4 h-4" />
        </div>

        <p className="text-zinc-300 text-sm">
          <strong className="text-white">{displayLastPlace.initials}</strong> 💩 butuh <strong className="text-amber-400">{gap}</strong> poin nyalip <strong className="text-white">{secondLastPlace.initials}</strong> 😭.
        </p>

        {consecutiveRounds > 0 && (
          <p className="text-rose-500 text-xs bg-rose-500/10 py-2 px-3 rounded-xl inline-block">
            {displayLastPlace.initials} jengkeng <strong>{consecutiveRounds} mainan</strong> <StuckDurationText since={lastPlaceSinceTimestamp} />
          </p>
        )}
      </div>

    </div>
  );
}