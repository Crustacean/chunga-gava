const TOKEN_KEY = "cg_admin_token";

export function setAdminToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function getAdminToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function clearAdminToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}
