/** Auth token storage.
 *
 * Dev mode: short-lived JWT pair kept in localStorage (30-min access, rotating
 * refresh). Production deployment should switch to HttpOnly SameSite cookies via
 * the backend (see frontend/docs/API_INTEGRATION.md, Cross-origin auth section).
 */
const ACCESS_KEY = "shijie.access_token";
const REFRESH_KEY = "shijie.refresh_token";

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY) ?? "";
  },
  set access(v: string) {
    localStorage.setItem(ACCESS_KEY, v);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY) ?? "";
  },
  set refresh(v: string) {
    localStorage.setItem(REFRESH_KEY, v);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
  get hasSession() {
    return Boolean(localStorage.getItem(ACCESS_KEY));
  },
};

/** Problem-details error envelope from the backend. */
export interface ApiError {
  code: string;
  detail: string;
  status: number;
}

export function asApiError(body: unknown): ApiError | null {
  if (body && typeof body === "object" && "code" in body) {
    const b = body as Record<string, unknown>;
    return {
      code: String(b.code ?? "UNKNOWN"),
      detail: String(b.detail ?? ""),
      status: Number(b.status ?? 0),
    };
  }
  return null;
}

/** Human-readable message from an openapi-fetch error union (problem-details or
 * FastAPI validation array). The UI must never branch on message strings. */
export function errMsg(err: unknown): string {
  if (!err) return "请求失败";
  if (typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.detail === "string") return e.detail;
    if (Array.isArray(e.detail) && e.detail.length > 0) {
      const first = e.detail[0] as Record<string, unknown>;
      return String(first.msg ?? "请求参数有误");
    }
    if (typeof e.message === "string") return e.message;
  }
  return "请求失败";
}
