"use client";

import { useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { useHistoryStore } from "@/store/useHistoryStore";
import { suggestNames } from "@/lib/history";
import HistoryScreen from "./HistoryScreen";
import { Users, Play, AlertCircle, History } from "lucide-react";
import {
  MAX_NAME_LENGTH,
  finalizePlayerName,
  normalizePlayerNameInput,
  playerNameKey,
  shouldSpell,
  toShortLabel,
} from "@/lib/playerName";
import { primeVoices } from "@/lib/speech";
import { cn } from "@/lib/utils";

const SLOT_COUNT = 4;

export default function SetupScreen() {
  const startGame = useGameStore((state) => state.startGame);
  const existingPlayers = useGameStore((state) => state.players);
  const historyGames = useHistoryStore((state) => state.games);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Nama yang pernah main, buat autocomplete. Diurutkan dari yang paling sering.
  const knownNames = useMemo(() => suggestNames(historyGames), [historyGames]);

  const [names, setNames] = useState<string[]>(() => {
    const slots = Array.from({ length: SLOT_COUNT }, () => "");

    existingPlayers.forEach((p, index) => {
      if (index < SLOT_COUNT) slots[index] = p.name;
    });

    return slots;
  });

  // Daftar suara dimuat async. Dipanaskan dari sini supaya pengumuman ronde
  // pertama sudah pakai suara Indonesia, bukan suara default.
  useEffect(() => {
    primeVoices();
  }, []);

  // Saat mengetik: sanitasi saja. Proper case di sini akan mengubah huruf
  // di tengah ketikan dan bikin user berantem dengan kolomnya sendiri.
  const handleNameChange = (index: number, value: string) => {
    setNames((prev) => {
      const next = [...prev];
      next[index] = normalizePlayerNameInput(value);
      return next;
    });
  };

  // Perapian baru jalan setelah kolom ditinggal.
  const handleNameBlur = (index: number) => {
    setNames((prev) => {
      const next = [...prev];
      next[index] = finalizePlayerName(prev[index]);
      return next;
    });
  };

  const filledNames = useMemo(
    () => names.map(finalizePlayerName).filter((name) => name.length > 0),
    [names]
  );

  const duplicateKeys = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();

    filledNames.forEach((name) => {
      const key = playerNameKey(name);
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
    });

    return duplicates;
  }, [filledNames]);

  const errors = useMemo(() => {
    const list: string[] = [];

    if (filledNames.length < 2) list.push("Minimal 2 pemain.");
    if (duplicateKeys.size > 0) list.push("Ono jeneng sing podo, bedakno sik.");

    return list;
  }, [filledNames.length, duplicateKeys.size]);

  const isValid = errors.length === 0;

  const handleStart = () => {
    if (!isValid) return;

    startGame(
      filledNames.map((name, index) => ({
        id: `player-${index + 1}`,
        name,
      }))
    );
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-4 py-6 sm:px-6 md:px-8 bg-bg overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg space-y-6 sm:space-y-8">
        <div className="flex justify-end">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-1.5 px-4 min-h-11 rounded-full text-sm font-semibold text-fg-soft bg-surface border border-line hover:text-fg"
          >
            <History className="w-4 h-4 text-accent" />
            Riwayat
            {historyGames.length > 0 && (
              <span className="font-mono text-xs text-fg-subtle">{historyGames.length}</span>
            )}
          </button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-4xl font-black tracking-tighter text-accent">
            JENGKENG
          </h1>
          <p className="text-fg-muted text-sm">Digawe ngitung, ben gak mumet</p>
        </div>

        <div className="space-y-4 bg-surface/50 p-4 sm:p-6 rounded-2xl border border-line">
          <div className="flex items-center gap-2 text-fg-soft font-medium mb-4">
            <Users className="w-5 h-5 text-accent" />
            <span>Pemain</span>
          </div>

          {names.map((name, index) => {
            const finalized = finalizePlayerName(name);
            const isDuplicate =
              finalized.length > 0 && duplicateKeys.has(playerNameKey(finalized));
            const willBeSpelled = finalized.length > 0 && shouldSpell(finalized);

            const takenElsewhere = new Set(
              names
                .filter((_, otherIndex) => otherIndex !== index)
                .map((other) => playerNameKey(other))
            );
            const listId = `nama-riwayat-${index}`;
            const options = knownNames.filter((known) => !takenElsewhere.has(playerNameKey(known)));

            return (
              <div key={index} className="flex flex-col gap-1">
                <label className="text-xs text-fg-subtle ml-1">
                  Pemain {index + 1} {index >= 2 ? "(Opsional)" : "*"}
                </label>

                <div className="relative">
                  <input
                    type="text"
                    inputMode="text"
                    autoCapitalize="words"
                    autoComplete="off"
                    list={listId}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder="Jeneng (misal: Mas Bagong)"
                    value={name}
                    onChange={(e) => handleNameChange(index, e.target.value)}
                    onBlur={() => handleNameBlur(index)}
                    className={cn(
                      "w-full bg-bg border rounded-xl pl-4 pr-16 py-3 sm:py-3.5 text-base text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 transition-all",
                      isDuplicate
                        ? "border-danger/60 focus:ring-danger/50"
                        : "border-line focus:ring-accent/50 focus:border-accent"
                    )}
                  />

                  <datalist id={listId}>
                    {options.map((known) => (
                      <option key={known} value={known} />
                    ))}
                  </datalist>

                  {/* Preview label pendek yang nanti muncul di header tabel,
                      plus penanda kalau nama ini akan dieja per huruf. */}
                  {finalized.length > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
                      {willBeSpelled && (
                        <span className="text-[11px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded">
                          dieja
                        </span>
                      )}
                      <span className="text-[11px] font-mono font-bold text-fg-subtle bg-surface px-2 py-1 rounded-md">
                        {toShortLabel(finalized)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          <p className="text-xs text-fg-subtle leading-relaxed pt-1">
            Jeneng dowo oleh, nganggo spasi yo oleh. Sing ning kotak abu-abu kuwi
            inisial sing metu ning tabel. Huruf gedhene otomatis dirapèkke nek
            wis rampung ngetik. Nek jeneng cendhak lan huruf gedhe kabeh koyo{" "}
            <span className="font-mono text-fg-subtle">BGN</span>, kuwi dianggep
            inisial: ora diowahi lan bakal diejaa per huruf.
          </p>
        </div>

        {errors.length > 0 && filledNames.length > 0 && (
          <div className="bg-danger/10 border border-danger/20 text-danger p-3 rounded-2xl text-sm flex gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <ul className="space-y-0.5">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <button
          onClick={handleStart}
          disabled={!isValid}
          className={cn(
            "w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-bold text-lg transition-all",
            isValid
              ? "active:scale-[0.98] bg-accent text-on-accent hover:bg-accent-hover"
              : "bg-surface-2 text-fg-subtle cursor-not-allowed"
          )}
        >
          <Play className="w-5 h-5 fill-current" />
          Mulai Jengkeng
        </button>
      </div>

      {isHistoryOpen && <HistoryScreen onClose={() => setIsHistoryOpen(false)} />}
    </div>
  );
}