import { getApiBaseUrl } from "./config";

export async function postJson<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T;
  return { ok: response.ok, status: response.status, data };
}
