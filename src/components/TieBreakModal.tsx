"use client";

import { useEffect, useRef, useState } from "react";
import { Dices, Skull, ArrowRight } from "lucide-react";
import { useGameStore, drawSpin, evaluateTieResults } from "@/store/useGameStore";
import { buildShortLabels } from "@/lib/playerName";
import { buildRoundAnnouncement } from "@/lib/announcement";
import { getTemplates } from "@/store/useSettingsStore";
import { speak } from "@/lib/speech";
import { cn } from "@/lib/utils";

const ROLL_DURATION_MS = 1600;
const ROLL_TICK_MS = 60;
/** Jeda suspense antara angka terakhir berhenti dan vonis muncul. */
const SUSPENSE_DELAY_MS = 1200;

interface Verdict {
    loserId: string;
    candidates: string[];
    results: Record<string, number>;
}

/**
 * Modal ini sengaja TIDAK bisa ditutup dengan klik luar.
 *
 * Selama `pendingTieBreak` masih ada, `currentLastPlacePlayerId` di store masih
 * memegang nilai lama. Kalau modal bisa di-dismiss, user akan melihat juru
 * kunci yang sudah tidak berlaku padahal rondenya sudah masuk.
 *
 * Setelah commit, `pendingTieBreak` jadi null tapi modal TETAP tampil lewat
 * state `verdict`. Tanpa itu modal lenyap seketika dan hasil spin tidak pernah
 * benar-benar terlihat — cuma kedengeran, dan itu hilang kalau TTS gagal.
 */
export default function TieBreakModal() {
    const players = useGameStore((s) => s.players);
    const pendingTieBreak = useGameStore((s) => s.pendingTieBreak);
    const spinTieBreak = useGameStore((s) => s.spinTieBreak);
    const commitTieBreak = useGameStore((s) => s.commitTieBreak);

    const [isLocked, setIsLocked] = useState(true);
    const [rollingId, setRollingId] = useState<string | null>(null);
    const [rollingValue, setRollingValue] = useState(0);
    const [respinNotice, setRespinNotice] = useState(false);
    const [verdict, setVerdict] = useState<Verdict | null>(null);

    const rollTimers = useRef<number[]>([]);
    const pendingRoundId = pendingTieBreak?.roundId;

    const clearRollTimers = () => {
        rollTimers.current.forEach((id) => window.clearTimeout(id));
        rollTimers.current = [];
    };

    // Pengumuman pembuka. Tombol spin terkunci sampai kalimatnya habis, kalau
    // tidak user langsung mencet dan TTS-nya terpotong cancel() sendiri.
    useEffect(() => {
        if (!pendingRoundId) return;

        setIsLocked(true);
        setVerdict(null);
        speak(getTemplates().tieIntro, { onEnd: () => setIsLocked(false) });
    }, [pendingRoundId]);

    useEffect(() => {
        return () => {
            rollTimers.current.forEach((id) => window.clearTimeout(id));
        };
    }, []);

    if (!pendingTieBreak && !verdict) return null;

    const shortLabels = buildShortLabels(players);

    // Saat vonis tampil, `pendingTieBreak` sudah null jadi datanya diambil
    // dari snapshot yang disimpan waktu commit.
    const candidates = pendingTieBreak?.candidates ?? verdict?.candidates ?? [];
    const results = pendingTieBreak?.results ?? verdict?.results ?? {};
    const isRolling = rollingId !== null;
    const loser = verdict ? players.find((p) => p.id === verdict.loserId) : null;

    const handleSpin = (playerId: string) => {
        if (isLocked || isRolling || verdict) return;

        // Angka di-commit ke store SEKARANG, sebelum animasi jalan. Kalau
        // di-generate setelah animasi, refresh di tengah putaran = reroll gratis.
        const committed = spinTieBreak(playerId);
        if (committed === null) return;

        clearRollTimers();
        setRespinNotice(false);
        setRollingId(playerId);

        const tickCount = Math.floor(ROLL_DURATION_MS / ROLL_TICK_MS);

        for (let i = 1; i <= tickCount; i++) {
            const timer = window.setTimeout(() => {
                setRollingValue(drawSpin());
            }, i * ROLL_TICK_MS);
            rollTimers.current.push(timer);
        }

        const settle = window.setTimeout(() => {
            setRollingValue(committed);
            setRollingId(null);

            const nextResults = { ...results, [playerId]: committed };
            const outcome = evaluateTieResults(candidates, nextResults);

            if (outcome.status === "waiting") return;

            const reveal = window.setTimeout(() => {
                const committedOutcome = commitTieBreak();

                if (committedOutcome.status === "respin") {
                    setRespinNotice(true);
                    return;
                }

                if (committedOutcome.status === "resolved") {
                    // Snapshot dulu, karena commit sudah mengosongkan pending.
                    setVerdict({
                        loserId: committedOutcome.loserId,
                        candidates,
                        results: nextResults,
                    });

                    const state = useGameStore.getState();
                    speak(
                        buildRoundAnnouncement(
                            state.players,
                            state.rounds,
                            state.shootRecords,
                            state.rounds.length - 1,
                            getTemplates()
                        )
                    );
                }
            }, SUSPENSE_DELAY_MS);

            rollTimers.current.push(reveal);
        }, ROLL_DURATION_MS);

        rollTimers.current.push(settle);
    };

    const remaining = candidates.filter((id) => results[id] === undefined);

    return (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/90 p-0 sm:p-4">
            <div className="bg-surface w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-line overflow-hidden max-h-[92dvh] flex flex-col">
                <div className="bg-bg p-6 text-center border-b border-line space-y-2">
                    <div className="flex items-center justify-center gap-2 text-fg">
                        <Dices className="w-6 h-6" />
                        <h2 className="text-xl font-black text-fg">Bijine Podo</h2>
                        <Dices className="w-6 h-6" />
                    </div>
                    <p className="text-sm text-fg-subtle">
                        {verdict
                            ? "Wes ketemu sopo sing apes."
                            : remaining.length > 0
                                ? "Sing paling cilik angkane, dheweke sing jengkeng."
                                : "Wes kabeh, delok sopo sing apes..."}
                    </p>
                </div>

                <div className="p-4 sm:p-6 space-y-3 overflow-y-auto">
                    {respinNotice && (
                        <div className="bg-fg/10 border border-line-strong text-fg rounded-2xl p-3 text-center text-sm font-medium">
                            Angkane podo maneh. Spin ulang sing podo wae.
                        </div>
                    )}

                    {candidates.map((playerId) => {
                        const player = players.find((p) => p.id === playerId);
                        const value = results[playerId];
                        const isThisRolling = rollingId === playerId;
                        const hasSpun = value !== undefined;
                        const isLoser = verdict?.loserId === playerId;

                        return (
                            <div
                                key={playerId}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-2xl border transition-colors",
                                    isLoser
                                        ? "bg-danger/10 border-danger/50"
                                        : verdict
                                            ? "bg-bg/50 border-line opacity-50"
                                            : hasSpun || isThisRolling
                                                ? "bg-bg border-line-strong"
                                                : "bg-bg/50 border-line"
                                )}
                            >
                                <div className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center bg-surface-3 text-fg">
                                    <span className="font-black text-sm text-fg">
                                        {shortLabels[playerId]}
                                    </span>
                                </div>

                                <span className="flex-1 min-w-0 truncate font-bold text-fg">
                                    {player?.name}
                                    {isLoser && " 💩"}
                                </span>

                                {isThisRolling ? (
                                    <span className="w-24 text-center font-mono text-3xl font-black text-fg tabular-nums">
                                        {rollingValue}
                                    </span>
                                ) : hasSpun ? (
                                    <span
                                        className={cn(
                                            "w-24 text-center font-mono text-3xl font-black tabular-nums",
                                            isLoser ? "text-danger" : "text-fg"
                                        )}
                                    >
                                        {value}
                                    </span>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleSpin(playerId)}
                                        disabled={isLocked || isRolling}
                                        className={cn(
                                            "w-24 py-2.5 rounded-xl font-black text-sm transition-all",
                                            isLocked || isRolling
                                                ? "bg-surface-2 text-fg-subtle cursor-not-allowed"
                                                : "active:scale-95 bg-accent text-on-accent hover:bg-accent-hover"
                                        )}
                                    >
                                        SPIN
                                    </button>
                                )}
                            </div>
                        );
                    })}

                    {verdict && loser && (
                        <div className="bg-danger/10 border border-danger/30 rounded-2xl p-4 text-center space-y-1">
                            <p className="text-[11px] font-bold text-danger/80 uppercase tracking-widest">
                                Sing Jengkeng
                            </p>
                            <p className="text-2xl font-black text-danger break-words">
                                {loser.name} 💩
                            </p>
                        </div>
                    )}
                </div>

                <div className="p-4 sm:p-6 border-t border-line bg-bg shrink-0">
                    {verdict ? (
                        /* Ditutup manual, bukan pakai timer. Kalau auto-close,
                           yang lagi noleh bentar kelewat dan nggak bisa balik. */
                        <button
                            type="button"
                            onClick={() => setVerdict(null)}
                            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold active:scale-[0.98] transition-all bg-accent text-on-accent hover:bg-accent-hover"
                        >
                            Wes, Lanjut
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <p className="text-xs text-fg-subtle flex items-center justify-center gap-1.5 text-center">
                            <Skull className="w-3.5 h-3.5 shrink-0" />
                            Bijine ora owah. Iki mung mutusi sopo sing jengkeng.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}