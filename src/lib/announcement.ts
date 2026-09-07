import type { Player, Round, ShootRecord } from "@/store/useGameStore";
import { toSpeechName } from "./playerName";

/**
 * Semua teks pengumuman dibangun di sini, bukan di dalam komponen.
 *
 * Alasannya: pengumuman skor sekarang bisa dipicu dari dua tempat berbeda
 * (langsung setelah submit kalau tidak seri, atau setelah spin selesai kalau
 * seri). Kalau logikanya nempel di AddRoundModal, versi kedua pasti beda.
 */

const PENALTY_PSYWAR: Record<number, string> = {
    100: "gawe godongan, ... remeh, remeh, remeh, ... sitik tok ...",
    200: "gawe londo, lumayan keroso ... ha ha ha ...",
    300: "gawe As, rodok ngelu, ... ha ha ha ...",
    500: "gawe joker, ... biyuh biyuh biyuh ...",
    1000:
        "langsung gawe joker loro, ... wes wes wes, sret wae, ... lek gak isin tapi, ha ha ha ...",
};

/** Diucapkan begitu ketahuan skor terendahnya seri, sebelum spinner muncul. */
export const TIE_INTRO_TEXT = "Wah, bijine podo. ... Nyepin sek bolo ...";

function nameOf(players: Player[], playerId: string | null): string {
    if (!playerId) return "";
    return toSpeechName(players.find((p) => p.id === playerId)?.name ?? "");
}

function scoreWord(score: number): string {
    return score < 0 ? `minus ${Math.abs(score)}` : score.toString();
}

function accumulate(players: Player[], rounds: Round[]): Record<string, number> {
    const totals: Record<string, number> = {};
    players.forEach((p) => (totals[p.id] = 0));

    rounds.forEach((r) => {
        r.scores.forEach((s) => {
            if (totals[s.playerId] !== undefined) totals[s.playerId] += s.finalScore;
        });
    });

    return totals;
}

/**
 * Pengumuman lengkap untuk satu ronde.
 *
 * Kalau ronde itu punya `tieBreak`, hasil spin ikut dibacakan dan baris
 * "sing jengkeng ganti" tidak diulang lagi supaya tidak dobel.
 */
export function buildRoundAnnouncement(
    players: Player[],
    rounds: Round[],
    shootRecords: ShootRecord[],
    roundIndex: number
): string {
    const round = rounds[roundIndex];
    if (!round) return "";

    const totalsBefore = accumulate(players, rounds.slice(0, roundIndex));
    const totalsAfter = accumulate(players, rounds.slice(0, roundIndex + 1));

    let text = "Biji sak iki. ";
    const nyewuNames: string[] = [];

    players.forEach((p) => {
        const before = totalsBefore[p.id] ?? 0;
        const after = totalsAfter[p.id] ?? 0;

        if (before < 1000 && after >= 1000) nyewuNames.push(toSpeechName(p.name));

        text += `${toSpeechName(p.name)}, ${scoreWord(after)} ... `;
    });

    const shoot = shootRecords.find((r) => r.roundId === round.roundId);

    if (shoot) {
        const shooter = nameOf(players, shoot.shooterId);
        const victim = nameOf(players, shoot.victimId);
        const psywar =
            PENALTY_PSYWAR[shoot.penaltyPoints] ?? `${shoot.penaltyPoints} poin ...`;

        text += `Woro woro! ... ${shooter} gepuk ${victim} ${psywar} `;
    }

    if (nyewuNames.length > 0) {
        text += `Woro woro! ... ${nyewuNames.join(
            " dan "
        )} wes nyewu, ... ngarit tenan, ... beh beh beh ... `;
    }

    if (players.length >= 2) {
        const sorted = players.map((p) => totalsAfter[p.id] ?? 0).sort((a, b) => b - a);
        const gap = sorted[sorted.length - 2] - sorted[sorted.length - 1];

        if (gap >= 500) {
            text += `Woro woro! ... Jarake wes punjul 500, ... sret opo gak?? ... ha ha ha ... `;
        }
    }

    if (round.tieBreak) {
        const spins = round.tieBreak.candidates
            .map((id) => `${nameOf(players, id)} oleh ${round.tieBreak?.results[id]}`)
            .join(", ");

        text += `Woro woro! ... Mau bijine podo, wes tak spin. ... ${spins} ... `;
        text += `Sing jengkeng ${nameOf(players, round.resolvedLastPlaceId)} ... `;

        return text;
    }

    const previousLastPlace =
        roundIndex > 0 ? rounds[roundIndex - 1].resolvedLastPlaceId : null;

    if (
        round.resolvedLastPlaceId &&
        previousLastPlace &&
        round.resolvedLastPlaceId !== previousLastPlace
    ) {
        text += `Woro woro! ... Sing jengkeng ganti ${nameOf(
            players,
            round.resolvedLastPlaceId
        )} ... `;
    }

    return text;
}