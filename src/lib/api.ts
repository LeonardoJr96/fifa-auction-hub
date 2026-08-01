/**
 * Cliente HTTP da API Django (fetch nativo).
 *
 * O access token vive apenas em memória (setado pelo AuthProvider).
 * Em 401 tentamos renovar automaticamente com o refresh token e repetir a request.
 */

export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:8000/api/v1";

/** A raiz do backend (sem /api/v1) — onde ficam /login/ e /login/refresh/. */
export const AUTH_URL = API_URL.replace(/\/api\/v1\/?$/, "");

const STORAGE_KEY = "reversedraft.session";

let accessToken: string | null = null;
let refreshToken: string | null = null;
let onSessionLost: (() => void) | null = null;

function persist() {
  if (typeof window === "undefined") return;
  try {
    if (accessToken && refreshToken) {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ access: accessToken, refresh: refreshToken }),
      );
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* storage indisponível (modo privado) — segue apenas em memória */
  }
}

/** Lê a sessão salva no navegador (chamado na inicialização do AuthProvider). */
export function loadStoredTokens(): { access: string; refresh: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access?: string; refresh?: string };
    if (!parsed.access || !parsed.refresh) return null;
    accessToken = parsed.access;
    refreshToken = parsed.refresh;
    return { access: parsed.access, refresh: parsed.refresh };
  } catch {
    return null;
  }
}

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
  persist();
}

export function getAccessToken() {
  return accessToken;
}

/** Renova o access token usando o refresh salvo. Retorna o novo access ou null. */
export async function refreshSession(): Promise<string | null> {
  const ok = await tryRefresh();
  return ok ? accessToken : null;
}


export function setSessionLostHandler(handler: (() => void) | null) {
  onSessionLost = handler;
}

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function messageFromBody(status: number, body: unknown): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    const direct = record.detail ?? record.error ?? record.message;
    if (typeof direct === "string") return direct;
    const firstKey = Object.keys(record)[0];
    const value = firstKey ? record[firstKey] : undefined;
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  }
  if (typeof body === "string" && body.trim()) return body;
  return `Erro ${status} na requisição.`;
}

async function parseBody(response: Response): Promise<unknown> {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function tryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const response = await fetch(`${AUTH_URL}/login/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: refreshToken }),
    });
    if (!response.ok) return false;
    const data = (await response.json()) as { access?: string; refresh?: string };
    if (!data.access) return false;
    accessToken = data.access;
    if (data.refresh) refreshToken = data.refresh;
    return true;
  } catch {
    return false;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Prefixa com a raiz do backend em vez de /api/v1 (usado no login). */
  auth?: boolean;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, auth = false, signal } = options;
  const base = auth ? AUTH_URL : API_URL;
  const url = `${base}${path}`;

  const send = () => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
    return fetch(url, {
      method,
      headers,
      signal,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  };

  let response = await send();

  if (response.status === 401 && accessToken) {
    const renewed = await tryRefresh();
    if (renewed) {
      response = await send();
    } else {
      setTokens(null, null);
      onSessionLost?.();
    }
  }

  const data = await parseBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, messageFromBody(response.status, data), data);
  }
  return data as T;
}

/** Extrai a lista de um endpoint que pode ou não vir paginado pelo DRF. */
export function toList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && Array.isArray((data as { results?: T[] }).results)) {
    return (data as { results: T[] }).results;
  }
  return [];
}
