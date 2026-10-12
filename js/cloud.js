// Octee Cloud: an account that follows you to any device. A small Worker (Cloudflare) keeps a login and ONE saved copy
// of your account (miles, tokens, peanuts, trips...). The site still works without it: local accounts, etched accounts
// and backup codes are unchanged. Nothing here runs unless you log in to the cloud.
import { load, save, remove } from "./store.js";
import { CONFIG } from "./config.js";
import { currentUser, etchedAccounts, profileOf, installProfile, sessionKey, localPasswordOk, localExists, isEtched, signUp, logIn, AuthError, notify, USERNAME_RE } from "./auth.js";

const KEY = "octee.cloud";           // { token, name, key, updatedAt, dirty }
const state = () => load(KEY, null);
const setState = (s) => (s ? save(KEY, s) : remove(KEY));
export const cloudState = state;
export const cloudLinked = () => { const s = state(); return !!(s && s.token && s.key === sessionKey()); };
export async function cloudAdminCall(method, path, body) {
  const s = state();
  if (!cloudLinked() || !s?.token) throw new CloudError("login");
  return call(method, path, body, s.token);
}

export const CLOUD_MESSAGES = {
  bad_login: "Wrong cloud password. Or wrong username. The cloud lost track too.",
  taken: "That cloud name is taken. Someone boarded first.",
  bad_username: "Usernames need 3–20 letters, numbers or underscores.",
  bad_password: "Password too short (8 or more characters). Like our legroom.",
  wait: "Too many tries. The cloud desk is closed for a few minutes. Please sit.",
  offline: "The cloud could not be reached. Try again later, or use the Manual sign in tab.",
  etched: "That name is an etched account. Use the Log in tab with its password and it joins the cloud.",
  local_taken: "This browser already has a different account with that name. Log in to it first, or pick another name.",
  wrong_local: "That is not the password of the account in this browser.",
  too_big: "Your account is too big for the cloud. Joel is impressed, and sorry.",
  server: "The cloud had a problem. Blame Joel."
};
export class CloudError extends Error { constructor(code, extra = {}) { super(code); this.code = code; Object.assign(this, extra); } }

async function call(method, path, body, token) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 12000);
  let res;
  try {
    res = await fetch(CONFIG.CLOUD_URL + path, { method, signal: ctl.signal, headers: { ...(body !== undefined ? { "content-type": "application/json" } : {}), ...(token ? { authorization: "Bearer " + token } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch { throw new CloudError("offline"); } finally { clearTimeout(t); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new CloudError(j.error || "server", { status: res.status, body: j });
  return j;
}
const etchedHash = async (name) => ((await etchedAccounts()).find((a) => a.username.toLowerCase() === String(name || "").trim().toLowerCase()) || {}).hash || "";
export const cloudMessage = (e) => (e instanceof AuthError ? e.message : CLOUD_MESSAGES[e?.code] || CLOUD_MESSAGES.server);

let suppress = false;
const quietNotify = () => { suppress = true; try { notify(); } finally { suppress = false; } };

// ---- log in / create ----
// Log in: the cloud copy goes into this browser. First time for a local-only account? Then the local copy is uploaded.
export async function cloudLogin(username, password) {
  username = String(username || "").trim();
  let r;
  try { r = await call("POST", "/api/login", { username, password }); }
  catch (e) {
    // An etched account (in the code) that is not in the cloud yet: check its password here, then let it join.
    const et = e.code === "bad_login" && (await etchedHash(username));
    if (!et) throw e;
    try { await logIn(username, password); } catch { throw e; }
    r = await call("POST", "/api/claim", { username, password, proof: et });
  }
  const name = r.username;
  if (r.profile) {
    await installProfile(name, r.profile, { password }, { quiet: true });
  } else if ((localExists(name) && (await localPasswordOk(name, password))) || (await isEtched(name))) {
    await logIn(name, password); // nothing in the cloud yet: this browser's copy becomes the cloud copy
  } else {
    await signUp(name, password, password); // an empty cloud account: start fresh (with the welcome bonus)
  }
  setState({ token: r.token, name, key: name.toLowerCase(), updatedAt: r.updatedAt || null, dirty: !r.profile });
  quietNotify();
  if (!r.profile) await push(true);
  return currentUser();
}
// Create a cloud account. If this browser already has a local account of that name AND you know its password, it is uploaded.
export async function cloudCreate(username, password) {
  username = String(username || "").trim();
  if (!USERNAME_RE.test(username)) throw new CloudError("bad_username");
  if (String(password || "").length < CONFIG.PASSWORD_MIN) throw new CloudError("bad_password");
  if (await isEtched(username)) throw new CloudError("etched");
  const had = localExists(username);
  if (had && !(await localPasswordOk(username, password))) throw new CloudError("local_taken");
  const r = await call("POST", "/api/register", { username, password });
  if (!had) await signUp(username, password, password); // a fresh local account with the welcome bonus
  else await logIn(username, password);
  setState({ token: r.token, name: r.username, key: username.toLowerCase(), updatedAt: null, dirty: true });
  await push(true);
  return currentUser();
}
// Link the account you are logged into now (Account page): needs the password for the cloud.
export async function cloudLinkCurrent(password) {
  const u = currentUser(); if (!u) throw new CloudError("bad_login");
  if (!(await localPasswordOk(u.username, password))) throw new CloudError("wrong_local");
  if (await isEtched(u.username)) throw new CloudError("etched");
  const r = await call("POST", "/api/register", { username: u.username, password });
  setState({ token: r.token, name: r.username, key: u.username.toLowerCase(), updatedAt: null, dirty: true });
  await push(true);
}
export async function cloudLogout() {
  const s = state();
  setState(null);
  if (s?.token) { try { await call("POST", "/api/logout", {}, s.token); } catch { /* the token will expire by itself */ } }
}

// ---- keeping the copy up to date ----
let timer = null, pushing = false, lastError = "";
export const cloudLastError = () => lastError;
export async function push(now = false) {
  const s = state(), u = currentUser();
  if (!s || !u || s.key !== sessionKey()) return false;
  if (!now) { clearTimeout(timer); timer = setTimeout(() => push(true), 2000); return true; }
  if (pushing) { clearTimeout(timer); timer = setTimeout(() => push(true), 1500); return true; }
  pushing = true;
  try {
    const body = { profile: profileOf(u) };
    if (s.updatedAt) body.baseUpdatedAt = s.updatedAt;
    const r = await call("PUT", "/api/profile", body, s.token);
    setState({ ...s, updatedAt: r.updatedAt, dirty: false }); lastError = "";
    // The cloud owns the balances (Octmiles, Octeetokens, Fujitech, Scraggymiles). If it did not accept a change, take its copy.
    if (r.corrected && r.profile) { await applyServer({ ...s, updatedAt: r.updatedAt }, r.profile, r.updatedAt, false); showCorrected(); }
    window.dispatchEvent(new CustomEvent("octee:cloud"));
    return true;
  } catch (e) {
    if (e.code === "conflict") { await applyServer(s, e.body.profile, e.body.updatedAt, true); return false; }
    if (e.status === 401) { setState(null); lastError = "login"; window.dispatchEvent(new CustomEvent("octee:cloud")); return false; }
    lastError = e.code; setState({ ...s, dirty: true }); window.dispatchEvent(new CustomEvent("octee:cloud")); return false;
  } finally { pushing = false; }
}
function showCorrected() {
  try {
    const n = document.createElement("div");
    n.setAttribute("role", "status");
    n.style.cssText = "position:fixed;left:50%;bottom:16px;transform:translateX(-50%);max-width:90vw;background:#1f2a44;color:#fff;padding:10px 14px;border-radius:10px;z-index:9999;font:14px system-ui,sans-serif;box-shadow:0 4px 16px rgba(0,0,0,.3)";
    n.textContent = "The cloud keeps your balances, and it corrected them to match its records.";
    document.body.append(n);
    setTimeout(() => n.remove(), 7000);
  } catch { /* no page */ }
}
async function applyServer(s, profile, updatedAt, conflict = false) {
  const u = currentUser(); if (!u || !profile) return;
  await installProfile(u.username, profile, { salt: u.salt, hash: u.hash }, { login: false, quiet: true });
  setState({ ...s, updatedAt, dirty: false });
  quietNotify();
  window.dispatchEvent(new CustomEvent("octee:cloud", { detail: { conflict } }));
}
export async function pull() {
  const s = state(); if (!s || s.key !== sessionKey()) return;
  try {
    const r = await call("GET", "/api/profile", undefined, s.token);
    if (s.dirty) { await push(true); return; }
    if (r.profile && r.updatedAt !== s.updatedAt) await applyServer(s, r.profile, r.updatedAt);
  } catch (e) {
    if (e.status === 401) { setState(null); window.dispatchEvent(new CustomEvent("octee:cloud")); }
  }
}

// ---- wiring: runs on every page ----
window.addEventListener("octee:account", () => {
  if (suppress) return;
  const s = state(), k = sessionKey();
  if (s && s.key !== k) { // logged out, or a different account logged in: the cloud copy belongs to someone else
    cloudLogout();
    return;
  }
  if (s) { setState({ ...s, dirty: true }); push(false); }
});
if (cloudLinked()) pull();
