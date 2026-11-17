"use client";

import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ChevronDown, Download, History, Trash2, Upload, X } from "lucide-react";
import { useHistoryStore } from "@/store/useHistoryStore";
import {
  computeStats,
  formatDuration,
  parseHistoryFile,
  serializeHistory,
  type GameRecord,
} from "@/lib/history";
import { downloadTextFile, requestPersistentStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

type Tab = "game" | "statistik" | "cadangan";

const TABS: Array<{ id: Tab; label: string }> = [
  { id: "game", label: "Game" },
  { id: "statistik", label: "Statistik" },
  { id: "cadangan", label: "Cadangan" },
];

interface HistoryScreenProps {
  onClose: () => void;
}

const formatDate = (ts: number) => format(new Date(ts), "EEE, d MMM yyyy · HH.mm", { locale: localeId });

export default function HistoryScreen({ onClose }: HistoryScreenProps) {
  const games = useHistoryStore((s) => s.games);
  const deleteGame = useHistoryStore((s) => s.deleteGame);
  const importGames = useHistoryStore((s) => s.importGames);
  const clearHistory = useHistoryStore((s) => s.clearHistory);

  const [tab, setTab] = useState<Tab>("game");
  const [openId, setOpenId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  const fileInput = useRef<HTMLInputElement>(null);

  const newestFirst = useMemo(() => [...games].reverse(), [games]);
  const stats = useMemo(() => computeStats(games), [games]);

  const handleExport = () => {
    if (games.length === 0) return;
    downloadTextFile(
      `jengkeng-riwayat-${format(new Date(), "yyyy-MM-dd")}.json`,
      serializeHistory(games, Date.now())
    );
    setNotice({ kind: "ok", text: `${games.length} game diunduh.` });
  };

  const handleImportFile = async (file: File | undefined) => {
    if (!file) return;

    const result = parseHistoryFile(await file.text());

    if (!result.ok) {
      setNotice({ kind: "error", text: result.error });
      return;
    }

    const added = importGames(result.games);
    requestPersistentStorage();

    const parts = [`${added} game baru masuk`];
    const duplicate = result.games.length - added;
    if (duplicate > 0) parts.push(`${duplicate} sudah ada`);
    if (result.skipped > 0) parts.push(`${result.skipped} rusak dilewati`);

    setNotice({ kind: "ok", text: `${parts.join(", ")}.` });
  };

  return (
    <div className="fixed inset-0 z-50 bg-bg overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto px-4 py-5 space-y-5">
        <header className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-black text-fg">
            <History className="w-5 h-5 text-accent" />
            Riwayat
          </h1>
          <button
            onClick={onClose}
            aria-label="Tutup riwayat"
            className="size-11 inline-flex items-center justify-center rounded-full text-fg-muted hover:text-fg bg-surface border border-line"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface border border-line" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "min-h-11 rounded-lg text-sm font-semibold transition-colors",
                tab === t.id ? "bg-surface-2 text-fg" : "text-fg-subtle hover:text-fg-soft"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {notice && (
          <p
            role="status"
            className={cn(
              "text-sm rounded-xl px-3 py-2 border",
              notice.kind === "ok"
                ? "text-success bg-success/10 border-success/20"
                : "text-danger bg-danger/10 border-danger/20"
            )}
          >
            {notice.text}
          </p>
        )}

        {tab === "game" && (
          <section className="space-y-3">
            {newestFirst.length === 0 && (
              <p className="text-center text-sm text-fg-subtle py-12">
                Durung enek riwayat. Rampungno siji game (SRET), mengko metu nang kene.
              </p>
            )}

            {newestFirst.map((game) => (
              <GameCard
                key={game.id}
                game={game}
                isOpen={openId === game.id}
                onToggle={() => {
                  setOpenId(openId === game.id ? null : game.id);
                  setConfirmDeleteId(null);
                }}
                isConfirmingDelete={confirmDeleteId === game.id}
                onAskDelete={() => setConfirmDeleteId(game.id)}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onDelete={() => {
                  deleteGame(game.id);
                  setConfirmDeleteId(null);
                  setOpenId(null);
                }}
              />
            ))}
          </section>
        )}

        {tab === "statistik" && (
          <section className="space-y-4">
            {stats.overall.games === 0 ? (
              <p className="text-center text-sm text-fg-subtle py-12">
                Statistik muncul setelah ada game yang selesai.
              </p>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-2">
                  <Stat label="Game" value={stats.overall.games} />
                  <Stat label="Total ronde" value={stats.overall.rounds} />
                  <Stat label="Rata-rata durasi" value={formatDuration(stats.overall.avgDurationMs)} />
                  <Stat label="Game terlama" value={formatDuration(stats.overall.longestDurationMs)} />
                </dl>

                {stats.players.map((p) => (
                  <article key={p.key} className="rounded-2xl bg-surface/50 border border-line p-4 space-y-3">
                    <h2 className="font-bold text-fg text-lg">{p.name}</h2>
                    <dl className="grid grid-cols-3 gap-2 text-center">
                      <Stat label="Main" value={p.games} compact />
                      <Stat label="Menang 👑" value={p.wins} compact />
                      <Stat label="Jengkeng 💩" value={p.losses} compact />
                      <Stat label="Jengkeng beruntun" value={`${p.loserStreakNow} / ${p.loserStreakBest}`} compact />
                      <Stat label="Nyewu" value={p.nyewu} compact />
                      <Stat label="Gepuk" value={`${p.shotsGiven} / ${p.shotsTaken}`} compact />
                      <Stat label="Skor terbaik" value={p.bestTotal} compact />
                      <Stat label="Skor terburuk" value={p.worstTotal} compact />
                    </dl>
                    <p className="text-xs text-fg-subtle">
                      Jengkeng beruntun: sekarang / rekor. Gepuk: nggepuk / digepuk.
                    </p>
                  </article>
                ))}
              </>
            )}
          </section>
        )}

        {tab === "cadangan" && (
          <section className="space-y-4">
            <div className="rounded-2xl bg-surface/50 border border-line p-4 space-y-3">
              <p className="text-sm text-fg-soft">
                Riwayat disimpan di HP ini saja, di browser yang dipakai main. Ganti HP, hapus data browser,
                atau pindah alamat web, riwayatnya ikut hilang. Unduh cadangan sesekali.
              </p>
              <p className="text-xs text-fg-subtle">
                Di iPhone, buka lewat ikon di layar utama (Tambah ke Layar Utama). Di Safari biasa, data bisa
                dihapus kalau situs ini tidak dibuka seminggu.
              </p>
            </div>

            <button
              onClick={handleExport}
              disabled={games.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold bg-accent text-on-accent disabled:bg-surface-2 disabled:text-fg-subtle disabled:cursor-not-allowed"
            >
              <Download className="w-5 h-5" />
              Unduh cadangan ({games.length} game)
            </button>

            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                await handleImportFile(file);
              }}
            />
            <button
              onClick={() => fileInput.current?.click()}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-bold bg-surface-2 text-fg hover:bg-surface-3"
            >
              <Upload className="w-5 h-5" />
              Pulihkan dari berkas
            </button>

            {games.length > 0 &&
              (confirmClear ? (
                <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 space-y-3">
                  <p className="text-sm text-danger">
                    Hapus semua {games.length} game? Ini tidak bisa dibatalkan.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmClear(false)}
                      className="flex-1 py-2 rounded-xl bg-surface-2 text-fg-soft font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      onClick={() => {
                        clearHistory();
                        setConfirmClear(false);
                        setNotice({ kind: "ok", text: "Riwayat dikosongkan." });
                      }}
                      className="flex-1 py-2 rounded-xl bg-danger-solid text-fg font-semibold"
                    >
                      Hapus semua
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="w-full py-3 rounded-2xl font-semibold text-danger border border-danger/20 hover:bg-danger/10"
                >
                  Hapus semua riwayat
                </button>
              ))}
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, compact }: { label: string; value: string | number; compact?: boolean }) {
  return (
    <div className={cn("rounded-xl bg-bg border border-line/60", compact ? "p-2" : "p-3")}>
      <dt className="text-xs text-fg-subtle leading-tight">{label}</dt>
      <dd className={cn("font-mono font-semibold text-fg", compact ? "text-base" : "text-xl")}>{value}</dd>
    </div>
  );
}

interface GameCardProps {
  game: GameRecord;
  isOpen: boolean;
  onToggle: () => void;
  isConfirmingDelete: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
}

function GameCard({
  game,
  isOpen,
  onToggle,
  isConfirmingDelete,
  onAskDelete,
  onCancelDelete,
  onDelete,
}: GameCardProps) {
  const winner = game.players.find((p) => p.key === game.winnerKey);
  const loser = game.players.find((p) => p.key === game.loserKey);
  const ranked = [...game.players].sort((a, b) => b.total - a.total);

  return (
    <article className="rounded-2xl bg-surface/50 border border-line overflow-hidden">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="w-full text-left p-4 space-y-2 hover:bg-surface"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-fg-subtle">{formatDate(game.finishedAt)}</span>
          <ChevronDown className={cn("w-4 h-4 text-fg-subtle transition-transform", isOpen && "rotate-180")} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-fg truncate">
            {winner?.name} <span aria-label="menang">👑</span>
          </span>
          <span className="font-mono text-accent shrink-0">{winner?.total}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="font-bold text-danger truncate">
            {loser?.name} <span aria-label="jengkeng">💩</span>
          </span>
          <span className="font-mono text-danger shrink-0">{loser?.total}</span>
        </div>

        <p className="text-xs text-fg-subtle">
          {game.rounds.length} ronde · {formatDuration(game.finishedAt - game.startedAt)}
          {game.tieBreaks > 0 && ` · ${game.tieBreaks}x spin`}
        </p>
      </button>

      {isOpen && (
        <div className="border-t border-line p-4 space-y-4">
          <ol className="space-y-1.5">
            {ranked.map((p, i) => (
              <li key={p.key} className="flex items-center justify-between text-sm">
                <span className="text-fg-soft">
                  <span className="text-fg-subtle font-mono mr-2">#{i + 1}</span>
                  {p.name}
                </span>
                <span className="font-mono text-fg">{p.total}</span>
              </li>
            ))}
          </ol>

          {game.shoots.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold text-fg-subtle">Gepuk</p>
              <ul className="space-y-1 text-sm text-fg-muted">
                {game.shoots.map((s, i) => (
                  <li key={i}>
                    {game.players[s.shooter].name} gepuk {game.players[s.victim].name} {s.points}{" "}
                    <span className="text-fg-subtle">(ronde {s.round + 1})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {isConfirmingDelete ? (
            <div className="flex gap-2">
              <button onClick={onCancelDelete} className="flex-1 py-2 rounded-xl bg-surface-2 text-fg-soft text-sm font-semibold">
                Batal
              </button>
              <button onClick={onDelete} className="flex-1 py-2 rounded-xl bg-danger-solid text-fg text-sm font-semibold">
                Hapus game ini
              </button>
            </div>
          ) : (
            <button
              onClick={onAskDelete}
              className="flex items-center gap-1.5 text-xs text-fg-subtle hover:text-danger"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Hapus game ini
            </button>
          )}
        </div>
      )}
    </article>
  );
}
