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
    players.forEach((p) => (totals[p.id] = 0));

    return rounds.map((round) => {
      round.scores.forEach((s) => {
        totals[s.playerId] += s.finalScore;
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

              return (
                <div
                  key={`${round.roundId}-${p.id}`}
                  className={cn(
                    "flex items-center justify-center bg-zinc-950 transition-colors",
                    isLastRow ? "py-5" : "py-3",
                    isMax && "bg-amber-500/10",
                    isMin && "bg-rose-500/10",
                    isShooter && "border-2 border-amber-500",
                    isVictim && "border-2 border-rose-500"
                  )}
                >
                  <span
                    className={cn(
                      "font-mono transition-all",
                      isLastRow ? "text-lg font-bold" : "text-sm",
                      isMax ? "text-amber-400" : isMin ? "text-rose-400" : "text-zinc-400"
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
