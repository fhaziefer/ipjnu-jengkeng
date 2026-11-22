import { cn } from "@/lib/utils";

export default function Stat({
  label,
  value,
  compact,
}: {
  label: string;
  value: string | number;
  compact?: boolean;
}) {
  return (
    <div className={cn("rounded-xl bg-bg border border-line/60", compact ? "p-2" : "p-3")}>
      <dt className="text-xs text-fg-subtle leading-tight">{label}</dt>
      <dd className={cn("font-mono font-semibold text-fg", compact ? "text-base" : "text-xl")}>{value}</dd>
    </div>
  );
}
