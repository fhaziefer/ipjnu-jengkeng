"use client";

import { useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { toPng } from "html-to-image";
import { CalendarDays, Loader2, Share2 } from "lucide-react";
import { availableMonths, buildMonthlyRecap, monthLabel } from "@/lib/rekap";
import type { GameRecord } from "@/lib/history";
import { cn } from "@/lib/utils";

type NavigatorWithFileShare = Navigator & {
  canShare?: (data: { files: File[] }) => boolean;
};

async function shareOrDownload(dataUrl: string, fileName: string): Promise<"share" | "download"> {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], fileName, { type: "image/png" });
  const nav = navigator as NavigatorWithFileShare;
  const data = { files: [file] };
  if (nav.share && nav.canShare?.(data)) {
    await nav.share(data);
    return "share";
  }
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
  return "download";
}

/**
 * Rekap satu bulan sebagai gambar PNG yang bisa dibagikan.
 * Pratinjau di layar adalah persis node yang difoto.
 */
export default function RekapBulanan({ games }: { games: ReadonlyArray<GameRecord> }) {
  const months = useMemo(() => availableMonths(games), [games]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const selected = picked && months.includes(picked) ? picked : months[0];
  const recap = useMemo(() => (selected ? buildMonthlyRecap(games, selected) : null), [games, selected]);

  if (months.length === 0 || !recap) return null;

  const day = (ts: number | null) => (ts === null ? "-" : format(new Date(ts), "d MMM", { locale: localeId }));

  const handleShare = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const node = cardRef.current;
      const width = node.offsetWidth;
      const height = node.offsetHeight;
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        backgroundColor: "#121417",
        cacheBust: true,
        width,
        height,
        style: { width: `${width}px`, height: `${height}px`, transform: "none" },
      });
      const how = await shareOrDownload(dataUrl, `jengkeng-rekap-${recap.monthKey}.png`);
      setStatus(how === "share" ? "Gambar siap dibagikan." : "Gambar diunduh.");
    } catch (error) {
      // Membatalkan lembar bagikan juga melempar AbortError: bukan kegagalan.
      if (error instanceof DOMException && error.name === "AbortError") return;
      console.error("[jengkeng] gagal membuat gambar rekap", error);
      setStatus("Gagal membuat gambar. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 space-y-3" aria-labelledby="rekap-judul">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="rekap-judul" className="text-sm font-bold text-fg flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 shrink-0" />
            Rekap bulanan
          </h2>
          <p className="text-xs text-fg-subtle">Ringkasan satu bulan jadi gambar untuk dibagikan.</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="rekap-isi"
          className="shrink-0 min-h-11 px-4 rounded-xl border border-line-control text-sm font-semibold text-fg-soft hover:bg-surface-2"
        >
          {open ? "Tutup" : "Buka"}
        </button>
      </div>

      {open && (
        <div id="rekap-isi" className="space-y-3">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Bulan</span>
            <select
              value={selected}
              onChange={(e) => setPicked(e.target.value)}
              className="w-full min-h-11 rounded-xl bg-bg border border-line-control px-3 text-sm text-fg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent"
            >
              {months.map((m) => (
                <option key={m} value={m}>
                  {monthLabel(m)}
                </option>
              ))}
            </select>
          </label>

          {/* Node yang difoto. Warna dan ukuran tetap di dalam kartu supaya hasil PNG sama dengan pratinjau. */}
          <div ref={cardRef} data-testid="rekap-kartu" className="rounded-2xl bg-bg border border-line p-4 space-y-4">
            <div className="text-center space-y-0.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-fg-subtle">Rekap Jengkeng</p>
              <p className="text-2xl font-black text-fg">{recap.label}</p>
              <p className="text-xs text-fg-subtle">
                {day(recap.firstAt)} sampai {day(recap.lastAt)}
              </p>
            </div>

            <dl className="grid grid-cols-4 gap-2 text-center">
              {[
                ["Game", recap.games],
                ["Ronde", recap.rounds],
                ["Pemain", recap.players],
                ["Gepuk", recap.shoots],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface border border-line/60 py-2">
                  <dt className="text-[11px] text-fg-subtle">{label}</dt>
                  <dd className="font-mono font-semibold text-fg text-lg">{value}</dd>
                </div>
              ))}
            </dl>

            {recap.leaders.length > 0 && (
              <ul className="space-y-1.5">
                {recap.leaders.map((l) => (
                  <li key={l.label} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-fg-subtle shrink-0">{l.label}</span>
                    <span className="font-bold text-fg text-right break-words min-w-0">
                      {l.names.join(", ")} <span className="font-mono font-normal text-fg-soft">({l.value})</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-fg-subtle">
                  <th className="text-left font-semibold pb-1">Klasemen</th>
                  <th className="text-right font-semibold pb-1">Main</th>
                  <th className="text-right font-semibold pb-1">Menang</th>
                  <th className="text-right font-semibold pb-1">Jengkeng</th>
                </tr>
              </thead>
              <tbody className="font-mono tabular-nums">
                {recap.standings.map((s, i) => (
                  <tr key={s.key} className="border-t border-line/60">
                    <td className="py-1.5 font-sans font-semibold text-fg truncate max-w-[9rem]">
                      <span className="text-fg-subtle font-mono mr-1.5">{i + 1}</span>
                      {s.name}
                    </td>
                    <td className="py-1.5 text-right text-fg-soft">{s.games}</td>
                    <td className="py-1.5 text-right text-fg">{s.wins}</td>
                    <td className={cn("py-1.5 text-right", s.losses > 0 ? "text-danger" : "text-fg-soft")}>{s.losses}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="text-center text-[11px] text-fg-subtle">IPJNU Jengkeng</p>
          </div>

          <button
            type="button"
            onClick={handleShare}
            disabled={busy}
            className="w-full min-h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-accent text-on-accent text-sm font-bold hover:bg-accent-hover disabled:bg-surface-2 disabled:text-fg-subtle"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            {busy ? "Lagi njepret..." : "Bagikan gambar"}
          </button>
          <p aria-live="polite" data-testid="rekap-status" className="text-xs text-center text-fg-subtle min-h-4">
            {status}
          </p>
        </div>
      )}
    </section>
  );
}
