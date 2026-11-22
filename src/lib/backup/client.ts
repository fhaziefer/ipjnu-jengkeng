import { BACKUP_API_PATH, CLIENT_TIMEOUT_MS } from "./constants";
import type { BackupGetResponse, BackupPostPayload, BackupPostResponse } from "./types";

/**
 * Klien HTTP cadangan. Kontraknya: TIDAK PERNAH melempar. Jaringan mati,
 * timeout, server 500/429/503, JSON rusak: semuanya jadi `{ ok: false }`.
 * Pemanggil memutuskan apa yang dilakukan (diam-diam coba lagi nanti).
 */

export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number | null };

type FetchLike = typeof fetch;

async function request<T>(
  url: string,
  init: RequestInit,
  fetchImpl: FetchLike,
  isShapeOk: (data: unknown) => data is T
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

  try {
    const res = await fetchImpl(url, { ...init, signal: controller.signal, cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status };

    const data: unknown = await res.json();
    return isShapeOk(data) ? { ok: true, data } : { ok: false, status: res.status };
  } catch {
    return { ok: false, status: null };
  } finally {
    clearTimeout(timer);
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const isPostResponse = (v: unknown): v is BackupPostResponse =>
  isRecord(v) && v.ok === true && Array.isArray(v.acked) && Array.isArray(v.rejectedIds);

const isGetResponse = (v: unknown): v is BackupGetResponse =>
  isRecord(v) && v.ok === true && Array.isArray(v.games);

export function postBackup(
  payload: BackupPostPayload,
  fetchImpl: FetchLike = fetch
): Promise<ApiResult<BackupPostResponse>> {
  return request(
    BACKUP_API_PATH,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    fetchImpl,
    isPostResponse
  );
}

export function fetchBackup(
  code: string,
  fetchImpl: FetchLike = fetch
): Promise<ApiResult<BackupGetResponse>> {
  return request(
    `${BACKUP_API_PATH}?code=${encodeURIComponent(code)}`,
    { method: "GET" },
    fetchImpl,
    isGetResponse
  );
}
