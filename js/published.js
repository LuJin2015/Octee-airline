// Files the Control Tower publishes (codes, accounts, permissions, crew). They live in Octee Cloud, so a change is live at
// once, with no download and no push to GitHub. Every reader falls back to the file in data/ (and a "Manual download" stays in
// the Control Tower) in case the cloud has a problem. Standalone on purpose: auth.js and others import it.
import { load } from "./store.js";
import { CONFIG } from "./config.js";

const token = () => (load("octee.cloud", null) || {}).token || "";
async function call(method, path, body, withToken) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 8000);
  try {
    const res = await fetch(CONFIG.CLOUD_URL + path, { method, signal: ctl.signal, cache: "no-store",
      headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(withToken && token() ? { authorization: "Bearer " + token() } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, j };
  } catch { return { ok: false, status: 0, j: { error: "offline" } }; } finally { clearTimeout(t); }
}

// The cloud copy if there is one, else the file in data/, else the fallback.
export async function fetchPublished(name, staticPath, fallback) {
  if (CONFIG.CLOUD_URL) {
    const r = await call("GET", "/api/data/" + name);
    if (r.ok && r.j && r.j.data && typeof r.j.data === "object") return r.j.data;
  }
  try { const r = await fetch(staticPath, { cache: "no-store" }); if (r.ok) return await r.json(); } catch { /* use the fallback */ }
  return fallback;
}

export const PUBLISH_MESSAGES = {
  login: "Not saved. Log in to Octee Cloud first (login page, Log in tab), then try again.",
  not_publisher: "Not saved. This cloud account is not a Control Tower admin. The owner can add it on the Cloud accounts tab.",
  offline: "Not saved. The cloud could not be reached. Use the manual download below instead.",
  too_big: "Not saved. The file is too big for the cloud.",
  bad_data: "Not saved. The cloud did not accept that file.",
  server: "Not saved. The cloud had a problem. Use the manual download below instead."
};
// -> { ok:true } or { ok:false, message }
export async function publishToCloud(name, data) {
  if (!token()) return { ok: false, message: PUBLISH_MESSAGES.login };
  const r = await call("PUT", "/api/data/" + name, { data }, true);
  if (r.ok) return { ok: true };
  return { ok: false, message: PUBLISH_MESSAGES[r.j.error] || PUBLISH_MESSAGES.server };
}
// Is the cloud account this browser is logged in to a Control Tower owner or admin? true / false, or null when unknown (not logged in, cloud down).
export async function isPublisher() {
  if (!token()) return null;
  const r = await call("GET", "/api/admin/me", undefined, true);
  if (r.ok) return !!r.j.role;
  return r.status === 403 ? false : null;
}
