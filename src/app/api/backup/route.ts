import type { NextRequest } from "next/server";
import { handleGet, handlePost, isSameOrigin, parseBodyText } from "@/lib/backup/handlers";
import { NeonBackupStorage } from "@/lib/backup/neonStorage";
import type { BackupStorage } from "@/lib/backup/storage";

/**
 * Cadangan online riwayat Jengkeng. Logika ada di `lib/backup/handlers.ts`;
 * file ini hanya menyambungkan Request ke sana. Sengaja tidak ada DELETE.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getStorage(): BackupStorage | null {
  const url = process.env.DATABASE_URL;
  return url ? new NeonBackupStorage(url) : null;
}

function json(status: number, body: Record<string, unknown>): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return json(403, { ok: false, error: "forbidden" });
  }

  const parsed = parseBodyText(await request.text());
  if (parsed === "too-large") return json(413, { ok: false, error: "too-large" });
  if (parsed === null) return json(400, { ok: false, error: "bad-json" });

  try {
    const result = await handlePost(parsed, getStorage());
    return json(result.status, result.body);
  } catch {
    return json(500, { ok: false, error: "server" });
  }
}

export async function GET(request: NextRequest) {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return json(403, { ok: false, error: "forbidden" });
  }

  try {
    const result = await handleGet(request.nextUrl.searchParams.get("code"), getStorage());
    return json(result.status, result.body);
  } catch {
    return json(500, { ok: false, error: "server" });
  }
}
