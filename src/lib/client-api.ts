"use client";
import { useCallback, useEffect, useState } from "react";
export class ApiError extends Error { constructor(public code: string, public status: number) { super(code); } }
export async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: "no-store", ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const body = await response.json().catch(() => ({ error: "unavailable" }));
  if (!response.ok) throw new ApiError(body.error ?? "unavailable", response.status);
  return body as T;
}
export function useRemote<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const reload = useCallback(() => { setLoading(true); setRevision(v => v + 1); }, []);
  useEffect(() => { const controller = new AbortController(); requestJson<T>(url, { signal: controller.signal }).then(result => { setData(result); setError(null); }).catch((err: unknown) => { if (!controller.signal.aborted) setError(err instanceof ApiError ? err.code : "unavailable"); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [url, revision]);
  return { data, error, loading, reload };
}
