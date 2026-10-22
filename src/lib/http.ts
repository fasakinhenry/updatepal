import { env } from "./env";

/** every failed request becomes one of these, so screens can react to the code instead of guessing. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown) { super(message); }
}
let token = ""; // access token lives in memory only. the refresh cookie is httpOnly.
export const setToken = (t: string) => { token = t; };

let inflight: Promise<boolean> | null = null;
/** one shared refresh at a time, so parallel requests do not rotate the cookie twice. */
export function refresh(): Promise<boolean> {
  inflight ??= fetch(`${env.apiBase}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(async (r) => { if (!r.ok) return false; token = ((await r.json()) as { accessToken: string }).accessToken; return true; })
    .catch(() => false).finally(() => { inflight = null; });
  return inflight;
}

async function send(path: string, init: RequestInit, retry = true): Promise<Response> {
  let r: Response;
  try { r = await fetch(env.apiBase + path, { ...init, credentials: "include", headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } }); }
  catch { throw new ApiError(0, "network", "could not reach the server. check your connection and try again."); }
  if (r.status === 401 && retry && !path.startsWith("/auth/") && (await refresh())) return send(path, init, false);
  return r;
}
async function fail(r: Response): Promise<never> {
  const b = (await r.json().catch(() => null)) as { error?: { code?: string; message?: string; details?: unknown } } | null;
  throw new ApiError(r.status, b?.error?.code ?? "error", b?.error?.message ?? "something went wrong", b?.error?.details);
}
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await send(path, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
  if (!r.ok) return fail(r);
  return (await r.json()) as T;
}
export const post = <T>(path: string, data?: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(data ?? {}) });
export const patch = <T>(path: string, data: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(data) });
export const put = <T>(path: string, data?: unknown) => request<T>(path, { method: "PUT", body: JSON.stringify(data ?? {}) });
export const del = <T>(path: string, data?: unknown) => request<T>(path, { method: "DELETE", ...(data ? { body: JSON.stringify(data) } : {}) });
/** raw file upload. the server stores it privately and validates it again. */
export async function upload<T>(path: string, file: File): Promise<T> {
  const r = await send(path, { method: "PUT", body: file, headers: { "Content-Type": "application/octet-stream" } });
  if (!r.ok) return fail(r);
  return (await r.json()) as T;
}
export async function download(path: string): Promise<Blob> {
  const r = await send(path, {});
  if (!r.ok) return fail(r);
  return r.blob();
}
export function saveBlob(b: Blob, name: string) { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }

/** opens a server sent events stream. refresh and retry work the same as for normal requests. */
export async function openStream(path: string, signal: AbortSignal) {
  const r = await send(path, { signal, headers: { Accept: "text/event-stream" } });
  if (!r.ok || !r.body) throw new ApiError(r.status, "stream", "could not open the live connection");
  return r.body;
}
/** uploads an image (png, jpeg, webp or gif up to 5 mb) and returns its public url. the server checks the file again. */
export async function uploadImage(file: File, kind: "avatar" | "logo" | "banner" | "story" | "update"): Promise<string> {
  const r = await send(`/media?kind=${kind}`, { method: "PUT", body: file, headers: { "Content-Type": "application/octet-stream" } });
  if (!r.ok) return fail(r);
  return ((await r.json()) as { url: string }).url;
}
