import { cn } from "@/lib/utils";

/**
 * Cincin berputar khas Jengkeng untuk tembus +1000 (emas) / -1000 (merah).
 * Satu-satunya animasi dekoratif yang sengaja dipertahankan. Induknya harus
 * `relative overflow-hidden`; konten induk perlu `relative z-10`.
 */
export function SpinBorder({
  tone,
  tint,
}: {
  tone: "god" | "hell";
  /** Warna heatmap di dalam cincin (opsional), mis. "bg-accent/10". */
  tint?: string;
}) {
  return (
    <>
      <div
        aria-hidden
        className={cn(
          "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] h-[200%] animate-[spin_2s_linear_infinite] z-0",
          tone === "god"
            ? "bg-[conic-gradient(transparent_25%,var(--color-accent-hover)_50%,transparent_75%,var(--color-accent-hover)_100%)]"
            : "bg-[conic-gradient(transparent_25%,var(--color-danger)_50%,transparent_75%,var(--color-danger)_100%)]"
        )}
      />
      <div aria-hidden className="absolute inset-[2px] bg-bg z-0" />
      {tint && <div aria-hidden className={cn("absolute inset-[2px] z-0", tint)} />}
    </>
  );
}
