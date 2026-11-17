"use client";

import { useGameStore } from "@/store/useGameStore";
import { useNow } from "@/hooks/useNow";
import { useMemo } from "react";
import { computeTotals, sortPlayersByTotal } from "@/lib/scoring";
import { Flame } from "lucide-react";

// ============================================================
// SUB-KOMPONEN OPTIMASI: Biar re-render timer gak bikin berat
// ============================================================
function GameDurationText({ startTime }: { startTime: number | null }) {
  const now = useNow(30000);
  const gameDurationMs = startTime ? now - startTime : 0;
  const gameDurationHrs = Math.floor(gameDurationMs / 3600000);
  const gameDurationMins = Math.floor((gameDurationMs % 3600000) / 60000);

  return <>{gameDurationHrs} Jam {gameDurationMins} Menit</>;
}

function StuckDurationText({ since }: { since: number | null }) {
  const now = useNow(30000);
  const stuckMs = since ? now - since : 0;
  const stuckHrs = Math.floor(stuckMs / 3600000);
  const stuckMins = Math.floor((stuckMs % 3600000) / 60000);

  return <>({stuckHrs} jam {stuckMins} menit)</>;
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function PsywarFooter() {
  const {
    players,
    rounds,
    currentLastPlacePlayerId,
    lastPlaceSinceTimestamp,
    gameStartTime,
  } = useGameStore();

  const totals = useMemo(() => computeTotals(players, rounds), [players, rounds]);

  const sortedPlayers = useMemo(
    () => sortPlayersByTotal(players, totals),
    [players, totals]
  );

  /**
   * Berapa ronde berturut-turut dia kena hukuman.
   *
   * Dulu ini dihitung ulang dari nol dengan me-replay seluruh ronde dan
   * mencari skor terendah tiap ronde. Sekarang keputusannya sudah tersimpan
   * di tiap ronde, jadi tinggal dihitung mundur. Bonusnya: hasil spin ikut
   * terhitung dengan benar, yang tidak mungkin dilakukan versi lama.
   */
  const consecutiveRounds = useMemo(() => {
    if (!currentLastPlacePlayerId) return 0;

    let count = 0;
    for (let i = rounds.length - 1; i >= 0; i--) {
      if (rounds[i].resolvedLastPlaceId !== currentLastPlacePlayerId) break;
      count++;
    }
    return count;
  }, [rounds, currentLastPlacePlayerId]);

  if (rounds.length === 0 || sortedPlayers.length < 2) {
    return (
      <div className="shrink-0 px-4 pt-3 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-28 border-t border-line bg-bg text-center z-10">
        <p className="text-fg-subtle text-sm">
          0 Mainan | <GameDurationText startTime={gameStartTime} />
        </p>
      </div>
    );
  }

  // Sumber kebenaran juru kunci ada di store, bukan di posisi terakhir sort.
  const displayLastPlace =
    players.find((p) => p.id === currentLastPlacePlayerId) ??
    sortedPlayers[sortedPlayers.length - 1];

  /**
   * Gap dihitung terhadap pemain terdekat di ATAS juru kunci yang sebenarnya.
   *
   * Versi lama membandingkan dua posisi terakhir hasil sort. Kalau juru kunci
   * pilihan store berbeda dari hasil sort (persis yang terjadi setelah spin),
   * angkanya keluar dan kelihatan valid tapi membandingkan pasangan yang salah.
   */
  const others = players.filter((p) => p.id !== displayLastPlace.id);
  const nearestAbove = others.reduce(
    (best, p) => (totals[p.id] < totals[best.id] ? p : best),
    others[0]
  );
  const gap = totals[nearestAbove.id] - totals[displayLastPlace.id];

  return (
    <div className="shrink-0 px-4 sm:px-5 pt-3 sm:pt-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] sm:pb-28 border-t border-line bg-bg space-y-3 sm:space-y-4 z-10 relative">

      <div className="flex items-center justify-center gap-4 text-xs text-fg-subtle font-mono">
        <span>{rounds.length} Mainan</span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <GameDurationText startTime={gameStartTime} />
        </span>
      </div>

      <div className="bg-surface/50 border border-dashed border-line-strong rounded-2xl p-3 sm:p-4 text-center space-y-2 sm:space-y-3">
        <div className="flex items-center justify-center gap-2 text-danger font-medium text-sm">
          <Flame className="w-4 h-4" />
          <span>Woro-woro</span>
          <Flame className="w-4 h-4" />
        </div>

        {gap === 0 ? (
          <p className="text-fg-soft text-sm">
            <strong className="text-fg">{displayLastPlace.name}</strong> 💩 bijine
            podo persis karo{" "}
            <strong className="text-fg">{nearestAbove.name}</strong>, mung
            kalah spin 🎲.
          </p>
        ) : (
          <p className="text-fg-soft text-sm">
            <strong className="text-fg">{displayLastPlace.name}</strong> 💩 butuh{" "}
            <strong className="text-fg">{gap}</strong> poin nyalip{" "}
            <strong className="text-fg">{nearestAbove.name}</strong> 😭.
          </p>
        )}

        {consecutiveRounds > 0 && (
          <p className="text-danger text-xs bg-danger/10 py-2 px-3 rounded-xl inline-block">
            {displayLastPlace.name} jengkeng <strong>{consecutiveRounds} mainan</strong>{" "}
            <StuckDurationText since={lastPlaceSinceTimestamp} />
          </p>
        )}
      </div>

    </div>
  );
}