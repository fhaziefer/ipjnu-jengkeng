import type { GameRecord } from "./history";

export interface Rivalry {
  shooterKey: string;
  shooterName: string;
  victimKey: string;
  victimName: string;
  /** Berapa kali menggepuk korban ini. */
  count: number;
  /** Total poin gepukan ke korban ini. */
  points: number;
}

/**
 * Pasangan penggepuk -> korban dari semua gepukan di riwayat, urut dari yang
 * paling sering (lalu poin terbanyak, lalu nama supaya urutannya stabil).
 * Nama yang ditampilkan = nama terakhir yang dipakai untuk key itu.
 */
export function computeRivalries(games: ReadonlyArray<GameRecord>): Rivalry[] {
  const ordered = [...games].sort((a, b) => a.finishedAt - b.finishedAt);
  const names = new Map<string, string>();
  const pairs = new Map<string, Rivalry>();

  for (const g of ordered) {
    g.players.forEach((p) => names.set(p.key, p.name));
    for (const s of g.shoots) {
      const shooter = g.players[s.shooter];
      const victim = g.players[s.victim];
      if (!shooter || !victim || shooter.key === victim.key) continue;
      const id = `${shooter.key}\u0000${victim.key}`;
      const row = pairs.get(id) ?? {
        shooterKey: shooter.key,
        shooterName: shooter.name,
        victimKey: victim.key,
        victimName: victim.name,
        count: 0,
        points: 0,
      };
      row.count += 1;
      row.points += s.points;
      pairs.set(id, row);
    }
  }

  return [...pairs.values()]
    .map((r) => ({ ...r, shooterName: names.get(r.shooterKey) ?? r.shooterName, victimName: names.get(r.victimKey) ?? r.victimName }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        b.points - a.points ||
        a.shooterName.localeCompare(b.shooterName) ||
        a.victimName.localeCompare(b.victimName)
    );
}

/** Korban favorit tiap penggepuk: pasangan teratas per penggepuk. */
export function favoriteVictims(rivalries: ReadonlyArray<Rivalry>): Rivalry[] {
  const seen = new Set<string>();
  const out: Rivalry[] = [];
  for (const r of rivalries) {
    if (seen.has(r.shooterKey)) continue;
    seen.add(r.shooterKey);
    out.push(r);
  }
  return out;
}
