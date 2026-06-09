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
        <p className="text-zinc-500 text-sm">Nembe Mulai, durung itungan.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col">
      {cumulativeRounds.map((round, rowIndex) => {
        const isLastRow = rowIndex === cumulativeRounds.length - 1;

        return (
          <div
            key={round.roundId}
            className={cn(
              "grid gap-[1px] bg-zinc-900 border-b border-zinc-900 shrink-0",
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
              const hasSpecialEffect = isJustHitGod || isJustHitHell;

              return (
                <div
                  key={`${round.roundId}-${p.id}`}
                  className={cn(
                    "relative flex items-center justify-center transition-colors overflow-hidden",
                    isLastRow ? "py-5" : "py-3",
                    // Kalau gak ada efek muter, pasang warna background dan border normal
                    !hasSpecialEffect && "bg-zinc-950",
                    !hasSpecialEffect && isMax && "bg-amber-500/10",
                    !hasSpecialEffect && isMin && "bg-rose-500/10",
                    !hasSpecialEffect && isShooter && "border-2 border-amber-500",
                    !hasSpecialEffect && isVictim && "border-2 border-rose-500"
                  )}
                >
                  
                  {/* EFEK ANIMASI KHUSUS SAAT PERTAMA KALI NYENTUH 1000 / -1000 */}
                  {hasSpecialEffect && (
                    <>
                      {/* Gradient berputar */}
                      <div 
                        className={cn(
                          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_2s_linear_infinite] z-0",
                          isJustHitGod 
                            ? "bg-[conic-gradient(transparent_25%,#fbbf24_50%,transparent_75%,#fbbf24_100%)]" 
                            : "bg-[conic-gradient(transparent_25%,#f43f5e_50%,transparent_75%,#f43f5e_100%)]"
                        )} 
                      />
                      {/* Tutupan tengah biar jadinya cuma border (2px) */}
                      <div className="absolute inset-[2px] bg-zinc-950 z-0" />
                      
                      {/* Lapis warna heatmap sesuai status (Max/Min) di balik teks */}
                      <div className={cn(
                        "absolute inset-[2px] z-0",
                        isMax && "bg-amber-500/10",
                        isMin && "bg-rose-500/10"
                      )} />
                      
                      {/* Efek Glow */}
                      <div 
                        className={cn(
                          "absolute inset-0 z-0 pointer-events-none",
                          isJustHitGod 
                            ? "shadow-[inset_0_0_15px_rgba(251,191,36,0.3)]" 
                            : "shadow-[inset_0_0_15px_rgba(244,63,94,0.3)]"
                        )} 
                      />
                    </>
                  )}

                  <span
                    className={cn(
                      "relative z-10 font-mono transition-all",
                      isLastRow ? "text-lg font-bold" : "text-sm",
                      isMax ? "text-amber-400" : isMin ? "text-rose-400" : "text-zinc-100"
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