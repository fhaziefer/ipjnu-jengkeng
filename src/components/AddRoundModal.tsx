"use client";

import { useState, useEffect } from "react";
import { useGameStore } from "@/store/useGameStore";
import { X, Plus, AlertCircle, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";

interface AddRoundModalProps {
  onClose: () => void;
  editData?: {
    scores: { playerId: string; baseScore: number }[];
    shoot?: { shooterId: string; victimId: string; penaltyPoints: number };
  } | null;
  isEditMode?: boolean;
}

const PENALTY_OPTIONS = [
  { label: "Godongan", value: 100 },
  { label: "Londo", value: 200 },
  { label: "As", value: 300 },
  { label: "Joker 1", value: 500 },
  { label: "Nyewu", value: 1000 },
];

export default function AddRoundModal({ onClose, editData, isEditMode }: AddRoundModalProps) {
  // Tambahin undoLastRound di sini
  const { players, rounds, addRound, undoLastRound } = useGameStore();

  const [scores, setScores] = useState<Record<string, string>>(() => {
    if (editData) {
      const initial: Record<string, string> = {};
      editData.scores.forEach(s => {
        initial[s.playerId] = s.baseScore === 0 ? "0" : s.baseScore.toString();
      });
      return initial;
    }
    return players.reduce((acc, p) => ({ ...acc, [p.id]: "" }), {});
  });

  const [isGepukOpen, setIsGepukOpen] = useState(!!editData?.shoot);
  const [shooterId, setShooterId] = useState(editData?.shoot?.shooterId || "");
  const [victimId, setVictimId] = useState(editData?.shoot?.victimId || "");
  const [penaltyPoints, setPenaltyPoints] = useState<number>(editData?.shoot?.penaltyPoints || 100);

  useEffect(() => {
    if (shooterId && shooterId === victimId) {
      setVictimId("");
    }
  }, [shooterId, victimId]);

  const handleScoreChange = (playerId: string, val: string) => {
    if (val === "" || val === "-" || /^-?\d+$/.test(val)) {
      setScores((prev) => ({ ...prev, [playerId]: val }));
    }
  };

  const handleShortcut = (playerId: string, amount: number | "LEG") => {
    setScores((prev) => {
      if (amount === "LEG") {
        return { ...prev, [playerId]: "0" };
      }

      const currentStr = prev[playerId] || "";
      let currentNum = 0;

      if (currentStr && currentStr !== "-") {
        currentNum = parseInt(currentStr, 10);
      }

      const newNum = currentNum + amount;

      return {
        ...prev,
        [playerId]: newNum.toString()
      };
    });
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

    const currentTotals: Record<string, number> = {};
    players.forEach((p) => (currentTotals[p.id] = 0));

    // Kalau mode edit aktif, hitung total poin SEMENTARA (Abaikan ronde cacat yang mau dihapus)
    const validRounds = isEditMode ? rounds.slice(0, -1) : rounds;
    validRounds.forEach((r) => {
      r.scores.forEach((s) => {
        currentTotals[s.playerId] += s.finalScore;
      });
    });

    // 1. Eksekusi Undo (Hapus nilai salah) SEKARANG SAAT DISUBMIT
    if (isEditMode) {
      undoLastRound();
    }

    // 2. Ambil Juru Kunci SEBELUM round baru ini masuk
    const oldLastPlace = useGameStore.getState().currentLastPlacePlayerId;

    // 3. Simpan data editan yang bener
    addRound(baseScores, shootData, isEditMode);

    const newLastPlace = useGameStore.getState().currentLastPlacePlayerId;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();

      let speechText = "Biji sak iki. ";
      const newTotals: Record<string, number> = {};
      const nyewuPlayers: string[] = [];

      const spellInitial = (str?: string) => str ? str.split("").join(". ") : "";

      players.forEach((p) => {
        let roundScore = parseInt(scores[p.id]);
        if (shootData) {
          if (p.id === shootData.shooterId) roundScore += shootData.penaltyPoints;
          if (p.id === shootData.victimId) roundScore -= shootData.penaltyPoints;
        }

        const finalTotalScore = currentTotals[p.id] + roundScore;
        newTotals[p.id] = finalTotalScore;

        if (currentTotals[p.id] < 1000 && finalTotalScore >= 1000) {
          nyewuPlayers.push(spellInitial(p.initials));
        }

        const scoreText = finalTotalScore < 0 ? `min ${Math.abs(finalTotalScore)}` : finalTotalScore.toString();
        speechText += `${spellInitial(p.initials)}, ${scoreText} ... `;
      });

      if (shootData) {
        const shooter = spellInitial(players.find((p) => p.id === shooterId)?.initials);
        const victim = spellInitial(players.find((p) => p.id === victimId)?.initials);

        let psywarPukulan = "";

        switch (penaltyPoints) {
          case 100:
            psywarPukulan = "gawe godongan, ... remeh, remeh, remeh, ... sitik tok ...";
            break;
          case 200:
            psywarPukulan = "gawe londo, lumayan keroso ... ha ha ha ...";
            break;
          case 300:
            psywarPukulan = "gawe As, rodok ngelu, ... ha ha ha ...";
            break;
          case 500:
            psywarPukulan = "gawe joker, ... biyuh biyuh biyuh ...";
            break;
          case 1000:
            psywarPukulan = "langsung gawe joker loro, ... wes wes wes, sret wae, ... lek gak isin tapi, ha ha ha ...";
            break;
          default:
            psywarPukulan = `${penaltyPoints} poin ...`;
        }

        speechText += `Woro woro! ... ${shooter} gepuk ${victim} ${psywarPukulan} ...`;
      }

      if (nyewuPlayers.length > 0) {
        speechText += `Woro woro! ... ${nyewuPlayers.join(" dan ")} wes nyewu, ... ngarit tenan, ... beh beh beh ...`;
      }

      if (players.length >= 2) {
        const sortedScores = Object.values(newTotals).sort((a, b) => b - a);
        const lowest = sortedScores[sortedScores.length - 1];
        const secondLowest = sortedScores[sortedScores.length - 2];
        const gap = secondLowest - lowest;

        if (gap >= 500) {
          speechText += `Woro woro! ... Jarake wes punjul 500, ... sret opo gak?? ... ha ha ha ...`;
        }
      }

      if (oldLastPlace && newLastPlace && oldLastPlace !== newLastPlace) {
        const newJuruKunciInitials = spellInitial(players.find(p => p.id === newLastPlace)?.initials);
        speechText += `Woro woro! ... Sing jengkeng ganti ${newJuruKunciInitials} ... `;
      }

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.lang = "id-ID";

      const voices = window.speechSynthesis.getVoices();
      const indonesianVoice = voices.find(v => v.lang === "id-ID" || v.lang === "id_ID");
      if (indonesianVoice) utterance.voice = indonesianVoice;

      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }

    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Wayahe Ngitung</h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-6 overflow-y-auto flex-1 space-y-6">

          <div className="space-y-4">
            {players.map((p) => {
              return (
                <div key={p.id} className="flex items-center justify-between gap-1.5 sm:gap-2">
                  <span className="font-bold text-sm sm:text-lg text-zinc-300 w-8 sm:w-10 shrink-0 truncate">
                    {p.initials}
                  </span>

                  <div className="w-14 sm:w-16 shrink-0">
                    <input
                      type="text"
                      inputMode="none"
                      readOnly
                      placeholder="0"
                      value={scores[p.id] === "0" ? "LEG" : scores[p.id]}
                      className={cn(
                        "w-full h-[40px] sm:h-[48px] bg-zinc-950 border border-zinc-800 rounded-xl px-1 text-center text-base sm:text-lg focus:outline-none transition-all select-none font-mono",
                        scores[p.id] === "0" ? "text-amber-500 font-bold text-[10px] sm:text-[11px] tracking-widest" : "text-white"
                      )}
                    />
                  </div>

                  <div className="flex flex-1 gap-1 shrink-0">
                    {[-50, -10, -5, "LEG", 5, 10, 50].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => handleShortcut(p.id, val as number | "LEG")}
                        className={cn(
                          "flex-1 h-[40px] sm:h-[48px] rounded-[8px] sm:rounded-[10px] font-bold transition-colors flex items-center justify-center border active:scale-95 px-0",
                          val === "LEG"
                            ? "text-[9px] sm:text-[10px] bg-linear-to-r from-amber-400 to-amber-500 text-zinc-950 border-amber-500 shadow-md"
                            : "text-[11px] sm:text-sm " + (
                              (val as number) < 0
                                ? "bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border-rose-900/50"
                                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border-zinc-700"
                            )
                        )}
                      >
                        {val === "LEG" ? "LEG" : ((val as number) > 0 ? `+${val}` : val)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
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
              <Plus className={cn("w-5 h-5 transition-transform", isGepukOpen && "rotate-45")} />
            </button>

            {isGepukOpen && (
              <div className="p-4 bg-zinc-900 space-y-4 border-t border-zinc-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-center text-xs text-zinc-500 font-medium">Sing Gepuk</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {players.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setShooterId(p.id === shooterId ? "" : p.id)}
                          className={cn(
                            "py-2 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border truncate",
                            shooterId === p.id
                              ? "bg-amber-500 text-zinc-950 border-amber-500 shadow-md shadow-amber-500/20 active:scale-95"
                              : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white active:scale-95"
                          )}
                        >
                          {p.initials}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-center text-xs text-zinc-500 font-medium">Sing Digepuk</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {players.map((p) => {
                        const isDisabled = p.id === shooterId;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={isDisabled}
                            onClick={() => setVictimId(p.id === victimId ? "" : p.id)}
                            className={cn(
                              "py-2 px-1 sm:px-2 rounded-xl text-xs sm:text-sm font-bold transition-all border truncate",
                              isDisabled
                                ? "opacity-20 cursor-not-allowed bg-zinc-950 border-zinc-800 text-zinc-600"
                                : "active:scale-95",
                              !isDisabled && victimId === p.id
                                ? "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-500/20"
                                : !isDisabled ? "bg-zinc-950 text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-white" : ""
                            )}
                          >
                            {p.initials}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <label className="block text-center text-xs text-zinc-500 font-medium">Gepukane</label>
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