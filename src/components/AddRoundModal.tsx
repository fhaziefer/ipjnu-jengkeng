"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { X, Plus, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddRoundModalProps {
  onClose: () => void;
}

const PENALTY_OPTIONS = [
  { label: "Godongan", value: 100 },
  { label: "Londo", value: 200 },
  { label: "As", value: 300 },
  { label: "Joker 1", value: 500 },
  { label: "Nyewu", value: 1000 },
];

export default function AddRoundModal({ onClose }: AddRoundModalProps) {
  const { players, addRound } = useGameStore();
  const [scores, setScores] = useState<Record<string, string>>(
    players.reduce((acc, p) => ({ ...acc, [p.id]: "" }), {})
  );

  const [isGepukOpen, setIsGepukOpen] = useState(false);
  const [shooterId, setShooterId] = useState("");
  const [victimId, setVictimId] = useState("");
  const [penaltyPoints, setPenaltyPoints] = useState<number>(100);

  const handleScoreChange = (playerId: string, val: string) => {
    if (val === "" || val === "-" || /^-?\d+$/.test(val)) {
      setScores((prev) => ({ ...prev, [playerId]: val }));
    }
  };

  const validationErrors: string[] = [];
  players.forEach((p) => {
    const s = scores[p.id];
    if (s && s !== "-" && parseInt(s) % 5 !== 0) {
      validationErrors.push(`${p.initials} harus kelipatan 5.`);
    }
  });

  const isAllFilled = players.every((p) => scores[p.id] && scores[p.id] !== "-");
  const isValid = isAllFilled && validationErrors.length === 0;

  const handleSubmit = () => {
    if (!isValid) return;

    const baseScores = players.map((p) => ({
      playerId: p.id,
      baseScore: parseInt(scores[p.id]),
    }));

    let shootData = undefined;
    if (isGepukOpen && shooterId && victimId && shooterId !== victimId) {
      shootData = { shooterId, victimId, penaltyPoints };
    }

    addRound(baseScores, shootData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Wayahe Ngitung</h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          <div className="space-y-4">
            {players.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-4">
                <span className="font-bold text-lg text-zinc-300 w-16">{p.initials}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={scores[p.id]}
                  onChange={(e) => handleScoreChange(p.id, e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white text-right text-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>
            ))}
          </div>

          {validationErrors.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-xl text-sm flex gap-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <ul className="list-disc pl-4">
                {validationErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Tembak Section */}
          <div className="border border-zinc-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setIsGepukOpen(!isGepukOpen)}
              className="w-full flex items-center justify-between p-4 bg-zinc-950 text-amber-500 font-bold"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span>Gepukan?</span>
              </div>
              <Plus className={cn("w-5 h-5 transition-transform", isGepukOpen && "rotate-45")} />
            </button>
            
            {isGepukOpen && (
              <div className="p-4 bg-zinc-900 space-y-4 border-t border-zinc-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 font-medium ml-1">Sing Gepuk</label>
                    <select
                      value={shooterId}
                      onChange={(e) => setShooterId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Pilih...</option>
                      {players.map(p => <option key={p.id} value={p.id}>{p.initials}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-zinc-500 font-medium ml-1">Sing Digepuk</label>
                    <select
                      value={victimId}
                      onChange={(e) => setVictimId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Pilih...</option>
                      {players.filter(p => p.id !== shooterId).map(p => <option key={p.id} value={p.id}>{p.initials}</option>)}
                    </select>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-zinc-500 font-medium ml-1">Gepukane</label>
                  <select
                    value={penaltyPoints}
                    onChange={(e) => setPenaltyPoints(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-amber-500"
                  >
                    {PENALTY_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-950 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-lg transition-all",
              isValid
                ? "bg-gradient-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-rose-500/20 active:scale-[0.98]"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            )}
          >
            Oke Josjis
          </button>
        </div>

      </div>
    </div>
  );
}
