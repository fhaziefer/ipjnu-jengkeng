"use client";

import { useGameStore } from "@/store/useGameStore";
import { X, Coins, TrendingDown } from "lucide-react";
import { useMemo } from "react";

interface PlayerDetailModalProps {
  playerId: string;
  onClose: () => void;
}

export default function PlayerDetailModal({ playerId, onClose }: PlayerDetailModalProps) {
  const { players, shootRecords } = useGameStore();
  const player = players.find((p) => p.id === playerId);

  const stats = useMemo(() => {
    let timesShooter = 0;
    let timesVictim = 0;
    let pointsGained = 0;
    let pointsLost = 0;

    shootRecords.forEach((record) => {
      if (record.shooterId === playerId) {
        timesShooter++;
        pointsGained += record.penaltyPoints;
      }
      if (record.victimId === playerId) {
        timesVictim++;
        pointsLost += record.penaltyPoints;
      }
    });

    return { timesShooter, timesVictim, pointsGained, pointsLost };
  }, [playerId, shootRecords]);

  if (!player) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-zinc-950 p-6 flex items-center justify-between border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <span className="font-black text-xl text-zinc-950">{player.initials}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Statistik Gepukan</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800/50 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            
            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2 text-amber-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">👊🏻 Gepuk</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.timesShooter}x</p>
            </div>

            <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2 text-rose-500 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">🤕 Digepuk</span>
              </div>
              <p className="text-2xl font-black text-white">{stats.timesVictim}x</p>
            </div>

            <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20">
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Coins className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Gepukan</span>
              </div>
              <p className="text-2xl font-black text-amber-500">+{stats.pointsGained}</p>
            </div>

            <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
              <div className="flex items-center gap-2 text-rose-400 mb-2">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Digepuk</span>
              </div>
              <p className="text-2xl font-black text-rose-500">-{stats.pointsLost}</p>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
