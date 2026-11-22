"use client";

import { useState } from "react";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { CloudDownload, CloudUpload } from "lucide-react";
import { restoreFromServer, runBackupNow } from "@/lib/backup/runner";
import { useHistoryStore } from "@/store/useHistoryStore";
import { useSyncStore } from "@/store/useSyncStore";

/**
 * Kartu "Cadangan online" di tab Cadangan. Pengiriman otomatis jalan diam-diam
 * di `BackupSync`; kartu ini cuma menunjukkan statusnya dan memberi dua tombol
 * manual. Hasil tombol manual boleh ditampilkan (user yang menekan), hasil
 * otomatis tidak pernah.
 */

interface BackupCardProps {
  onNotice: (notice: { kind: "ok" | "error"; text: string }) => void;
}

export default function BackupCard({ onNotice }: BackupCardProps) {
  const games = useHistoryStore((s) => s.games);
  const doneIds = useSyncStore((s) => s.doneIds);
  const lastSyncAt = useSyncStore((s) => s.lastSyncAt);
  const lastResult = useSyncStore((s) => s.lastResult);

  const [busy, setBusy] = useState<"send" | "restore" | null>(null);

  const done = new Set(doneIds);
  const pending = games.filter((g) => !done.has(g.id)).length;

  let status: string;
  if (games.length === 0) {
    status = "Belum ada game untuk dicadangkan.";
  } else if (pending === 0) {
    status = `Semua ${games.length} game sudah tercadang di server.`;
  } else if (lastResult === "failed") {
    status = `${pending} game belum terkirim. Server belum bisa dihubungi, dicoba lagi otomatis nanti.`;
  } else {
    status = `${pending} game menunggu dikirim. Terkirim otomatis saat ada sinyal.`;
  }

  const handleSend = async () => {
    setBusy("send");
    const result = await runBackupNow({ force: true });
    setBusy(null);

    if (result === "failed") {
      onNotice({ kind: "error", text: "Server cadangan belum bisa dihubungi. Coba lagi sebentar." });
    } else if (result === "nothing") {
      onNotice({ kind: "ok", text: "Semuanya sudah tercadang." });
    } else {
      onNotice({ kind: "ok", text: "Cadangan terkirim." });
    }
  };

  const handleRestore = async () => {
    setBusy("restore");
    const result = await restoreFromServer();
    setBusy(null);

    if (!result.ok) {
      onNotice({ kind: "error", text: "Server cadangan belum bisa dihubungi. Riwayat di HP ini tidak berubah." });
      return;
    }

    const parts = [`${result.added} game dipulihkan dari ${result.total} di server`];
    if (result.settingsRestored > 0) parts.push(`${result.settingsRestored} kalimat suara`);
    onNotice({ kind: "ok", text: `${parts.join(", ")}.` });
  };

  return (
    <div className="rounded-2xl bg-surface/50 border border-line p-4 space-y-3">
      <div className="space-y-1">
        <h2 className="text-sm font-bold text-fg">Cadangan online</h2>
        <p className="text-sm text-fg-soft" data-testid="backup-status">
          {status}
        </p>
        {lastSyncAt !== null && (
          <p className="text-xs text-fg-subtle">
            Terakhir tersambung: {format(new Date(lastSyncAt), "d MMM yyyy · HH.mm", { locale: localeId })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={handleSend}
          disabled={busy !== null}
          className="min-h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-surface-2 text-fg hover:bg-surface-3 disabled:text-fg-subtle disabled:cursor-not-allowed"
        >
          <CloudUpload className="w-4 h-4" />
          {busy === "send" ? "Mengirim…" : "Kirim sekarang"}
        </button>
        <button
          onClick={handleRestore}
          disabled={busy !== null}
          aria-label="Pulihkan dari server"
          className="min-h-11 flex items-center justify-center gap-2 rounded-xl text-sm font-semibold bg-surface-2 text-fg hover:bg-surface-3 disabled:text-fg-subtle disabled:cursor-not-allowed"
        >
          <CloudDownload className="w-4 h-4" />
          {busy === "restore" ? "Memulihkan…" : "Pulihkan"}
        </button>
      </div>

      <p className="text-xs text-fg-subtle">
        Nama pemain dan skor dikirim ke server cadangan (Neon). Game yang dihapus dari HP ini tetap ada di
        server dan kembali kalau Pulihkan dipilih. Pulihkan hanya menambah, tidak menimpa.
      </p>
    </div>
  );
}
