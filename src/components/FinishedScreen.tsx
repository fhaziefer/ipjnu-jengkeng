"use client";

import { useGameStore } from "@/store/useGameStore";
import { RefreshCcw, Trophy, Skull, ImageIcon, Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { toPng } from "html-to-image";

export default function FinishedScreen() {
  // Tambahin startGame buat fitur "Panggah"
  const { players, rounds, resetGame, startGame } = useGameStore();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  // State buat buka/tutup modal Rematch
  const [isRematchModalOpen, setIsRematchModalOpen] = useState(false);

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

  const sortedPlayers = useMemo(() => {
    return [...players].sort((a, b) => totals[b.id] - totals[a.id]);
  }, [players, totals]);

  const winner = sortedPlayers[0];
  const loser = sortedPlayers[sortedPlayers.length - 1];

  const cumulativeRounds = useMemo(() => {
    const runningTotals: Record<string, number> = {};
    players.forEach((p) => (runningTotals[p.id] = 0));

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

  const handleExportPNG = async () => {
    if (!receiptRef.current) return;

    try {
      setIsExporting(true);
      await new Promise((resolve) => setTimeout(resolve, 150));

      const dataUrl = await toPng(receiptRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#09090b",
      });

      const link = document.createElement("a");
      link.download = `Jengkeng-${new Date().getTime()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("Gagal export gambar", error);
      alert("Gagal bikin gambar. Coba lagi!");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center p-6 bg-zinc-950 relative overflow-hidden">

      {/* ===================================================== */}
      {/* 1. TAMPILAN LAYAR HP (UI UTAMA) */}
      {/* ===================================================== */}
      <div className="w-full max-w-sm space-y-8 animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-linear-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/20 mb-4">
            <Trophy className="w-12 h-12 text-zinc-950" />
          </div>
          <h1 className="text-4xl font-black text-white">Sreeet</h1>
          <div className="space-y-1">
            <p className="text-zinc-400 text-sm">Pengarit Handal 👑</p>
            <p className="text-amber-500 font-bold text-2xl uppercase">
              {winner?.initials}
            </p>
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider text-center">
            Bijine Cah-Cah
          </h2>
          <div className="space-y-3">
            {sortedPlayers.map((player, index) => {
              let scoreColor = "text-white";
              if (index === 0) {
                scoreColor = "text-amber-500";
              } else if (index === sortedPlayers.length - 1) {
                scoreColor = "text-rose-500";
              }

              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between bg-zinc-950 p-4 rounded-xl border border-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500 font-mono text-sm">
                      #{index + 1}
                    </span>
                    <span className="font-bold text-white text-lg flex items-center gap-2">
                      {player.initials}
                      {index === 0 && <span className="text-base">👑</span>}
                      {index === sortedPlayers.length - 1 && <span className="text-base">💩</span>}
                    </span>
                  </div>
                  <span className={`font-mono text-xl font-semibold ${scoreColor}`}>
                    {totals[player.id]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-rose-500/10 border border-rose-500/20 rounded-3xl p-6 text-center space-y-2">
          <Skull className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <div className="space-y-1">
            <p className="text-rose-400 font-medium">Sing Ngesret</p>
            <p className="text-rose-300 text-xl font-bold uppercase">{loser?.initials} 💩</p>
          </div>
          <p className="text-sm text-rose-500/80 mt-2">{loser?.initials} remeh {loser?.initials} remeeeeh... 💩💩💩 </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={handleExportPNG}
            disabled={isExporting}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg border border-zinc-700 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
          >
            {isExporting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImageIcon className="w-5 h-5" />
            )}
            {isExporting ? "Lagi Njepret..." : "Simpen Hasile"}
          </button>

          <button
            onClick={() => setIsRematchModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg bg-zinc-800 text-white hover:bg-zinc-700 transition-all active:scale-[0.98]"
          >
            <RefreshCcw className="w-5 h-5" />
            Main Maneh
          </button>
        </div>
      </div>

      {/* ===================================================== */}
      {/* MODAL REMATCH (PANGGAH / GANTI / BUBAR) */}
      {/* ===================================================== */}
      {isRematchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-900 w-full max-w-sm rounded-3xl border border-zinc-800 shadow-2xl overflow-hidden p-6 text-center space-y-6">
            <div className="flex justify-center text-amber-500">
              <RefreshCcw className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Sing main panggah?</h2>
              <p className="text-sm text-zinc-500">Pilih panggah lek wonge tetep, ganti lek enek sing arep diganti.</p>
            </div>

            <div className="flex flex-col gap-3">
              {/* Tombol Panggah (Langsung reset skor tapi pemain tetap) */}
              <button
                onClick={() => {
                  startGame(players); // Pakai array pemain yang sama buat mulai game baru
                  setIsRematchModalOpen(false);
                }}
                className="w-full py-3 rounded-xl font-bold text-zinc-950 bg-amber-500 hover:bg-amber-400 transition-colors"
              >
                Panggah
              </button>

              <div className="flex gap-3">
                {/* Tombol Ganti (Balik ke Setup tapi bawa data pemain lama) */}
                <button
                  onClick={() => {
                    useGameStore.setState({ gameStatus: 'idle', rounds: [], shootRecords: [] });
                    setIsRematchModalOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-zinc-300 bg-zinc-800 hover:bg-zinc-700 transition-colors"
                >
                  Ganti
                </button>
                {/* Tombol Bubar (Reset total / Kosong melompong) */}
                <button
                  onClick={() => {
                    resetGame();
                    setIsRematchModalOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors"
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
      <div className="absolute left-[-9999px] top-[-9999px]">
        <div
          ref={receiptRef}
          className="w-[450px] bg-zinc-950 p-8 flex flex-col relative overflow-hidden"
        >
          <div className="absolute top-[-100px] right-[-100px] w-[300px] h-[300px] bg-amber-500/20 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute bottom-[-100px] left-[-100px] w-[300px] h-[300px] bg-rose-500/20 rounded-full blur-[80px] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center w-full">
            <div className="flex flex-col items-center mb-6">
              <img src="/icon.svg" width={70} height={70} className="mb-3 object-contain" alt="Logo" />
              <h1 className="text-2xl font-black tracking-widest text-transparent bg-clip-text bg-linear-to-r from-amber-400 to-rose-500">
                IPJNU JENGKENG
              </h1>
              <p className="text-zinc-500 text-xs mt-1">{rounds.length} Mainan</p>
            </div>

            <div className="w-full bg-zinc-900/60 rounded-2xl border border-zinc-800 p-4 mb-6">
              <table className="w-full text-white text-xs">
                <thead>
                  <tr className="border-b border-zinc-700">
                    {players.map((p) => (
                      <th key={p.id} className="py-2 text-center uppercase tracking-wider">{p.initials}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cumulativeRounds.map((r, i) => {
                    const isLastRow = i === cumulativeRounds.length - 1;

                    return (
                      <tr key={r.roundNumber} className={!isLastRow ? "border-b border-zinc-800/50" : ""}>
                        {players.map((p) => {
                          const score = r.scores[p.id];
                          let colorClass = "text-zinc-300";

                          if (isLastRow) {
                            if (score === totals[winner?.id || ""]) {
                              colorClass = "text-amber-500 font-bold text-sm";
                            } else if (score === totals[loser?.id || ""]) {
                              colorClass = "text-rose-500 font-bold text-sm";
                            } else {
                              colorClass = "text-zinc-100 font-bold text-sm";
                            }
                          }

                          return (
                            <td key={p.id} className={`py-2 text-center font-mono font-medium ${colorClass}`}>
                              {score}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="w-full border-t border-dashed border-zinc-700 pt-6 grid grid-cols-2 gap-4">
              <div className="flex flex-col items-center">
                <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-2">Pengarit Handal</p>
                <div className="flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  <h2 className="text-2xl font-black text-white">{winner?.initials}</h2>
                </div>
                <p className="text-amber-500 font-mono text-lg mt-1 font-bold">{totals[winner?.id || ""]}</p>
              </div>

              <div className="flex flex-col items-center">
                <p className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold mb-2">Sing Ngesret</p>
                <div className="flex items-center gap-2">
                  <Skull className="w-6 h-6 text-rose-500" />
                  <h2 className="text-2xl font-black text-white">{loser?.initials}</h2>
                </div>
                <p className="text-rose-500 font-mono text-lg mt-1 font-bold">{totals[loser?.id || ""]}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}