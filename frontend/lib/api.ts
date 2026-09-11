const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem("cg_admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) =>
    fetch(`${API_BASE_URL}${path}`, { headers: { ...authHeaders() } }).then((r) => handle<T>(r)),

  post: <T>(path: string, body: unknown) =>
    fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then((r) => handle<T>(r)),

  put: <T>(path: string, body: unknown) =>
    fetch(`${API_BASE_URL}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body),
    }).then((r) => handle<T>(r)),

  del: <T>(path: string) =>
    fetch(`${API_BASE_URL}${path}`, { method: "DELETE", headers: { ...authHeaders() } }).then((r) =>
      handle<T>(r)
    ),

  postForm: <T>(path: string, form: FormData) =>
    fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: form,
    }).then((r) => handle<T>(r)),
};

export { API_BASE_URL };
