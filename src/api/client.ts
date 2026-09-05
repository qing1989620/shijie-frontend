import createClient from "openapi-fetch";
import type { paths } from "./generated/schema";
import { tokens } from "../stores/auth";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? "ws://localhost:8000";

let refreshing: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      const rt = tokens.refresh;
      if (!rt) return false;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (!res.ok) return false;
        const data = (await res.json()) as { access_token: string; refresh_token: string };
        tokens.access = data.access_token;
        tokens.refresh = data.refresh_token;
        return true;
      } catch {
        return false;
      } finally {
        setTimeout(() => (refreshing = null), 0);
      }
    })();
  }
  return refreshing;
}

/** Auth wrapper: attaches Bearer token and replays once after a successful
 * refresh on 401. openapi-fetch passes a Request instance (init undefined),
 * so headers/body must be merged from BOTH sources. */
async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const req = input instanceof Request ? input : null;
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

  const headers = new Headers(req ? req.headers : undefined);
  if (init?.headers) new Headers(init.headers).forEach((v, k) => headers.set(k, v));
  if (isApi(url) && tokens.access && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${tokens.access}`);
  }

  const method = init?.method ?? req?.method ?? "GET";
  let body = init?.body;
  if (body === undefined && req && method !== "GET" && method !== "HEAD") {
    body = await req.clone().text(); // Request holds the serialized body; re-send as text
  }
  const signal = (init?.signal ?? req?.signal) ?? undefined;
  const redirect = (init?.redirect ?? req?.redirect) as RequestRedirect | undefined;

  const send = () =>
    fetch(url, { method, headers, body, signal, redirect, credentials: init?.credentials ?? req?.credentials });

  const res = await send();
  if (res.status === 401 && isApi(url) && tokens.refresh && !url.includes("/auth/refresh")) {
    if (await tryRefresh()) {
      headers.set("Authorization", `Bearer ${tokens.access}`);
      return send();
    }
  }
  return res;
}

function isApi(url: string): boolean {
  return url.startsWith(API_BASE_URL);
}

export const api = createClient<paths>({ baseUrl: API_BASE_URL, fetch: authFetch });
