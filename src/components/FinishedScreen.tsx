"use client";

import { canResume, AUTO_FINISH_IDLE_MS, RESUME_WINDOW_MS } from "@/lib/autoFinish";
import { useGameStore } from "@/store/useGameStore";
import { RefreshCcw, Trophy, Skull, Share2, Loader2, History } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";
import { format } from "date-fns";
import { buildShortLabels } from "@/lib/playerName";
import HistoryScreen from "./HistoryScreen";
import { computeTotals, sortPlayersByTotal } from "@/lib/scoring";
import { cn } from "@/lib/utils";

type FileShareData = {
  files: File[];
};

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: FileShareData) => boolean;
  share?: (data: FileShareData) => Promise<void>;
};

async function dataUrlToFile(dataUrl: string, fileName: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  return new File([blob], fileName, {
    type: "image/png",
  });
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export default function FinishedScreen() {
  const { players, rounds, resetGame, startGame, currentLastPlacePlayerId, autoFinish, resumeGame } =
    useGameStore();
  const gameStatus = useGameStore((s) => s.gameStatus);
  const lastActivityAt = useGameStore((s) => s.lastActivityAt);
  // Dibaca sekali saat layar dibuka; jendela 3 jam tidak perlu detak per detik.
  const [openedAt] = useState(() => Date.now());
  const resumable = canResume(gameStatus, autoFinish, openedAt);

  const receiptRef = useRef<HTMLDivElement>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isRematchModalOpen, setIsRematchModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const shortLabels = useMemo(() => buildShortLabels(players), [players]);

  const totals = useMemo(() => computeTotals(players, rounds), [players, rounds]);

  const sortedPlayers = useMemo(
    () => sortPlayersByTotal(players, totals),
    [players, totals]
  );

  const winner = sortedPlayers[0];

  /**
   * Juru kunci diambil dari store, bukan dari posisi terakhir hasil sort.
   *
   * Kalau skor terbawah seri, sort akan menunjuk pemain yang kebetulan
   * terakhir di array — bisa berbeda dari orang yang kalah spin dan berbeda
   * dari yang sudah diumumkan TTS.
   */
  const loser =
    players.find((p) => p.id === currentLastPlacePlayerId) ??
    sortedPlayers[sortedPlayers.length - 1];

  const cumulativeRounds = useMemo(() => {
    const runningTotals: Record<string, number> = {};

    players.forEach((p) => {
      runningTotals[p.id] = 0;
    });

    return rounds.map((round, index) => {
      round.scores.forEach((s) => {
        runningTotals[s.playerId] += s.finalScore;
      });

      return {
        roundNumber: index + 1,
        scores: { ...runningTotals },
      };
    });
  }, [rounds, players]);

  const isCompactReceipt = cumulativeRounds.length > 15;
  const isUltraCompactReceipt = cumulativeRounds.length > 28;
  const isWideReceipt = players.length >= 4;

  // Legend hanya perlu kalau inisialnya memang berbeda dari nama aslinya.
  const needsLegend = players.some(
    (p) => shortLabels[p.id].toLowerCase() !== p.name.toLowerCase()
  );

  const handleExportPNG = async () => {
    if (!receiptRef.current) return;

    try {
      setIsExporting(true);

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      });

      const node = receiptRef.current;
      const fileName = `Jengkeng-${Date.now()}.png`;

      const exportWidth = node.offsetWidth;
      const exportHeight = node.offsetHeight;

      const dataUrl = await toPng(node, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#121417",
        cacheBust: true,
        width: exportWidth,
        height: exportHeight,
        style: {
          width: `${exportWidth}px`,
          height: `${exportHeight}px`,
          transform: "none",
        },
      });

      const file = await dataUrlToFile(dataUrl, fileName);
      const nav = navigator as NavigatorWithFileShare;
      const shareData = { files: [file] };

      if (nav.share && nav.canShare?.(shareData)) {
        await nav.share(shareData);
        return;
      }

      downloadDataUrl(dataUrl, fileName);

    } catch (error) {
      console.error("Gagal export/share gambar", error);
      alert("Gagal bikin atau share gambar. Coba maneh!");

    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-start sm:justify-center px-4 py-6 sm:p-6 bg-bg relative overflow-y-auto overflow-x-hidden">
      {/* ===================================================== */}
      {/* 1. TAMPILAN LAYAR HP (UI UTAMA) */}
      {/* ===================================================== */}
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg space-y-5 sm:space-y-8 relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-full mb-3 sm:mb-4 bg-fg text-bg">
            <Trophy className="w-12 h-12 text-bg" />
          </div>

          <h1 className="text-4xl font-black text-fg">Sreeet</h1>

          <div className="space-y-1">
            <p className="text-fg-muted text-sm">Pengarit Handal 👑</p>
            <p className="text-fg font-bold text-2xl px-4 break-words">
              {winner?.name}
            </p>
          </div>
        </div>

        {autoFinish && (
          <div
            data-testid="auto-finish-notice"
            className="bg-surface border border-line-strong rounded-2xl p-4 space-y-3 text-center"
          >
            <p className="text-sm text-fg">
              Game ditutup otomatis: {AUTO_FINISH_IDLE_MS / 60_000} menit tanpa itungan
              {lastActivityAt ? ` (terakhir ${format(new Date(lastActivityAt), "HH.mm")})` : ""}.
            </p>
            {resumable ? (
              <>
                <button
                  type="button"
                  onClick={() => resumeGame()}
                  className="w-full min-h-11 py-3 rounded-xl font-bold text-on-accent bg-accent hover:bg-accent-hover transition-colors"
                >
                  Lanjutkan game
                </button>
                <p className="text-xs text-fg-subtle">
                  Masih bisa dilanjutkan sampai {RESUME_WINDOW_MS / 3_600_000} jam setelah ditutup. Cadangan online
                  menunggu sampai itu lewat atau game baru dimulai.
                </p>
              </>
            ) : null}
          </div>
        )}

        <div className="bg-surface/50 border border-line rounded-2xl p-4 sm:p-6 space-y-4">
          <h2 className="text-sm font-semibold text-fg-subtle uppercase tracking-wider text-center">
            Bijine Cah-Cah
          </h2>

          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              const isWinner = player.id === winner?.id;
              const isLoser = player.id === loser?.id;

              let scoreColor = "text-fg";
              if (isWinner) scoreColor = "text-fg";
              else if (isLoser) scoreColor = "text-danger";

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-bg p-3 sm:p-4 rounded-xl border border-line/50 gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-fg-subtle font-mono text-sm shrink-0">
                      #{index + 1}
                    </span>

                    <span className="font-bold text-fg text-lg flex items-center gap-2 min-w-0">
                      <span className="truncate">{player.name}</span>
                      {isWinner && <span className="text-base shrink-0">👑</span>}
                      {isLoser && <span className="text-base shrink-0">💩</span>}
                    </span>
                  </div>

                  <span
                    className={`font-mono text-xl font-semibold shrink-0 ${scoreColor}`}
                  >
                    {totals[player.id]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-danger/10 border border-danger/20 rounded-2xl p-6 text-center space-y-2">
          <Skull className="w-8 h-8 text-danger mx-auto mb-2" />

          <div className="space-y-1">
            <p className="text-danger font-medium">Sing Ngesret</p>
            <p className="text-danger text-xl font-bold break-words">
              {loser?.name} 💩
            </p>
          </div>

          <p className="text-sm text-danger/80 mt-2">
            {loser?.name} remeh {loser?.name} remeeeeh... 💩💩💩
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg border border-line-strong bg-surface text-fg-soft hover:bg-surface-2 hover:text-fg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {isExporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}

            {isExporting ? "Lagi Njepret..." : "Share Hasile"}
          </button>

          <button
            onClick={() => setIsRematchModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg bg-surface-2 text-fg hover:bg-surface-3 transition-all active:scale-[0.98]"
          >
            <RefreshCcw className="w-5 h-5" />
            Main Maneh
          </button>

          <button
            onClick={() => setIsHistoryOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold text-fg-muted hover:text-fg transition-colors"
          >
            <History className="w-4 h-4" />
            Riwayat
          </button>
        </div>
      </div>

      {isHistoryOpen && <HistoryScreen onClose={() => setIsHistoryOpen(false)} />}

      {/* ===================================================== */}
      {/* MODAL REMATCH (PANGGAH / GANTI / BUBAR) */}
      {/* ===================================================== */}
      {isRematchModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
          onClick={() => setIsRematchModalOpen(false)}
        >
          <div
            className="bg-surface w-full max-w-sm sm:max-w-md rounded-2xl border border-line overflow-hidden p-5 sm:p-6 text-center space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center text-fg">
              <RefreshCcw className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-bold text-fg">
                Sing main panggah?
              </h2>
              <p className="text-sm text-fg-subtle">
                Pilih panggah lek wonge tetep, ganti lek enek sing arep diganti.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  startGame(players);
                  setIsRematchModalOpen(false);
                }}
                className="w-full py-3 rounded-xl font-bold text-on-accent bg-accent hover:bg-accent-hover transition-colors"
              >
                Panggah
              </button>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    /**
                     * Versi lama cuma mengosongkan rounds & shootRecords, jadi
                     * juru kunci dan sisa spin dari permainan sebelumnya ikut
                     * terbawa ke sesi setup berikutnya.
                     */
                    useGameStore.setState({
                      gameStatus: "idle",
                      rounds: [],
                      shootRecords: [],
                      currentLastPlacePlayerId: null,
                      lastPlaceSinceTimestamp: null,
                      pendingTieBreak: null,
                      carriedTieBreak: null,
                      firstTurnPlayerId: null,
                      lastActivityAt: null,
                      autoFinish: null,
                    });
                    setIsRematchModalOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-fg-soft bg-surface-2 hover:bg-surface-3 transition-colors"
                >
                  Ganti
                </button>

                <button
                  onClick={() => {
                    resetGame();
                    setIsRematchModalOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-fg bg-danger-solid hover:bg-danger-solid transition-colors"
                >
                  Bubar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================== */}
      {/* 2. TAMPILAN RAHASIA UNTUK EXPORT PNG (Disembunyikan) */}
      {/* ===================================================== */}
      <div className="absolute inset-0 -z-50 opacity-0 pointer-events-none overflow-hidden flex items-start justify-center">
        <div
          ref={receiptRef}
          className={cn(
            "bg-bg flex flex-col relative overflow-hidden box-border",
            "mx-auto",
            isWideReceipt ? "w-125" : "w-107.5",
            isUltraCompactReceipt
              ? "p-5"
              : isCompactReceipt
                ? "p-6"
                : "p-8"
          )}
        >

          <div className="relative z-10 flex flex-col items-center w-full">
            <div
              className={cn(
                "flex flex-col items-center w-full text-center",
                isUltraCompactReceipt ? "mb-3" : isCompactReceipt ? "mb-4" : "mb-6"
              )}
            >
              <img
                src="/icon.svg"
                width={isCompactReceipt ? 54 : 70}
                height={isCompactReceipt ? 54 : 70}
                className="mb-3 object-contain"
                alt="Logo"
              />

              <h1
                className={cn(
                  "font-black tracking-widest text-center text-fg",
                  isCompactReceipt ? "text-xl" : "text-2xl"
                )}
              >
                IPJNU JENGKENG
              </h1>

              <p className="text-fg-subtle text-xs mt-1 text-center">
                {rounds.length} Mainan
              </p>
            </div>

            <div
              className={cn(
                "w-full max-w-full bg-surface/60 rounded-2xl border border-line mb-6 box-border",
                isUltraCompactReceipt
                  ? "p-2"
                  : isCompactReceipt
                    ? "p-3"
                    : "p-4"
              )}
            >
              <table
                className={cn(
                  "w-full table-fixed text-fg border-collapse",
                  isUltraCompactReceipt
                    ? "text-[8px]"
                    : isCompactReceipt
                      ? "text-[10px]"
                      : "text-xs"
                )}
              >
                <thead>
                  <tr className="border-b border-line-strong">
                    {players.map((p) => (
                      <th
                        key={p.id}
                        className={cn(
                          "px-1 text-center uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis",
                          isCompactReceipt ? "py-1" : "py-2"
                        )}
                      >
                        {/* Inisial, bukan nama. 4 kolom nama panjang kepotong
                            jadi tidak terbaca di receipt. */}
                        {shortLabels[p.id]}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {cumulativeRounds.map((r, i) => {
                    const isLastRow = i === cumulativeRounds.length - 1;

                    return (
                      <tr
                        key={r.roundNumber}
                        className={!isLastRow ? "border-b border-line/50" : ""}
                      >
                        {players.map((p) => {
                          const score = r.scores[p.id];
                          let colorClass = "text-fg-soft";

                          if (isLastRow) {
                            /**
                             * Dibandingkan per id, bukan per nilai skor.
                             * Kalau dua pemain punya total sama, versi lama
                             * mewarnai dua-duanya merah.
                             */
                            if (p.id === winner?.id) {
                              colorClass = cn(
                                "text-fg font-bold",
                                isCompactReceipt ? "text-[10px]" : "text-sm"
                              );
                            } else if (p.id === loser?.id) {
                              colorClass = cn(
                                "text-danger font-bold",
                                isCompactReceipt ? "text-[10px]" : "text-sm"
                              );
                            } else {
                              colorClass = cn(
                                "text-fg font-bold",
                                isCompactReceipt ? "text-[10px]" : "text-sm"
                              );
                            }
                          }

                          return (
                            <td
                              key={p.id}
                              className={cn(
                                "px-1 text-center font-mono font-medium tabular-nums whitespace-nowrap leading-none",
                                isUltraCompactReceipt
                                  ? "py-0.75"
                                  : isCompactReceipt
                                    ? "py-1"
                                    : "py-2",
                                colorClass
                              )}
                            >
                              {score}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Tanpa ini, hasil share cuma berisi inisial tanpa penjelasan. */}
              {needsLegend && (
                <div
                  className={cn(
                    "mt-3 pt-2 border-t border-dashed border-line flex flex-wrap justify-center gap-x-3 gap-y-1 text-fg-subtle",
                    isUltraCompactReceipt ? "text-[7px]" : "text-[9px]"
                  )}
                >
                  {players.map((p) => (
                    <span key={p.id} className="whitespace-nowrap">
                      <span className="font-bold text-fg-muted">
                        {shortLabels[p.id]}
                      </span>
                      {" = "}
                      {p.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div
              className={cn(
                "w-full max-w-full border-t border-dashed border-line-strong grid grid-cols-2 box-border",
                isCompactReceipt ? "pt-4 gap-3" : "pt-6 gap-4"
              )}
            >
              <div className="flex flex-col items-center text-center min-w-0">
                <p
                  className={cn(
                    "text-fg-subtle uppercase tracking-widest font-bold mb-2 text-center",
                    isCompactReceipt ? "text-[8px]" : "text-[10px]"
                  )}
                >
                  Pengarit Handal
                </p>

                <div className="flex items-center justify-center gap-2 min-w-0 w-full">
                  <Trophy
                    className={cn(
                      "text-fg shrink-0",
                      isCompactReceipt ? "w-5 h-5" : "w-6 h-6"
                    )}
                  />
                  <h2
                    className={cn(
                      "font-black text-fg truncate",
                      isCompactReceipt ? "text-lg" : "text-xl"
                    )}
                  >
                    {winner?.name}
                  </h2>
                </div>

                <p
                  className={cn(
                    "text-fg font-mono mt-1 font-bold text-center",
                    isCompactReceipt ? "text-base" : "text-lg"
                  )}
                >
                  {totals[winner?.id || ""]}
                </p>
              </div>

              <div className="flex flex-col items-center text-center min-w-0">
                <p
                  className={cn(
                    "text-fg-subtle uppercase tracking-widest font-bold mb-2 text-center",
                    isCompactReceipt ? "text-[8px]" : "text-[10px]"
                  )}
                >
                  Sing Ngesret
                </p>

                <div className="flex items-center justify-center gap-2 min-w-0 w-full">
                  <Skull
                    className={cn(
                      "text-danger shrink-0",
                      isCompactReceipt ? "w-5 h-5" : "w-6 h-6"
                    )}
                  />
                  <h2
                    className={cn(
                      "font-black text-fg truncate",
                      isCompactReceipt ? "text-lg" : "text-xl"
                    )}
                  >
                    {loser?.name}
                  </h2>
                </div>

                <p
                  className={cn(
                    "text-danger font-mono mt-1 font-bold text-center",
                    isCompactReceipt ? "text-base" : "text-lg"
                  )}
                >
                  {totals[loser?.id || ""]}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}