"use client";

import { useState, useEffect, useMemo } from "react";
import { useGameStore } from "@/store/useGameStore";
import { X, Plus, AlertCircle, ShieldAlert } from "lucide-react";
import { buildShortLabels } from "@/lib/playerName";
import { buildRoundAnnouncement } from "@/lib/announcement";
import { speak } from "@/lib/speech";
import { cn } from "@/lib/utils";

export interface AddRoundEditData {
  scores: { playerId: string; baseScore: number }[];
  shoot?: { shooterId: string; victimId: string; penaltyPoints: number };
}

interface AddRoundModalProps {
  onClose: () => void;
  editData?: AddRoundEditData | null;
  isEditMode?: boolean;
}

const PENALTY_OPTIONS = [
  { label: "Godongan", value: 100 },
  { label: "Londo", value: 200 },
  { label: "As", value: 300 },
  { label: "Joker 1", value: 500 },
  { label: "Nyewu", value: 1000 },
];

const SHORTCUTS: Array<number | "LEG"> = [-50, -10, -5, "LEG", 5, 10, 50];

export default function AddRoundModal({
  onClose,
  editData,
  isEditMode,
}: AddRoundModalProps) {
  const { players, addRound, undoLastRound } = useGameStore();

  const [scores, setScores] = useState<Record<string, string>>(() => {
    if (editData) {
      const initial: Record<string, string> = {};
      editData.scores.forEach((s) => {
        initial[s.playerId] = s.baseScore === 0 ? "0" : s.baseScore.toString();
      });
      return initial;
    }
    return players.reduce((acc, p) => ({ ...acc, [p.id]: "" }), {});
  });

  const [isGepukOpen, setIsGepukOpen] = useState(!!editData?.shoot);
  const [shooterId, setShooterId] = useState(editData?.shoot?.shooterId || "");
  const [victimId, setVictimId] = useState(editData?.shoot?.victimId || "");
  const [penaltyPoints, setPenaltyPoints] = useState<number>(
    editData?.shoot?.penaltyPoints || 100
  );

  const shortLabels = useMemo(() => buildShortLabels(players), [players]);

  useEffect(() => {
    if (shooterId && shooterId === victimId) setVictimId("");
  }, [shooterId, victimId]);

  const handleShortcut = (playerId: string, amount: number | "LEG") => {
    setScores((prev) => {
      if (amount === "LEG") return { ...prev, [playerId]: "0" };

      const currentStr = prev[playerId] || "";
      const currentNum =
        currentStr && currentStr !== "-" ? parseInt(currentStr, 10) : 0;

      return { ...prev, [playerId]: (currentNum + amount).toString() };
    });
  };

  const validationErrors: string[] = [];
  players.forEach((p) => {
    const s = scores[p.id];
    if (s && s !== "-" && parseInt(s) % 5 !== 0) {
      validationErrors.push(`${p.name} harus kelipatan 5.`);
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

    const shootData =
      isGepukOpen && shooterId && victimId && shooterId !== victimId
        ? { shooterId, victimId, penaltyPoints }
        : undefined;

    if (isEditMode) undoLastRound();

    addRound(baseScores, shootData, isEditMode);

    const state = useGameStore.getState();

    // Kalau skor terendahnya seri, pengumuman ditahan dulu. TieBreakModal yang
    // bicara: intro "bijine podo", lalu spin, baru pengumuman skor lengkap.
    if (!state.pendingTieBreak) {
      speak(
        buildRoundAnnouncement(
          state.players,
          state.rounds,
          state.shootRecords,
          state.rounds.length - 1
        )
      );
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 w-full sm:max-w-lg md:max-w-2xl rounded-t-3xl sm:rounded-3xl border border-zinc-800 shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[90dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Wayahe Ngitung</h2>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-5 md:p-6 overflow-y-auto flex-1 space-y-5 sm:space-y-6">
          <div className="space-y-4">
            {players.map((p) => (
              <div key={p.id} className="space-y-1.5">
                {/* Nama pindah ke baris sendiri. Di slot 32px yang lama,
                    "Mas Bagong" cuma kebaca "M...". */}
                <div className="flex items-baseline gap-2 px-0.5 min-w-0">
                  <span className="font-bold text-sm sm:text-base text-zinc-200 truncate">
                    {p.name}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-600 shrink-0">
                    {shortLabels[p.id]}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                  <div className="w-14 sm:w-16 md:w-20 shrink-0">
                    <input
                      type="text"
                      inputMode="none"
                      readOnly
                      placeholder="0"
                      value={scores[p.id] === "0" ? "LEG" : scores[p.id]}
                      className={cn(
                        "w-full h-10 sm:h-12 bg-zinc-950 border border-zinc-800 rounded-xl px-1 text-center text-base sm:text-lg focus:outline-none transition-all select-none font-mono",
                        scores[p.id] === "0"
                          ? "text-amber-500 font-bold text-[10px] sm:text-[11px] tracking-widest"
                          : "text-white"
                      )}
                    />
                  </div>

                  <div className="flex flex-1 gap-1 shrink-0">
                    {SHORTCUTS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleShortcut(p.id, val)}
                        className={cn(
                          "flex-1 h-10 sm:h-12 md:h-14 rounded-lg sm:rounded-[10px] font-bold transition-colors flex items-center justify-center border active:scale-95 px-0 min-w-0",
                          val === "LEG"
                            ? "text-[9px] sm:text-[10px] bg-linear-to-r from-amber-400 to-amber-500 text-zinc-950 border-amber-500 shadow-md"
                            : "text-[10px] sm:text-sm md:text-base " +
                            ((val as number) < 0
                              ? "bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border-rose-900/50"
                              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700")
                        )}
                      >
                        {val === "LEG"
                          ? "LEG"
                          : (val as number) > 0
                            ? `+${val}`
                            : val}
                      </button>
                    ))}
                  </div>
                </div>
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

          <div className="border border-zinc-800 rounded-2xl overflow-hidden">
            <button
              onClick={() => setIsGepukOpen(!isGepukOpen)}
              className="w-full flex items-center justify-between p-4 bg-zinc-950 text-amber-500 font-bold"
            >
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5" />
                <span>Gepukan?</span>
              </div>
              <Plus
                className={cn(
                  "w-5 h-5 transition-transform",
                  isGepukOpen && "rotate-45"
                )}
              />
            </button>

            {isGepukOpen && (
              <div className="p-4 bg-zinc-900 space-y-4 border-t border-zinc-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-center text-xs text-zinc-500 font-medium">
                      Sing Gepuk
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {players.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          title={p.name}
                          onClick={() =>
                            setShooterId(p.id === shooterId ? "" : p.id)
                          }
                          className={cn(
                            "py-2 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border truncate",
                            shooterId === p.id
                              ? "bg-amber-500 text-zinc-950 border-amber-500 shadow-md shadow-amber-500/20 active:scale-95"
                              : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white active:scale-95"
                          )}
                        >
                          {shortLabels[p.id]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-center text-xs text-zinc-500 font-medium">
                      Sing Digepuk
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {players.map((p) => {
                        const isDisabled = p.id === shooterId;

                        return (
                          <button
                            key={p.id}
                            type="button"
                            title={p.name}
                            disabled={isDisabled}
                            onClick={() =>
                              setVictimId(p.id === victimId ? "" : p.id)
                            }
                            className={cn(
                              "py-2 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border truncate",
                              isDisabled
                                ? "opacity-20 cursor-not-allowed bg-zinc-950 border-zinc-800 text-zinc-600"
                                : "active:scale-95",
                              !isDisabled && victimId === p.id
                                ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20"
                                : !isDisabled
                                  ? "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
                                  : ""
                            )}
                          >
                            {shortLabels[p.id]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-center text-xs text-zinc-500 font-medium">
                    Pilih Gepukane
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PENALTY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPenaltyPoints(opt.value)}
                        className={cn(
                          "py-3 px-3 rounded-xl text-sm font-bold transition-all border active:scale-95",
                          opt.value === 1000 && "col-span-2",
                          penaltyPoints === opt.value
                            ? "bg-amber-500 text-zinc-950 border-amber-500 shadow-md shadow-amber-500/20"
                            : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-950 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!isValid}
            className={cn(
              "w-full py-4 rounded-2xl font-bold text-lg transition-all",
              isValid
                ? "bg-linear-to-r from-amber-500 to-rose-600 text-white shadow-lg shadow-rose-500/20 active:scale-[0.98]"
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