"use client";

import { useState, useMemo } from "react";
import { useGameStore } from "@/store/useGameStore";
import { CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { buildShortLabels } from "@/lib/playerName";
import { speak } from "@/lib/speech";
import { cn } from "@/lib/utils";
import RoundList from "./RoundList";
import PsywarFooter from "./PsywarFooter";
import AddRoundModal, { type AddRoundEditData } from "./AddRoundModal";
import PlayerDetailModal from "./PlayerDetailModal";
import TieBreakModal from "./TieBreakModal";

export default function DashboardScreen() {
  const {
    players,
    rounds,
    shootRecords,
    finishGame,
    undoLastRound,
    currentLastPlacePlayerId,
    pendingTieBreak,
  } = useGameStore();

  const [isAddRoundOpen, setIsAddRoundOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isUndoModalOpen, setIsUndoModalOpen] = useState(false);

  const [editData, setEditData] = useState<AddRoundEditData | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const lastRound = rounds[rounds.length - 1];
  const canEdit = lastRound && !lastRound.isEdited;

  // Selama spin belum kelar, ronde berikutnya tidak boleh masuk: juru kunci
  // ronde ini masih menggantung.
  const isTieBreakPending = pendingTieBreak !== null;

  const shortLabels = useMemo(() => buildShortLabels(players), [players]);

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

  /**
   * 💩 diambil dari store, BUKAN dari posisi terakhir hasil sort.
   *
   * Kalau pakai sort, saat skor terendah seri yang dapat 💩 adalah pemain yang
   * kebetulan terakhir di array — jadi bisa berbeda dari hasil spin dan dari
   * apa yang diumumkan TTS.
   */
  const playerRanks = useMemo(() => {
    const sortedIds = [...players]
      .sort((a, b) => totals[b.id] - totals[a.id])
      .map((p) => p.id);

    const ranks: Record<string, string> = {};

    players.forEach((p) => {
      const rankIndex = sortedIds.indexOf(p.id);

      if (p.id === currentLastPlacePlayerId) {
        ranks[p.id] = "💩";
      } else if (rankIndex === 0) {
        ranks[p.id] = "👑";
      } else if (rankIndex === 1 && players.length === 4) {
        ranks[p.id] = "😜";
      } else {
        ranks[p.id] = "😭";
      }
    });

    if (rounds.length === 0) {
      players.forEach((p) => (ranks[p.id] = ""));
    }

    return ranks;
  }, [players, totals, rounds.length, currentLastPlacePlayerId]);

  return (
    <div className="h-dvh flex flex-col bg-zinc-950 relative overflow-hidden w-full max-w-[480px] sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto sm:shadow-2xl">
      <header className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-zinc-950 border-b border-zinc-900 shrink-0">
        <h1 className="text-xl font-black text-transparent bg-clip-text bg-linear-to-br from-amber-400 to-rose-500">
          JENGKENG
        </h1>
        <button
          disabled={isTieBreakPending}
          onClick={() => {
            speak("Mosok sret tenan? ... yo gak opo opo, lek gak isin, ha ha ha.");
            setIsFinishModalOpen(true);
          }}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 font-bold rounded-full border transition-transform",
            isTieBreakPending
              ? "bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed"
              : "bg-rose-500/10 text-rose-500 border-rose-500/20 active:scale-95"
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>SRET</span>
        </button>
      </header>

      <div
        className={cn(
          "shrink-0 z-10 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 grid gap-px",
          gridColsClass
        )}
      >
        {players.map((p) => {
          const score = totals[p.id] || 0;
          const isGodTier = score >= 1000;
          const isHellTier = score <= -1000;
          const hasSpecialEffect = isGodTier || isHellTier;

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlayerId(p.id)}
              title={p.name}
              className="relative flex flex-col items-center justify-center py-3 sm:py-4 md:py-5 bg-zinc-950 active:bg-zinc-900 transition-colors overflow-hidden group min-w-0"
            >
              {hasSpecialEffect && (
                <>
                  <div
                    className={cn(
                      "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_2s_linear_infinite] z-0",
                      isGodTier
                        ? "bg-[conic-gradient(transparent_25%,#fbbf24_50%,transparent_75%,#fbbf24_100%)]"
                        : "bg-[conic-gradient(transparent_25%,#f43f5e_50%,transparent_75%,#f43f5e_100%)]"
                    )}
                  />
                  <div className="absolute inset-0.5 bg-zinc-950 z-0" />
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

              <span className="relative z-10 text-sm sm:text-base md:text-lg font-black text-white truncate max-w-full px-1">
                {shortLabels[p.id]}
              </span>
              <span className="relative z-10 text-lg sm:text-xl md:text-2xl">
                {playerRanks[p.id]}
              </span>
            </button>
          );
        })}
      </div>

      <RoundList />
      <PsywarFooter />

      <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] sm:bottom-6 left-0 w-full px-4 sm:px-5 z-20 flex gap-3">
        {rounds.length > 0 && (
          <button
            disabled={isTieBreakPending}
            onClick={() => setIsUndoModalOpen(true)}
            className={cn(
              "flex-1 flex items-center justify-center py-3.5 sm:py-4 rounded-xl font-bold shadow-xl transition-all border",
              isTieBreakPending
                ? "bg-zinc-900 text-zinc-700 border-zinc-800 cursor-not-allowed"
                : "bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white active:scale-95"
            )}
          >
            <span>Salah Ngitung</span>
          </button>
        )}
        <button
          disabled={isTieBreakPending}
          onClick={() => setIsAddRoundOpen(true)}
          className={cn(
            "flex-1 flex items-center justify-center py-3.5 sm:py-4 rounded-xl font-bold shadow-xl transition-all",
            isTieBreakPending
              ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
              : "bg-linear-to-r from-amber-500 to-rose-600 text-white shadow-rose-500/30 active:scale-95"
          )}
        >
          <span>Wayahe Ngitung</span>
        </button>
      </div>

      {/* Blocking. Tidak bisa ditutup sampai spin selesai. */}
      <TieBreakModal />

      {isAddRoundOpen && (
        <AddRoundModal
          editData={editData}
          isEditMode={isEditMode}
          onClose={() => {
            setIsAddRoundOpen(false);
            setEditData(null);
            setIsEditMode(false);
          }}
        />
      )}

      {selectedPlayerId && (
        <PlayerDetailModal
          playerId={selectedPlayerId}
          onClose={() => setSelectedPlayerId(null)}
        />
      )}

      {isFinishModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsFinishModalOpen(false)}
        >
          <div
            className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden p-6 text-center space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
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

      {isUndoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsUndoModalOpen(false)}
        >
          <div
            className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden p-6 text-center space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center text-zinc-400">
              <RotateCcw className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">
                Edit Itungan Keri Dhewe?
              </h2>
              <p className="text-sm text-zinc-500">
                Pilih edit nek cuma salah input angka/gepukan.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {canEdit ? (
                <button
                  onClick={() => {
                    const target = rounds[rounds.length - 1];
                    const lastShoot = shootRecords.find(
                      (r) => r.roundId === target.roundId
                    );

                    setEditData({ scores: target.scores, shoot: lastShoot });
                    setIsEditMode(true);

                    setIsUndoModalOpen(false);
                    setIsAddRoundOpen(true);
                  }}
                  className="w-full py-3 rounded-xl font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 transition-colors"
                >
                  Edit Nilai
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl font-medium text-amber-500/50 border border-amber-500/20 bg-amber-500/5 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Maksimal edit cuma pisan!</span>
                </div>
              )}

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
                  Busek Total
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}