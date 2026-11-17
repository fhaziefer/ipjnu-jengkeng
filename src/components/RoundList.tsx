"use client";

import { useGameStore } from "@/store/useGameStore";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export default function RoundList() {
  const { players, rounds, shootRecords } = useGameStore();

  const gridColsClass = useMemo(() => {
    switch (players.length) {
      case 2: return "grid-cols-2";
      case 3: return "grid-cols-3";
      case 4: return "grid-cols-4";
      default: return "grid-cols-2";
    }
  }, [players.length]);

  const cumulativeRounds = useMemo(() => {
    const totals: Record<string, number> = {};
    
    // Tracker untuk ngecek apakah pemain udah pernah nyentuh batas
    const hasCrossedGodTier: Record<string, boolean> = {};
    const hasCrossedHellTier: Record<string, boolean> = {};

    players.forEach((p) => {
      totals[p.id] = 0;
      hasCrossedGodTier[p.id] = false;
      hasCrossedHellTier[p.id] = false;
    });

    return rounds.map((round) => {
      const godTierHits: Record<string, boolean> = {};
      const hellTierHits: Record<string, boolean> = {};

      round.scores.forEach((s) => {
        totals[s.playerId] += s.finalScore;
      });

      // Cek momen pecah telur di ronde ini
      players.forEach((p) => {
        const currentScore = totals[p.id];
        
        // Kalau nyentuh 1000+ dan belum pernah sebelumnya
        if (currentScore >= 1000 && !hasCrossedGodTier[p.id]) {
          godTierHits[p.id] = true;
          hasCrossedGodTier[p.id] = true; // Kunci biar ronde depan gak nyala lagi
        }
        
        // Kalau nyentuh -1000 dan belum pernah sebelumnya
        if (currentScore <= -1000 && !hasCrossedHellTier[p.id]) {
          hellTierHits[p.id] = true;
          hasCrossedHellTier[p.id] = true; // Kunci biar ronde depan gak nyala lagi
        }
      });

      let maxScore = -Infinity;
      let minScore = Infinity;

      for (const score of Object.values(totals)) {
        if (score > maxScore) maxScore = score;
        if (score < minScore) minScore = score;
      }

      return {
        ...round,
        cumulativeScores: { ...totals },
        godTierHits,
        hellTierHits,
        maxScore,
        minScore,
      };
    });
  }, [rounds, players]);

  if (rounds.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4 opacity-50 overflow-y-auto">
        <p className="text-fg-subtle text-sm">Nembe Mulai, durung itungan.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-bg flex flex-col">
      {cumulativeRounds.map((round, rowIndex) => {
        const isLastRow = rowIndex === cumulativeRounds.length - 1;

        return (
          <div
            key={round.roundId}
            className={cn(
              "grid gap-[1px] bg-surface border-b border-line shrink-0",
              gridColsClass
            )}
          >
            {players.map((p) => {
              const score = round.cumulativeScores[p.id];
              const isMax = score === round.maxScore && score !== round.minScore;
              const isMin = score === round.minScore && score !== round.maxScore;

              const isShooter = shootRecords.some(r => r.roundId === round.roundId && r.shooterId === p.id);
              const isVictim = shootRecords.some(r => r.roundId === round.roundId && r.victimId === p.id);

              // Cek apakah di ronde ini dia baru saja pecah telur
              const isJustHitGod = round.godTierHits[p.id];
              const isJustHitHell = round.hellTierHits[p.id];

              return (
                <div
                  key={`${round.roundId}-${p.id}`}
                  className={cn(
                    "relative flex items-center justify-center transition-colors",
                    isLastRow ? "py-4 sm:py-5 md:py-6" : "py-2.5 sm:py-3 md:py-4",
                    "bg-bg",
                    isMax && "bg-accent/10",
                    isMin && "bg-danger/10",
                    isShooter && "border-2 border-accent",
                    isVictim && "border-2 border-danger",
                    // Pertama kali tembus +1000 / -1000 di ronde ini. Statis, tanpa animasi.
                    isJustHitGod && "ring-2 ring-inset ring-accent",
                    isJustHitHell && "ring-2 ring-inset ring-danger"
                  )}
                >
                  <span
                    className={cn(
                      "relative z-10 font-mono transition-all",
                      isLastRow ? "text-base sm:text-lg md:text-xl font-bold" : "text-xs sm:text-sm md:text-base",
                      isMax ? "text-accent" : isMin ? "text-danger" : "text-fg"
                    )}
                  >
                    {score} {isShooter && "👊🏻"} {isVictim && "🤕"}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}