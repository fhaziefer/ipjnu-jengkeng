import type { Player } from "@/store/useGameStore";
import { toSpeechName } from "./playerName";

/**
 * Isi placeholder untuk kalimat yang diucapkan di luar pengumuman ronde:
 * konfirmasi SRET dan intro "skor terendah seri". Dipisah dari komponen supaya
 * bisa dites dan tidak berbeda antar pemanggil.
 */

/** Dipakai saat belum ada juru kunci (belum ada ronde), supaya kalimat tidak bolong. */
export const NO_LAST_PLACE_WORD = "kabeh";

/** "A", "A dan B", "A, B dan C". */
export function joinSpeechNames(names: string[]): string {
    if (names.length <= 1) return names[0] ?? "";
    return `${names.slice(0, -1).join(", ")} dan ${names[names.length - 1]}`;
}

function speechNameOf(players: Player[], playerId: string): string {
    const player = players.find((p) => p.id === playerId);
    return player ? toSpeechName(player.name) : "";
}

export function buildSretVars(
    players: Player[],
    currentLastPlacePlayerId: string | null
): Record<string, string> {
    const name = currentLastPlacePlayerId
        ? speechNameOf(players, currentLastPlacePlayerId)
        : "";
    return { nama_terburuk: name || NO_LAST_PLACE_WORD };
}

export function buildTieIntroVars(
    players: Player[],
    candidateIds: string[]
): Record<string, string> {
    const names = candidateIds
        .map((id) => speechNameOf(players, id))
        .filter((name) => name !== "");
    return { kandidat_seri: joinSpeechNames(names) };
}

/** Untuk pengingat "juru kunci N ronde beruntun". */
export function buildStreakVars(
    players: Player[],
    currentLastPlacePlayerId: string | null,
    consecutiveRounds: number
): Record<string, string> {
    return {
        ...buildSretVars(players, currentLastPlacePlayerId),
        berapa_kali_terbawah: String(consecutiveRounds),
    };
}
