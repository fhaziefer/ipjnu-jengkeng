"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Users, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SetupScreen() {
  const startGame = useGameStore((state) => state.startGame);
  const existingPlayers = useGameStore((state) => state.players); // Ambil data pemain sebelumnya (kalau ada)

  // Kalau ada data pemain sebelumnya (dari fitur "Ganti"), otomatis masukin ke kolom input
  const [initials, setInitials] = useState<string[]>(() => {
    const defaultInitials = ["", "", "", ""];
    if (existingPlayers && existingPlayers.length > 0) {
      existingPlayers.forEach((p, index) => {
        if (index < 4) defaultInitials[index] = p.initials;
      });
    }
    return defaultInitials;
  });

  const handleInitialChange = (index: number, val: string) => {
    const newInitials = [...initials];
    newInitials[index] = val.slice(0, 3).toUpperCase(); // Max 3 chars
    setInitials(newInitials);
  };

  const handleStart = () => {
    // Filter out empty initials
    const validInitials = initials.filter((val) => val.trim().length > 0);
    if (validInitials.length < 2) return;

    const players = validInitials.map((initial, index) => ({
      id: `player-${index + 1}`,
      initials: initial,
    }));

    startGame(players);
  };

  const isValid = initials.filter((val) => val.trim().length > 0).length >= 2;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-transparent bg-clip-text bg-linear-to-br from-amber-400 to-rose-500">
            JENGKENG
          </h1>
          <p className="text-zinc-400 text-sm">Digawe ngitung, ben gak mumet</p>
        </div>

        <div className="space-y-4 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 shadow-xl shadow-black/50">
          <div className="flex items-center gap-2 text-zinc-300 font-medium mb-4">
            <Users className="w-5 h-5 text-amber-500" />
            <span>Pemain</span>
          </div>

          {initials.map((initial, index) => (
            <div key={index} className="flex flex-col gap-1">
              <label className="text-xs text-zinc-500 ml-1">
                Pemain {index + 1} {index >= 2 ? "(Opsional)" : "*"}
              </label>
              <input
                type="text"
                placeholder="Inisial (misal: BG)"
                value={initial}
                onChange={(e) => handleInitialChange(index, e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white placeholder:text-zinc-700 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all uppercase"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleStart}
          disabled={!isValid}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all",
            isValid
              ? "bg-linear-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-rose-500/20 active:scale-[0.98]"
              : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
          )}
        >
          <Play className="w-5 h-5 fill-current" />
          Mulai Jengkeng
        </button>
      </div>
    </div>
  );
}