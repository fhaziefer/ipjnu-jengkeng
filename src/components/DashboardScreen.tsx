"use client";

import { useState, useMemo } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Plus, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import RoundList from "./RoundList";
import PsywarFooter from "./PsywarFooter";
import AddRoundModal from "./AddRoundModal";
import PlayerDetailModal from "./PlayerDetailModal";

export default function DashboardScreen() {
  const { players, rounds, finishGame, undoLastRound } = useGameStore();
  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false); // Modal state untuk Undo

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
    <div className="h-[100dvh] flex flex-col bg-zinc-950 relative overflow-hidden w-full max-w-md mx-auto sm:shadow-2xl">
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
        {players.map((p) => {
          const score = totals[p.id] || 0;

          // Pisah kondisi buat yang plus dan minus
          const isGodTier = score >= 1000;
          const isHellTier = score <= -1000;
          const hasSpecialEffect = isGodTier || isHellTier;

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlayerId(p.id)}
              className="relative flex flex-col items-center justify-center py-3 bg-zinc-950 active:bg-zinc-900 transition-colors overflow-hidden group"
            >
              {/* Efek Animasi Border Muter */}
              {hasSpecialEffect && (
                <>
                  <div
                    className={cn(
                      "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_2s_linear_infinite] z-0",
                      isGodTier
                        ? "bg-[conic-gradient(transparent_25%,#fbbf24_50%,transparent_75%,#fbbf24_100%)]"
                        : "bg-[conic-gradient(transparent_25%,#f43f5e_50%,transparent_75%,#f43f5e_100%)]" // Warna rose-500 buat Hell Tier
                    )}
                  />
                  <div className="absolute inset-[2px] bg-zinc-950 z-0" />
                  {/* Efek glow tambahan sesuai warna */}
                  <div
                    className={cn(
                      "absolute inset-0 z-0 pointer-events-none",
                      isGodTier
                        ? "shadow-[inset_0_0_15px_rgba(251,191,36,0.3)]"
                        : "shadow-[inset_0_0_15px_rgba(244,63,94,0.3)]"
                    )}
                  />
                </>
              )}

              {/* Konten Text (harus z-10 biar posisinya di atas efek animasi) */}
              <span className="relative z-10 text-sm font-black text-white">{p.initials}</span>
              <span className="relative z-10 text-lg">{playerRanks[p.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Scrollable Ledger */}
      <RoundList />

      {/* Psywar Footer */}
      <PsywarFooter />

      {/* Floating Action Button & Undo Button */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-4 flex gap-3">

        {/* Tombol Undo muncul kalau udah ada minimal 1 ronde */}
        {rounds.length > 0 && (
          <button
            onClick={() => setIsUndoModalOpen(true)}
            className="flex-1 flex items-center justify-center bg-zinc-800 text-zinc-300 py-4 rounded-xl font-bold shadow-xl active:scale-95 transition-all hover:bg-zinc-700 hover:text-white border border-zinc-700"
          >
            <span>Salah Ngitung</span>
          </button>
        )}

        <button
          onClick={() => setIsAddRoundOpen(true)}
          className="flex-1 flex items-center justify-center bg-gradient-to-r from-amber-500 to-rose-600 text-white py-4 rounded-xl font-bold shadow-xl shadow-rose-500/30 active:scale-95 transition-all"
        >
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

      {/* Undo Confirmation Modal */}
      {isUndoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden p-6 text-center space-y-6">
            <div className="flex justify-center text-zinc-400">
              <RotateCcw className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Busek Itungan Keri Dhewe?</h2>
              <p className="text-sm text-zinc-500">Itungan sing nembe dilebokne bakal ilang.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsUndoModalOpen(false)}
                className="flex-1 py-3 rounded-xl font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Gak Sido
              </button>
              <button
                onClick={() => {
                  undoLastRound();
                  setIsUndoModalOpen(false);
                }}
                className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
              >
                Busek
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}