"use client";

import { useGameStore } from "@/store/useGameStore";
import { X, Coins, TrendingDown, Skull, Clock, Dices, Target } from "lucide-react";
import { useMemo } from "react";
import { useNow } from "@/hooks/useNow";
import { buildShortLabels } from "@/lib/playerName";

interface PlayerDetailModalProps {
  playerId: string;
  onClose: () => void;
}

export default function PlayerDetailModal({ playerId, onClose }: PlayerDetailModalProps) {
  const { players, rounds, shootRecords, gameStartTime } = useGameStore();
  const player = players.find((p) => p.id === playerId);

  const now = useNow(60000);
  const shortLabels = useMemo(() => buildShortLabels(players), [players]);

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

  /**
   * Semua angka di bawah dibaca dari keputusan yang sudah tersimpan per ronde,
   * bukan dihitung ulang. Versi lama me-replay skor dan menganggap SEMUA
   * pemain yang seri sebagai juru kunci, jadi saat seri angkanya dobel.
   *
   * Dua hal sengaja dipisah:
   * - `atBottom`  : berapa kali dia ada di dasar klasemen (fakta skor)
   * - `punished`  : berapa kali dia benar-benar kena hukuman (hasil spin)
   * Selisihnya = berapa kali dia selamat karena menang spin.
   */
  const jkStats = useMemo(() => {
    let punished = 0;
    let atBottom = 0;
    let escaped = 0;
    let timeMs = 0;

    rounds.forEach((round, index) => {
      if (round.tiedForLast.includes(playerId)) atBottom++;

      if (round.resolvedLastPlaceId !== playerId) {
        if (round.tieBreak && round.tieBreak.candidates.includes(playerId)) {
          escaped++;
        }
        return;
      }

      punished++;

      /**
       * Durasi hukuman = sejak ronde ini masuk sampai ronde berikutnya
       * (atau sampai sekarang kalau ini ronde terakhir).
       *
       * Versi lama memakai selisih ke ronde SEBELUMNYA, yang berarti waktu
       * sebelum keputusan dibuat ikut dihitung ke keputusan itu.
       */
      const startTs = Number.parseInt(round.roundId, 10);
      const endTs =
        index < rounds.length - 1
          ? Number.parseInt(rounds[index + 1].roundId, 10)
          : now;

      timeMs += Math.max(0, endTs - startTs);
    });

    return {
      punished,
      atBottom,
      escaped,
      minutes: Math.floor(timeMs / 60000),
    };
  }, [rounds, playerId, now]);

  // gameStartTime tidak dipakai dalam perhitungan lagi, tapi tetap dibaca
  // supaya modal ikut ter-render ulang kalau permainan di-restart.
  void gameStartTime;

  if (!player) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface w-full sm:max-w-lg md:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-line overflow-hidden max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >

        {/* Header */}
        <div className="bg-bg p-6 flex items-center justify-between border-b border-line gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center bg-surface-3 text-fg">
              {/* Inisial, bukan nama. Nama panjang jebol dari lingkaran 48px. */}
              <span className="font-black text-sm text-fg">
                {shortLabels[player.id]}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-fg truncate">{player.name}</h2>
              <p className="text-xs text-fg-subtle">Rapor Pemain</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="size-11 inline-flex items-center justify-center bg-surface-2/50 rounded-full text-fg-muted hover:text-fg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[70dvh] overflow-y-auto">

          <h3 className="text-xs font-bold text-fg-subtle uppercase tracking-widest mb-1">Riwayat Gepukan</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-bg p-4 rounded-2xl border border-line">
              <div className="flex items-center gap-2 text-fg mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">👊🏻 Gepuk</span>
              </div>
              <p className="text-2xl font-black text-fg">{stats.timesShooter}x</p>
            </div>

            <div className="bg-bg p-4 rounded-2xl border border-line">
              <div className="flex items-center gap-2 text-danger mb-2">
                <span className="text-xs font-bold uppercase tracking-wider">🤕 Digepuk</span>
              </div>
              <p className="text-2xl font-black text-fg">{stats.timesVictim}x</p>
            </div>

            <div className="bg-fg/10 p-4 rounded-2xl border border-line-strong">
              <div className="flex items-center gap-2 text-fg mb-2">
                <Coins className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Gepukan</span>
              </div>
              <p className="text-2xl font-black text-fg">+{stats.pointsGained}</p>
            </div>

            <div className="bg-danger/10 p-4 rounded-2xl border border-danger/20">
              <div className="flex items-center gap-2 text-danger mb-2">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Digepuk</span>
              </div>
              <p className="text-2xl font-black text-danger">-{stats.pointsLost}</p>
            </div>
          </div>

          <h3 className="text-xs font-bold text-fg-subtle uppercase tracking-widest mt-6 mb-1">Catetan Jengkeng</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-danger/5 p-4 rounded-2xl border border-danger/30">
              <div className="flex items-center gap-2 text-danger mb-2">
                <Skull className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Jengkeng</span>
              </div>
              <p className="text-2xl font-black text-danger">{jkStats.punished}x</p>
            </div>

            <div className="bg-danger/5 p-4 rounded-2xl border border-danger/30">
              <div className="flex items-center gap-2 text-danger mb-2">
                <Clock className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Suwine</span>
              </div>
              <p className="text-2xl font-black text-danger">
                {jkStats.minutes} <span className="text-base font-medium">Mnt</span>
              </p>
            </div>

            <div className="bg-bg p-4 rounded-2xl border border-line">
              <div className="flex items-center gap-2 text-fg-muted mb-2">
                <Target className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Ning Dasar</span>
              </div>
              <p className="text-2xl font-black text-fg">{jkStats.atBottom}x</p>
            </div>

            <div className="bg-fg/5 p-4 rounded-2xl border border-line-strong">
              <div className="flex items-center gap-2 text-fg mb-2">
                <Dices className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Lolos Spin</span>
              </div>
              <p className="text-2xl font-black text-fg">{jkStats.escaped}x</p>
            </div>
          </div>

          {jkStats.escaped > 0 && (
            <p className="text-xs text-fg-soft bg-fg/5 border border-line-strong rounded-xl px-3 py-2">
              Ning dasar {jkStats.atBottom}x, tapi mung {jkStats.punished}x jengkeng.
              Untunge ora umum 🎲.
            </p>
          )}

        </div>

      </div>
    </div>
  );
}