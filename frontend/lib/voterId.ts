const VOTER_ID_KEY = "cg_voter_id";

/** crypto.randomUUID() requires a secure context (https or localhost); over a plain-http
 * NodePort/LAN IP it's undefined, so fall back to a non-cryptographic UUID v4-shaped id. */
function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      // fall through to the manual generator below
    }
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Anonymous per-browser identifier used to enforce "one vote per cycle" without requiring citizen accounts. */
export function getVoterId(): string {
  if (typeof window === "undefined") return "";
  try {
    let voterId = window.localStorage.getItem(VOTER_ID_KEY);
    if (!voterId) {
      voterId = generateId();
      window.localStorage.setItem(VOTER_ID_KEY, voterId);
    }
    return voterId;
  } catch {
    // localStorage can throw (e.g. private browsing quota); fall back to a per-call id
    // rather than letting this bubble up and hang an unrelated submit flow.
    return generateId();
  }
}
