import type { Player, Round, ShootRecord } from "@/store/useGameStore";
import { toSpeechName } from "./playerName";
import { computeTotals } from "./scoring";
import { DEFAULT_TEMPLATES, renderTemplate, type TemplateKey } from "./speechTemplates";

/**
 * Semua teks pengumuman dibangun di sini, bukan di dalam komponen.
 *
 * Alasannya: pengumuman skor sekarang bisa dipicu dari dua tempat berbeda
 * (langsung setelah submit kalau tidak seri, atau setelah spin selesai kalau
 * seri). Kalau logikanya nempel di AddRoundModal, versi kedua pasti beda.
 *
 * Kalimatnya sendiri ada di `speechTemplates.ts` dan bisa diedit admin. Tanpa
 * override, keluaran fungsi ini HARUS sama persis dengan versi sebelum template
 * ada (dijaga tes terhadap salinan beku di `src/test/legacyAnnouncement.ts`).
 */

export type Templates = Readonly<Record<TemplateKey, string>>;

const PSYWAR_KEY: Record<number, TemplateKey> = {
    100: "psywar100",
    200: "psywar200",
    300: "psywar300",
    500: "psywar500",
    1000: "psywar1000",
};

function nameOf(players: Player[], playerId: string | null): string {
    if (!playerId) return "";
    return toSpeechName(players.find((p) => p.id === playerId)?.name ?? "");
}

function scoreWord(score: number): string {
    return score < 0 ? `minus ${Math.abs(score)}` : score.toString();
}

/**
 * Satu potong pengumuman, selalu diakhiri satu spasi supaya potongan bisa
 * disambung begitu saja. Potongan kosong (dibisukan admin) dilewati.
 */
function piece(template: string, vars: Readonly<Record<string, string>> = {}): string {
    const text = renderTemplate(template, vars).trim();
    return text ? `${text} ` : "";
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
    roundIndex: number,
    templates: Templates = DEFAULT_TEMPLATES
): string {
    const round = rounds[roundIndex];
    if (!round) return "";

    const totalsBefore = computeTotals(players, rounds.slice(0, roundIndex));
    const totalsAfter = computeTotals(players, rounds.slice(0, roundIndex + 1));

    let text = piece(templates.roundHeader);
    const nyewuNames: string[] = [];

    players.forEach((p) => {
        const before = totalsBefore[p.id] ?? 0;
        const after = totalsAfter[p.id] ?? 0;

        if (before < 1000 && after >= 1000) nyewuNames.push(toSpeechName(p.name));

        text += piece(templates.scoreLine, {
            nama: toSpeechName(p.name),
            skor: scoreWord(after),
        });
    });

    const shoot = shootRecords.find((r) => r.roundId === round.roundId);

    if (shoot) {
        const psywarKey = PSYWAR_KEY[shoot.penaltyPoints];
        const psywar = psywarKey
            ? renderTemplate(templates[psywarKey], {}).trim()
            : `${shoot.penaltyPoints} poin ...`;

        text += piece(templates.gepuk, {
            penembak: nameOf(players, shoot.shooterId),
            korban: nameOf(players, shoot.victimId),
            psywar,
            poin: String(shoot.penaltyPoints),
        });
    }

    if (nyewuNames.length > 0) {
        text += piece(templates.nyewu, { nama: nyewuNames.join(" dan ") });
    }

    if (players.length >= 2) {
        const sorted = players.map((p) => totalsAfter[p.id] ?? 0).sort((a, b) => b - a);
        const gap = sorted[sorted.length - 2] - sorted[sorted.length - 1];

        if (gap >= 500) {
            text += piece(templates.gapWarning);
        }
    }

    if (round.tieBreak) {
        const spins = round.tieBreak.candidates
            .map((id) => `${nameOf(players, id)} oleh ${round.tieBreak?.results[id]}`)
            .join(", ");

        text += piece(templates.tieResult, {
            hasil_spin: spins,
            nama: nameOf(players, round.resolvedLastPlaceId),
        });

        return text;
    }

    const previousLastPlace =
        roundIndex > 0 ? rounds[roundIndex - 1].resolvedLastPlaceId : null;

    if (
        round.resolvedLastPlaceId &&
        previousLastPlace &&
        round.resolvedLastPlaceId !== previousLastPlace
    ) {
        text += piece(templates.lastPlaceChange, {
            nama: nameOf(players, round.resolvedLastPlaceId),
        });
    }

    return text;
}
