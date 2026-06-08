"use client";

import { useGameStore } from "@/store/useGameStore";
import { RefreshCcw, Trophy, Skull } from "lucide-react";
import { useMemo } from "react";

export default function FinishedScreen() {
  const { players, rounds, resetGame } = useGameStore();

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

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => totals[b.id] - totals[a.id]);
  }, [players, totals]);

  const winner = sortedPlayers[0];
  const loser = sortedPlayers[sortedPlayers.length - 1];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/20 mb-4">
            <Trophy className="w-12 h-12 text-zinc-950" />
          </div>
          <h1 className="text-4xl font-black text-white">Sreeet</h1>
          <div className="space-y-1">
            <p className="text-zinc-400 text-sm">Pengarit Handal 👑</p>
            <p className="text-amber-500 font-bold text-2xl uppercase">
              {winner?.initials}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider text-center">
            Bijine Cah-Cah
          </h2>
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.id}
                className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800/50"
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500 font-mono text-sm">
                    #{index + 1}
                  </span>
                  <span className="font-bold text-white text-lg">
                    {player.initials}
                  </span>
                </div>
                <span className="font-mono text-xl text-amber-500 font-semibold">
                  {totals[player.id]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 text-center space-y-2">
          <Skull className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <div className="space-y-1">
            <p className="text-rose-400 font-medium">Juru Kunci</p>
            <p className="text-rose-300 text-xl font-bold uppercase">{loser?.initials} 💩</p>
          </div>
          <p className="text-sm text-rose-500/80 mt-2">Sesok ojo sungkan ngajak maneh.</p>
        </div>

        <button
          onClick={resetGame}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-all active:scale-[0.98]"
        >
          <RefreshCcw className="w-5 h-5" />
          Main Maneh
        </button>
      </div>
    </div>
  );
}
