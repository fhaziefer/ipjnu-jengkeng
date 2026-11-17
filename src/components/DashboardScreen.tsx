"use client";

import { getTemplates } from "@/store/useSettingsStore";
import { SpinBorder } from "./SpinBorder";
import { useState, useMemo } from "react";
import { useGameStore } from "@/store/useGameStore";
import { Undo2, CheckCircle2, AlertTriangle, RotateCcw } from "lucide-react";
import { buildShortLabels } from "@/lib/playerName";
import { speak } from "@/lib/speech";
import { computeTotals, sortPlayersByTotal } from "@/lib/scoring";
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

  const totals = useMemo(() => computeTotals(players, rounds), [players, rounds]);

  /**
   * 💩 diambil dari store, BUKAN dari posisi terakhir hasil sort.
   *
   * Kalau pakai sort, saat skor terendah seri yang dapat 💩 adalah pemain yang
   * kebetulan terakhir di array — jadi bisa berbeda dari hasil spin dan dari
   * apa yang diumumkan TTS.
   */
  const playerRanks = useMemo(() => {
    const sortedIds = sortPlayersByTotal(players, totals).map((p) => p.id);

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
    <div className="h-dvh flex flex-col bg-bg relative overflow-hidden w-full max-w-[480px] sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
      <header className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 bg-bg border-b border-line shrink-0">
        <h1 className="text-xl font-black text-fg">
          JENGKENG
        </h1>
        <button
          disabled={isTieBreakPending}
          onClick={() => {
            speak(getTemplates().sretConfirm);
            setIsFinishModalOpen(true);
          }}
          className={cn(
            "flex items-center gap-1.5 px-4 min-h-11 font-bold rounded-full border transition-transform",
            isTieBreakPending
              ? "bg-surface text-fg-subtle border-line cursor-not-allowed"
              : "bg-danger/10 text-danger border-danger/20 active:scale-95"
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>SRET</span>
        </button>
      </header>

      <div
        className={cn(
          "shrink-0 z-10 bg-bg/90 border-b border-line grid gap-px",
          gridColsClass
        )}
      >
        {players.map((p) => {
          const score = totals[p.id] || 0;
          const isGodTier = score >= 1000;
          const isHellTier = score <= -1000;

          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlayerId(p.id)}
              title={p.name}
              className={cn(
                "relative overflow-hidden flex flex-col items-center justify-center py-3 sm:py-4 md:py-5 min-h-11 bg-bg active:bg-surface transition-colors min-w-0"
              )}
            >
              {/* Tembus +1000 (nyewu) = cincin emas berputar, tembus -1000 = cincin merah */}
              {isGodTier && <SpinBorder tone="god" tint="bg-fg/10" />}
              {isHellTier && <SpinBorder tone="hell" tint="bg-danger/10" />}
              <span className="relative z-10 text-sm sm:text-base md:text-lg font-black text-fg truncate max-w-full px-1">
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
              "shrink-0 size-12 sm:size-14 flex items-center justify-center rounded-xl transition-all border",
              isTieBreakPending
                ? "text-fg-subtle border-line cursor-not-allowed"
                : "bg-transparent text-fg-soft border-line-control hover:bg-surface-2 hover:text-fg active:scale-95"
            )}
            aria-label="Salah Ngitung"
            title="Salah Ngitung"
          >
            <Undo2 className="w-5 h-5" />
          </button>
        )}
        <button
          disabled={isTieBreakPending}
          onClick={() => setIsAddRoundOpen(true)}
          className={cn(
            "flex-1 flex items-center justify-center py-3.5 sm:py-4 rounded-xl font-bold transition-all",
            isTieBreakPending
              ? "bg-surface-2 text-fg-subtle cursor-not-allowed"
              : "active:scale-95 bg-accent text-on-accent hover:bg-accent-hover"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setIsFinishModalOpen(false)}
        >
          <div
            className="bg-surface w-full max-w-sm rounded-2xl border border-line overflow-hidden p-6 text-center space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center text-fg">
              <AlertTriangle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-fg">Sret tenan??</h2>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setIsFinishModalOpen(false)}
                className="flex-1 py-3 rounded-xl font-bold text-fg-soft bg-surface-2 hover:bg-surface-3 transition-colors"
              >
                Gak Sido
              </button>
              <button
                onClick={() => {
                  setIsFinishModalOpen(false);
                  finishGame();
                }}
                className="flex-1 py-3 rounded-xl font-bold text-fg bg-danger-solid hover:bg-danger-solid transition-colors"
              >
                Sret Wae
              </button>
            </div>
          </div>
        </div>
      )}

      {isUndoModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setIsUndoModalOpen(false)}
        >
          <div
            className="bg-surface w-full max-w-sm rounded-2xl border border-line overflow-hidden p-6 text-center space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center text-fg-muted">
              <RotateCcw className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-fg">
                Edit Itungan Keri Dhewe?
              </h2>
              <p className="text-sm text-fg-subtle">
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
                  className="w-full py-3 rounded-xl font-bold text-on-accent bg-accent hover:bg-accent-hover transition-colors"
                >
                  Edit Nilai
                </button>
              ) : (
                <div className="w-full py-3 rounded-xl font-medium text-fg-subtle border border-line-strong bg-fg/5 flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  <span className="text-sm">Maksimal edit cuma pisan!</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setIsUndoModalOpen(false)}
                  className="flex-1 py-3 rounded-xl font-bold text-fg-soft bg-surface-2 hover:bg-surface-3 transition-colors"
                >
                  Gak Sido
                </button>
                <button
                  onClick={() => {
                    undoLastRound();
                    setIsUndoModalOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-fg bg-danger-solid hover:bg-danger-solid transition-colors"
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