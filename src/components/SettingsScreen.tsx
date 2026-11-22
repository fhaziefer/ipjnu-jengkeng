"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Delete, Lock, Minus, Plus, RotateCcw, Settings, Volume2, X } from "lucide-react";
import { useSettingsStore } from "@/store/useSettingsStore";
import { ADMIN_PIN_LENGTH, isAdminPin } from "@/lib/adminPin";
import {
  TEMPLATE_DEFS,
  normalizeTemplate,
  renderTemplate,
  resolveTemplates,
  validateTemplate,
  type TemplateDef,
  type TemplateGroup,
} from "@/lib/speechTemplates";
import { cancelSpeech, primeVoices, speak } from "@/lib/speech";
import {
  LAST_PLACE_STREAK_ROUNDS,
  MAX_STREAK_ROUNDS,
  MIN_STREAK_ROUNDS,
  validateStreakThreshold,
} from "@/lib/lastPlaceAlert";
import { cn } from "@/lib/utils";

const GROUPS: Array<{ id: TemplateGroup; title: string; note: string }> = [
  { id: "umum", title: "Umum", note: "Dipakai di luar pengumuman skor." },
  { id: "ronde", title: "Pengumuman ronde", note: "Disambung jadi satu pengumuman setiap selesai ngitung." },
  { id: "gepuk", title: "Gepuk", note: "Kalimat gepuk dan psywar tiap besar hukuman." },
];

interface SettingsScreenProps {
  onClose: () => void;
}

export default function SettingsScreen({ onClose }: SettingsScreenProps) {
  const [unlocked, setUnlocked] = useState(false);

  // Suara yang masih berjalan jangan terbawa keluar dari layar ini.
  useEffect(() => {
    primeVoices();
    return () => cancelSpeech();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-bg overflow-y-auto">
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg mx-auto px-4 py-5 space-y-5">
        <header className="flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-black text-fg">
            <Settings className="w-5 h-5" />
            Pengaturan
          </h1>
          <button
            onClick={onClose}
            aria-label="Tutup pengaturan"
            className="size-11 inline-flex items-center justify-center rounded-full text-fg-muted hover:text-fg bg-surface border border-line"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {unlocked ? <Editor /> : <PinGate onUnlock={() => setUnlocked(true)} />}
      </div>
    </div>
  );
}

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState("");
  const [wrong, setWrong] = useState(false);

  const press = (digit: string) => {
    if (pin.length >= ADMIN_PIN_LENGTH) return;
    const next = pin + digit;
    setWrong(false);

    if (next.length < ADMIN_PIN_LENGTH) {
      setPin(next);
      return;
    }

    if (isAdminPin(next)) {
      onUnlock();
    } else {
      setPin("");
      setWrong(true);
    }
  };

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const keyClass =
    "h-14 rounded-xl border border-line-strong bg-surface-2 text-fg text-xl font-semibold font-mono active:scale-95 transition-transform hover:bg-surface-3";

  return (
    <section className="space-y-6 pt-4" aria-label="Masukkan PIN admin">
      <div className="text-center space-y-2">
        <Lock className="w-6 h-6 mx-auto text-fg-muted" />
        <p className="text-fg-soft text-sm">Masukkan PIN admin untuk mengubah kalimat suara.</p>
      </div>

      <div
        className="flex justify-center gap-3"
        role="img"
        aria-label={`${pin.length} dari ${ADMIN_PIN_LENGTH} digit terisi`}
      >
        {Array.from({ length: ADMIN_PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            className={cn(
              "size-3.5 rounded-full border",
              i < pin.length ? "bg-fg border-fg" : "border-line-control",
              wrong && "border-danger"
            )}
          />
        ))}
      </div>

      <p role="alert" className={cn("text-center text-sm text-danger min-h-5", !wrong && "invisible")}>
        PIN salah.
      </p>

      <div className="grid grid-cols-3 gap-3 max-w-[16rem] mx-auto">
        {keys.map((k) => (
          <button key={k} onClick={() => press(k)} className={keyClass}>
            {k}
          </button>
        ))}
        <span aria-hidden />
        <button onClick={() => press("0")} className={keyClass}>
          0
        </button>
        <button
          onClick={() => {
            setWrong(false);
            setPin((p) => p.slice(0, -1));
          }}
          aria-label="Hapus satu digit"
          className={cn(keyClass, "inline-flex items-center justify-center text-fg-muted")}
        >
          <Delete className="w-5 h-5" />
        </button>
      </div>
    </section>
  );
}

function Editor() {
  const overrides = useSettingsStore((s) => s.overrides);
  const resetAll = useSettingsStore((s) => s.resetAll);
  const streakThreshold = useSettingsStore((s) => s.streakThreshold);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const effective = useMemo(() => resolveTemplates(overrides), [overrides]);
  // Catatan: TemplateEditor diberi key yang ikut nilai tersimpan, jadi setelah
  // Simpan / Bawaan / "kembalikan semua" editornya dimulai ulang dari nilai terbaru.
  const changedCount =
    TEMPLATE_DEFS.filter((d) => effective[d.key] !== d.defaultText).length +
    (streakThreshold !== LAST_PLACE_STREAK_ROUNDS ? 1 : 0);

  return (
    <div className="space-y-6">
      <p className="text-sm text-fg-muted">
        Ubah kalimat yang diucapkan. Kosongkan kolom untuk membisukan bagian itu. Perubahan baru
        berlaku setelah ditekan <strong className="text-fg">Simpan</strong>.
      </p>

      <ThresholdCard key={`ambang:${streakThreshold}`} current={streakThreshold} />

      {GROUPS.map((group) => (
        <section key={group.id} className="space-y-3" aria-labelledby={`grup-${group.id}`}>
          <div>
            <h2 id={`grup-${group.id}`} className="text-base font-bold text-fg">
              {group.title}
            </h2>
            <p className="text-xs text-fg-subtle">{group.note}</p>
          </div>
          {TEMPLATE_DEFS.filter((d) => d.group === group.id).map((def) => (
            <TemplateEditor key={`${def.key}:${effective[def.key]}`} def={def} current={effective[def.key]} />
          ))}
        </section>
      ))}

      <section className="rounded-2xl border border-line bg-surface p-4 space-y-3">
        <p className="text-sm text-fg-soft">
          {changedCount === 0
            ? "Semua pengaturan masih bawaan."
            : `${changedCount} pengaturan sudah diubah dari bawaan.`}
        </p>
        {!confirmingReset ? (
          <button
            disabled={changedCount === 0}
            onClick={() => setConfirmingReset(true)}
            className="w-full min-h-11 rounded-xl border border-line-control text-fg-soft text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-surface-2"
          >
            Kembalikan semua ke bawaan
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmingReset(false)}
              className="flex-1 min-h-11 rounded-xl border border-line-control text-fg-soft text-sm font-semibold hover:bg-surface-2"
            >
              Batal
            </button>
            <button
              onClick={() => {
                resetAll();
                setConfirmingReset(false);
              }}
              className="flex-1 min-h-11 rounded-xl bg-danger-solid hover:bg-danger-solid-hover text-fg text-sm font-bold"
            >
              Ya, kembalikan
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function ThresholdCard({ current }: { current: number }) {
  const setStreakThreshold = useSettingsStore((s) => s.setStreakThreshold);
  const resetStreakThreshold = useSettingsStore((s) => s.resetStreakThreshold);

  const [draft, setDraft] = useState(String(current));

  const parsed = draft.trim() === "" ? Number.NaN : Number(draft);
  const check = validateStreakThreshold(parsed);
  const dirty = draft !== String(current);
  const isCustom = current !== LAST_PLACE_STREAK_ROUNDS;
  const value = check.ok ? check.value : current;

  const step = (delta: number) =>
    setDraft(String(Math.min(MAX_STREAK_ROUNDS, Math.max(MIN_STREAK_ROUNDS, value + delta))));

  const save = () => {
    if (!check.ok || !dirty) return;
    setStreakThreshold(check.value);
  };

  const iconButton =
    "size-11 inline-flex items-center justify-center rounded-xl border border-line-control text-fg-soft hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed";

  return (
    <section className="rounded-2xl border border-line bg-surface p-4 space-y-3" aria-labelledby="ambang-judul">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="ambang-judul" className="text-sm font-bold text-fg">
            Ambang juru kunci beruntun
          </h2>
          <p className="text-xs text-fg-subtle">
            Pengingat &quot;juru kunci beruntun&quot; bunyi saat orang yang sama jadi juru kunci sebanyak ini
            ronde berturut-turut atau lebih. Makin kecil angkanya, makin cepat bunyi. Bawaan{" "}
            {LAST_PLACE_STREAK_ROUNDS}. Tersimpan di HP ini.
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-fg-soft">
          {dirty ? "Belum disimpan" : isCustom ? "Diubah" : ""}
        </span>
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={value <= MIN_STREAK_ROUNDS}
          aria-label="Kurangi ambang"
          className={iconButton}
        >
          <Minus className="w-5 h-5" />
        </button>
        <label className="flex items-baseline gap-2">
          <span className="sr-only">Jumlah ronde beruntun</span>
          <input
            id="ambang-streak"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={draft}
            onChange={(e) => setDraft(e.target.value.replace(/\D/g, "").slice(0, 2))}
            aria-invalid={!check.ok}
            aria-describedby={check.ok ? undefined : "ambang-galat"}
            className={cn(
              "w-16 h-11 text-center rounded-xl bg-bg border text-xl font-mono font-semibold text-fg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent",
              check.ok ? "border-line-control" : "border-danger"
            )}
          />
          <span className="text-sm text-fg-soft">ronde</span>
        </label>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={value >= MAX_STREAK_ROUNDS}
          aria-label="Tambah ambang"
          className={iconButton}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <p id="ambang-galat" role="alert" className={cn("text-center text-xs text-danger", check.ok && "sr-only")}>
        {check.ok ? "" : check.error}
      </p>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            resetStreakThreshold();
            setDraft(String(LAST_PLACE_STREAK_ROUNDS));
          }}
          disabled={!isCustom && !dirty}
          className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border border-line-control text-sm font-semibold text-fg-soft hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          Bawaan
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!check.ok || !dirty}
          className="ml-auto min-h-11 px-5 rounded-xl bg-accent text-on-accent text-sm font-bold hover:bg-accent-hover disabled:bg-surface-2 disabled:text-fg-subtle disabled:cursor-not-allowed"
        >
          Simpan
        </button>
      </div>
    </section>
  );
}

function TemplateEditor({ def, current }: { def: TemplateDef; current: string }) {
  const setOverride = useSettingsStore((s) => s.setOverride);
  const resetOverride = useSettingsStore((s) => s.resetOverride);

  const [draft, setDraft] = useState(current);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const check = validateTemplate(def.key, draft);
  const normalized = normalizeTemplate(draft);
  const dirty = normalized !== current;
  const isCustom = current !== def.defaultText;
  const isMuted = check.ok && normalized === "";

  const insert = (name: string) => {
    const el = areaRef.current;
    const token = `{${name}}`;
    if (!el) {
      setDraft((d) => `${d}${token}`);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    setDraft(draft.slice(0, start) + token + draft.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const listen = () => {
    if (!check.ok || check.text === "") return;
    speak(renderTemplate(check.text, def.sample));
  };

  const save = () => {
    if (!check.ok || !dirty) return;
    setOverride(def.key, draft);
  };

  const reset = () => {
    resetOverride(def.key);
    setDraft(def.defaultText);
  };

  const descId = `bantuan-${def.key}`;
  const errId = `galat-${def.key}`;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <label htmlFor={`kalimat-${def.key}`} className="block text-sm font-bold text-fg">
            {def.label}
          </label>
          <p id={descId} className="text-xs text-fg-subtle">
            {def.help}
          </p>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-fg-soft">
          {dirty ? "Belum disimpan" : isMuted ? "Dibisukan" : isCustom ? "Diubah" : ""}
        </span>
      </div>

      <textarea
        id={`kalimat-${def.key}`}
        ref={areaRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        aria-describedby={check.ok ? descId : `${descId} ${errId}`}
        aria-invalid={!check.ok}
        placeholder="(kosong = dibisukan)"
        className={cn(
          "w-full rounded-xl bg-bg border px-3 py-2 text-base text-fg placeholder:text-fg-subtle resize-y focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent",
          check.ok ? "border-line-control" : "border-danger"
        )}
      />

      <div className="flex items-center justify-between gap-2 text-xs">
        <p id={errId} role="alert" className={cn("text-danger", check.ok && "sr-only")}>
          {check.ok ? "" : check.error}
        </p>
        <span className="ml-auto font-mono text-fg-subtle shrink-0">
          {normalized.length}/{def.maxLength}
        </span>
      </div>

      {def.placeholders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-fg-subtle">Sisipkan:</span>
          {def.placeholders.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => insert(name)}
              className="min-h-9 px-3 rounded-lg border border-line-control text-xs font-mono text-fg-soft hover:bg-surface-2"
            >
              {`{${name}}`}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={listen}
          disabled={!check.ok || normalized === ""}
          className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border border-line-control text-sm font-semibold text-fg-soft hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Volume2 className="w-4 h-4" />
          Dengarkan
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={!isCustom && !dirty}
          className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-xl border border-line-control text-sm font-semibold text-fg-soft hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <RotateCcw className="w-4 h-4" />
          Bawaan
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!check.ok || !dirty}
          className="ml-auto min-h-11 px-5 rounded-xl bg-accent text-on-accent text-sm font-bold hover:bg-accent-hover disabled:bg-surface-2 disabled:text-fg-subtle disabled:cursor-not-allowed"
        >
          Simpan
        </button>
      </div>
    </div>
  );
}
