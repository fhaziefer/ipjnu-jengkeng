"use client";

import { useState, useMemo } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Plus, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import RoundList from "./RoundList";
import PsywarFooter from "./PsywarFooter";
import AddRoundModal from "./AddRoundModal";
import PlayerDetailModal from "./PlayerDetailModal";

export default function DashboardScreen() {
  const { players, rounds, finishGame } = useGameStore();
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);

  const gridColsClass = useMemo(() => {
    switch (players.length) {
      case 2: return "grid-cols-2";
      case 3: return "grid-cols-3";
      case 4: return "grid-cols-4";
      default: return "grid-cols-2";
    }
  }, [players.length]);

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

  const playerRanks = useMemo(() => {
    const sortedIds = [...players].sort((a, b) => totals[b.id] - totals[a.id]).map(p => p.id);
    const ranks: Record<string, string> = {};
    
    players.forEach(p => {
      const rankIndex = sortedIds.indexOf(p.id);
      if (rankIndex === 0) {
        ranks[p.id] = "👑";
      } else if (rankIndex === players.length - 1) {
        ranks[p.id] = "💩";
      } else if (rankIndex === 1 && players.length === 4) {
        ranks[p.id] = "😜";
      } else {
        ranks[p.id] = "😭";
      }
    });
    
    if (rounds.length === 0) {
      players.forEach(p => ranks[p.id] = "");
    }
    
    return ranks;
  }, [players, totals, rounds.length]);

  return (
    <div className="h-[100dvh] flex flex-col bg-zinc-950 relative overflow-hidden">
      
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-900 shrink-0">
        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-rose-500">
          JENGKENG
        </h1>
        <button
          onClick={() => setIsFinishModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-500 font-bold rounded-full border border-rose-500/20 active:scale-95 transition-transform"
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>SRET</span>
        </button>
      </header>

      {/* Sticky Player Initials Header */}
      <div className={cn("shrink-0 z-10 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 grid gap-[1px]", gridColsClass)}>
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelectedPlayerId(p.id)}
            className="flex flex-col items-center justify-center py-3 bg-zinc-950 active:bg-zinc-900 transition-colors"
          >
            <span className="text-sm font-black text-white">{p.initials}</span>
            <span className="text-lg">{playerRanks[p.id]}</span>
          </button>
        ))}
      </div>

      {/* Scrollable Ledger */}
      <RoundList />

      {/* Psywar Footer */}
      <PsywarFooter />

      {/* Floating Action Button */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-xs px-4">
        <button
          onClick={() => setIsAddRoundOpen(true)}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-rose-600 text-white px-6 py-4 rounded-full font-bold shadow-xl shadow-rose-500/30 active:scale-95 transition-all"
        >
          <Plus className="w-6 h-6" />
          <span>Wayahe Ngitung</span>
        </button>
      </div>

      {/* Modals */}
      {isAddRoundOpen && <AddRoundModal onClose={() => setIsAddRoundOpen(false)} />}
      {selectedPlayerId && <PlayerDetailModal playerId={selectedPlayerId} onClose={() => setSelectedPlayerId(null)} />}
      
      {/* Finish Confirmation Modal */}
      {isFinishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden p-6 text-center space-y-6">
            <div className="flex justify-center text-amber-500">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Sret tenan??</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="flex-1 py-3 rounded-xl font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Gak Sido
              </button>
              <button
                onClick={() => {
                  setIsFinishModalOpen(false);
                  finishGame();
                }}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
              >
                Sret Wae
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
