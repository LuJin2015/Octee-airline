// JoelAI Pro, the model side: is the model server reachable, and what does the server-side JoelToken ledger say?
// The ledger lives in Octee Cloud (cloud/index.js). The browser only asks, it never decides: unlock, top-ups and charges
// are all checked and recorded by the server, and the numbers on screen are copied back from it.
import { CONFIG } from "./config.js";
import { cloudLinked, cloudState, push, pull } from "./cloud.js";

const apiUrl = () => (CONFIG.JOELAI_API_URL || "").replace(/\/+$/, "") + "/api/joelai";
export const modelUrl = apiUrl;

// ---- is the model server there? ----
// "ready" | "file" (page opened from disk) | "off" (server there, not switched on) | "none" (no server at this address)
let probed = null;
export async function modelStatus(force = false) {
  if (location.protocol === "file:") return { state: "file", why: "This page is opened from a file, so it cannot reach the model server." };
  if (!force && probed && Date.now() - probed.at < 60000) return probed.value;
  let value;
  try {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch(apiUrl(), { signal: ctl.signal, cache: "no-store" }).finally(() => clearTimeout(t));
    const j = res.ok ? await res.json().catch(() => null) : null;
    if (!j || j.ok !== true) value = { state: "none", why: "This site has no model server. GitHub Pages only runs the handbook." };
    else if (!j.ready) value = { state: "off", why: j.enabled ? "The model server is missing a key, so it cannot answer yet." : "The model server is not switched on yet." };
    else value = { state: "ready", why: "" };
  } catch { value = { state: "none", why: "The model server could not be reached from this page." }; }
  probed = { at: Date.now(), value };
  return value;
}

// ---- the ledger ----
const token = () => (cloudLinked() ? cloudState().token : "");
export const hasLedger = () => !!token();
async function call(method, path, body) {
  let res;
  try {
    res = await fetch(CONFIG.CLOUD_URL + path, { method, headers: { authorization: "Bearer " + token(), ...(body ? { "content-type": "application/json" } : {}) }, body: body ? JSON.stringify(body) : undefined });
  } catch { throw new Error("The JoelToken ledger could not be reached. Nothing was charged."); }
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.message || (res.status === 401 ? "Your cloud login expired. Log in again." : "The JoelToken ledger had a problem. Nothing was charged."));
  return j;
}
export const getWallet = () => call("GET", "/api/joel");
// Save the account first so the server sees the Octeetokens you have now; afterwards take the server's copy back.
export async function unlockPro() { await push(true); const r = await call("POST", "/api/joel/unlock"); await pull(); return r; }
export async function buyJoelTokens(count) { await push(true); const r = await call("POST", "/api/joel/buy", { count }); await pull(); return r; }
// A flat-price answer (Joel-3.3 Pro, Joel-4.3 NEO): the cloud checks the price, the perks and the balance, and takes the JoelTokens.
export async function spendFlat(modelId) { const r = await call("POST", "/api/joel/spend", { model: modelId }); await pull(); return r; }
export { pull as syncAccount };

// ---- ask the model ----
export class ModelError extends Error { constructor(message, status = 0, wallet = null) { super(message); this.status = status; this.wallet = wallet; } }
export async function askModel(modelId, messages) {
  let res;
  try {
    res = await fetch(apiUrl(), { method: "POST", headers: { "Content-Type": "application/json", authorization: "Bearer " + token() }, body: JSON.stringify({ model: modelId, messages }) });
  } catch { probed = null; throw new ModelError("The model server could not be reached. Nothing was charged.", 0); }
  const data = await res.json().catch(() => ({}));
  if (res.status === 404) { probed = null; throw new ModelError("This site has no model server. Nothing was charged.", 404); }
  if (!res.ok) throw new ModelError(data.error || "The model could not answer right now. Nothing was charged.", res.status, data.wallet || null);
  await pull(); // the server already took the JoelTokens: bring the new balance into this browser
  return data;
}
