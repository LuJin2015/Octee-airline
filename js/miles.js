// Octmiles: tiers, rewards, history and the "Have a code?" box. All in this browser.
import { currentUser, updateUser } from "./auth.js";
import { fetchPublished } from "./published.js";
import { codeHash, normalizeCode } from "./crypto.js";
import { today } from "./dom.js";
import { load, save } from "./store.js";
import { proFree } from "./perks.js";
import { grantsFor, requestPermission } from "./permissions.js";

export const TIERS = [
  { name: "Economy Peanut", min: 0, perk: "One peanut." },
  { name: "Silver Wing", min: 500, perk: "Priority boarding for the wrong gate." },
  { name: "Gold Wing", min: 2000, perk: "Two peanuts (one is a photo of a peanut)." },
  { name: "Platinum Wing", min: 10000, perk: "The JOELMOBILE picks you up first. Probably." }
];
export const tierFor = (lifetime) => [...TIERS].reverse().find((t) => lifetime >= t.min);
export const nextTier = (lifetime) => TIERS.find((t) => t.min > lifetime) || null;

export const REWARDS = [
  { id: "second-peanut", name: "A second peanut", cost: 250, once: false, outOfStock: true, note: "Always out of stock." },
  { id: "joelmobile", name: "Priority JOELMOBILE pickup", cost: 300, once: false, note: "Still arrives late." },
  { id: "bag-tracking", name: "Bag tracking upgrade", cost: 500, once: false, note: "Your bag is now lost in HD." },
  { id: "window-seat", name: "Window seat", cost: 800, once: false, note: "Window not included." },
  { id: "engine-check", name: "Engine check before your flight", cost: 1500, once: true, note: "Shows a \"✔ Engines (probably) working\" badge." },
  { id: "name-gate", name: "Name a gate at FIA after yourself", cost: 5000, once: true, note: "Shown on the FIA terminal map (in your browser)." },
  { id: "cockpit-tour", name: "Cockpit tour", cost: 10000, once: true, note: "Cockpit may be closed for \"reasons\"." }
];

export function addMiles(u, amount, text) {
  u.octmiles += amount;
  u.lifetime += amount;
  u.history.unshift({ at: new Date().toISOString(), text, amount });
}

export function redeemReward(id) {
  const r = REWARDS.find((x) => x.id === id);
  return updateUser((u) => {
    if (!r) throw new Error("No such reward. Like our refunds.");
    if (r.outOfStock) throw new Error("Out of stock. It was always going to be.");
    if (r.once && u.redemptions.some((x) => x.id === id)) throw new Error("You already have this. Once was plenty.");
    if (u.octmiles < r.cost) throw new Error(`You need ${(r.cost - u.octmiles).toLocaleString("en-GB")} more Octmiles.`);
    u.octmiles -= r.cost;                       // lifetime stays the same, so the tier never drops
    u.redemptions.push({ id, at: new Date().toISOString() });
    u.history.unshift({ at: new Date().toISOString(), text: "Reward: " + r.name, amount: -r.cost });
    return r;
  });
}

// ----- Octeetokens -----
// Octmiles are exchanged for Octeetokens (one way). Tokens pay for the JOELMOBILE,
// class upgrades and one more code for today.
export const TOKEN_RATE = 10;                 // 10 Octmiles = 1 Octeetoken
export const CODES_PER_DAY = 5;               // codes one account can redeem per day
export const TOKEN_PRICES = { joelmobile: 5, extraCode: 20, spin: 10 };
export const tokensOf = (u) => (u && u.tokens) || 0;
export const fmtTokens = (n) => `${Number(n || 0).toLocaleString("en-GB")} Octeetoken${Number(n) === 1 ? "" : "s"}`;

// JoelAI Pro uses the provider's reported token usage. The JoelToken wallet follows
// the same browser-local account model as Octeetokens; it is a game currency, not cash.
export const JOEL_PRO_PRICE = 100;
export const JOEL_TOKEN_RATE = 2500; // JoelTokens bought per Octeetoken
export const JOEL_MONTHLY_GRANT = 10000;
export const JOEL_MIN_CALL_RESERVE = 1000;
export const joelUsageMonth = () => new Date().toISOString().slice(0, 7);
const paidJoelTokensOf = (u) => Math.max(0, Math.floor(Number(u?.joelPaidTokens ?? (u?.joelPro ? 0 : u?.joelTokens)) || 0));
export const joelTokensOf = (u) => {
  const paid = paidJoelTokensOf(u);
  if (!u?.joelPro) return paid;
  const used = u.joelMonthlyUsage?.month === joelUsageMonth() ? Math.max(0, Math.floor(Number(u.joelMonthlyUsage.usedTokens) || 0)) : 0;
  return paid + Math.max(0, JOEL_MONTHLY_GRANT - used);
};
export function buyJoelPro() {
  return updateUser((u) => {
    if (u.joelPro) return false;
    if (proFree(u)) u.history.unshift({ at: new Date().toISOString(), text: "Unlocked JoelAI Pro (free for this account)", amount: 0, tokens: 0 });
    else spendTokens(u, JOEL_PRO_PRICE, "Unlocked JoelAI Pro");
    u.joelPro = true;
    u.joelPaidTokens = paidJoelTokensOf(u);
    u.joelMonthlyUsage = { month: joelUsageMonth(), usedTokens: 0 };
    u.joelTokens = joelTokensOf(u);
    return true;
  });
}
export const GULLET_PRO_PRICE = 100;
// GulletAI Pro: unlocks Smart mode (TinyLlama in the browser). Free where the Control Tower says so.
export function buyGulletPro() {
  return updateUser((u) => {
    if (u.gulletPro) return false;
    if (proFree(u)) u.history.unshift({ at: new Date().toISOString(), text: "Unlocked GulletAI Pro (free for this account)", amount: 0, tokens: 0 });
    else spendTokens(u, GULLET_PRO_PRICE, "Unlocked GulletAI Pro");
    u.gulletPro = true;
    return true;
  });
}
export function buyJoelTokens(octeeTokens = 1) {
  const count = Math.floor(Number(octeeTokens));
  if (!Number.isSafeInteger(count) || count < 1) throw new Error("Choose at least 1 Octeetoken.");
  return updateUser((u) => {
    if (!u.joelPro) throw new Error("Unlock JoelAI Pro first.");
    if (tokensOf(u) < count) throw new Error(`You need ${count - tokensOf(u)} more Octeetoken${count - tokensOf(u) === 1 ? "" : "s"}.`);
    u.tokens = tokensOf(u) - count;
    u.joelPaidTokens = paidJoelTokensOf(u) + count * JOEL_TOKEN_RATE;
    u.joelTokens = joelTokensOf(u);
    u.history.unshift({ at: new Date().toISOString(), text: "Bought JoelTokens", amount: 0, tokens: -count, joelTokens: count * JOEL_TOKEN_RATE });
    return count * JOEL_TOKEN_RATE;
  });
}
export const fmtJoelTokens = (n) => `${Number(n || 0).toLocaleString("en-GB")} JoelToken${Number(n) === 1 ? "" : "s"}`;
export function recordJoelUsage(usage, modelName) {
  const total = Math.max(0, Math.floor(Number(usage?.totalTokens) || 0));
  if (!total) throw new Error("JoelAI did not report token usage, so no answer was charged.");
  return updateUser((u) => {
    if (!u.joelPro) throw new Error("Unlock JoelAI Pro first.");
    if (joelTokensOf(u) < total) throw new Error("That answer used more JoelTokens than you have. Buy more before asking again.");
    const month = joelUsageMonth();
    const usedThisMonth = u.joelMonthlyUsage?.month === month ? Math.max(0, Math.floor(Number(u.joelMonthlyUsage.usedTokens) || 0)) : 0;
    const monthlyLeft = Math.max(0, JOEL_MONTHLY_GRANT - usedThisMonth);
    const fromMonthly = Math.min(total, monthlyLeft);
    u.joelMonthlyUsage = { month, usedTokens: usedThisMonth + fromMonthly };
    u.joelPaidTokens = paidJoelTokensOf(u) - (total - fromMonthly);
    u.joelTokens = joelTokensOf(u);
    const old = u.joelUsage?.month === month ? u.joelUsage : { month, inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    u.joelUsage = {
      month,
      inputTokens: old.inputTokens + Math.max(0, Math.floor(Number(usage.inputTokens) || 0)),
      outputTokens: old.outputTokens + Math.max(0, Math.floor(Number(usage.outputTokens) || 0)),
      totalTokens: old.totalTokens + total
    };
    u.history.unshift({ at: new Date().toISOString(), text: `JoelAI Pro · ${modelName}`, amount: 0, tokens: 0, joelTokens: -total });
    return { totalTokens: total, balance: u.joelTokens, usage: u.joelUsage };
  });
}

// Use inside updateUser(): takes tokens off the account or throws a friendly error.
export function spendTokens(u, n, text) {
  if (tokensOf(u) < n) { const short = n - tokensOf(u); throw new Error(`You need ${short} more Octeetoken${short === 1 ? "" : "s"} (this costs ${n}). Exchange Octmiles on the Octmiles page.`); }
  u.tokens = tokensOf(u) - n;
  u.history.unshift({ at: new Date().toISOString(), text, amount: 0, tokens: -n });
}
export function exchangeMiles(tokens) {
  tokens = Math.floor(Number(tokens));
  if (!(tokens >= 1)) throw new Error("Choose at least 1 Octeetoken.");
  return updateUser((u) => {
    const cost = tokens * TOKEN_RATE;
    if (u.octmiles < cost) throw new Error(`That costs ${cost.toLocaleString("en-GB")} Octmiles. You have ${u.octmiles.toLocaleString("en-GB")}.`);
    u.octmiles -= cost;                         // lifetime stays the same, so the tier never drops
    u.tokens = tokensOf(u) + tokens;
    u.history.unshift({ at: new Date().toISOString(), text: "Exchanged Octmiles for Octeetokens", amount: -cost, tokens });
    return tokens;
  });
}
export const codesToday = (u) => ({ used: ((u && u.codeDays) || {})[today()] || 0, extra: ((u && u.codeExtra) || {})[today()] || 0 });
export const codesLeft = (u) => { const c = codesToday(u); return Math.max(0, CODES_PER_DAY + c.extra - c.used); };
export function buyExtraCode() {
  return updateUser((u) => {
    spendTokens(u, TOKEN_PRICES.extraCode, "One more code for today");
    u.codeExtra = { [today()]: codesToday(u).extra + 1 };
  });
}

// ----- Scraggymiles -----
// Earned on Scraggy Airlines flights. 1 Scraggymile turns into 2 Octmiles (one way).
export const SCRAGGY_RATE = 2;
export const scraggyOf = (u) => (u && u.scraggymiles) || 0;
export function addScraggymiles(u, amount, text) {
  u.scraggymiles = scraggyOf(u) + amount;
  u.history.unshift({ at: new Date().toISOString(), text, amount: 0, scraggy: amount });
}
// The pot shared with Scraggy Airlines. Both sites live at the same web address, so they read the same
// browser storage. Scraggymiles moved here show on BOTH sites; spending them on either site takes them
// off both; unspent, they stay on both. The pot belongs to the same username on the Scraggy site.
const SHARED_KEY = "scraggy.shared.points";
const sharedMap = () => load(SHARED_KEY, {}) || {};
export const sharedScraggy = (u) => { const n = Math.floor(Number(sharedMap()[String((u && u.username) || "").toLowerCase()]) || 0); return n > 0 ? n : 0; };
const setShared = (u, n) => { const m = sharedMap(); m[u.username.toLowerCase()] = Math.max(0, Math.floor(n)); save(SHARED_KEY, m); };
export function transferScraggymiles(n) {
  n = Math.floor(Number(n));
  if (!(n >= 1)) throw new Error("Choose at least 1 Scraggymile.");
  return updateUser((u) => {
    if (scraggyOf(u) < n) throw new Error(`You only have ${scraggyOf(u).toLocaleString("en-GB")} Scraggymiles on Octee.`);
    u.scraggymiles = scraggyOf(u) - n;
    setShared(u, sharedScraggy(u) + n);
    u.history.unshift({ at: new Date().toISOString(), text: "Shared with Scraggy Airlines (now usable on both airlines)", amount: 0, scraggy: -n });
    return n;
  });
}
export function exchangeScraggymiles(n) {
  n = Math.floor(Number(n));
  if (!(n >= 1)) throw new Error("Choose at least 1 Scraggymile.");
  return updateUser((u) => {
    const own = scraggyOf(u), shared = sharedScraggy(u);
    if (own + shared < n) throw new Error(`You only have ${(own + shared).toLocaleString("en-GB")} Scraggymiles.`);
    const fromOwn = Math.min(own, n), fromShared = n - fromOwn;      // Octee-only miles first, then the shared pot
    u.scraggymiles = own - fromOwn;
    if (fromShared) setShared(u, shared - fromShared);
    const miles = n * SCRAGGY_RATE;
    u.octmiles += miles; u.lifetime += miles;
    u.history.unshift({ at: new Date().toISOString(), text: "Exchanged Scraggymiles for Octmiles" + (fromShared ? ` (${fromShared} from the pot shared with Scraggy Airlines)` : ""), amount: miles, scraggy: -n });
    return miles;
  });
}

// ----- Codes -----
export const CODE_MESSAGES = {
  ok: (n) => `+${n.toLocaleString("en-GB")} Octmiles! Please don't spend them all on one peanut.`,
  not_real: "That code is not real. Like our on-time record.",
  already: "You already used this code. Nice try.",
  expired: "This code has expired. Like your boarding pass.",
  grounded: "This code has been grounded.",
  limit: `You have used all your codes for today (${CODES_PER_DAY} a day). Come back tomorrow, or get one more for ${TOKEN_PRICES.extraCode} Octeetokens on the Octmiles page.`,
  permission: (n) => `You have used this code ${n} times since reaching the top tier. A message has been sent to the control tower. An admin or the owner must give permission before it works again.`,
  too_many: "Too many wrong codes. Please wait an hour and think about what you've done.",
  login: "Log in to use a code.",
  offline: "The code list is delayed. Please try again (or check you're online)."
};

let codesCache = null;
export async function loadCodes() {
  if (codesCache) return codesCache;
  const json = await fetchPublished("codes", "data/codes.json", null);
  if (!json) throw new Error("offline");
  codesCache = Array.isArray(json.codes) ? json.codes : [];
  return codesCache;
}

export async function redeemCode(input) {
  const u = currentUser();
  if (!u) return { ok: false, message: CODE_MESSAGES.login };
  const hourAgo = Date.now() - 3600_000;
  if ((u.codeFails || []).filter((t) => t > hourAgo).length >= 10) return { ok: false, message: CODE_MESSAGES.too_many };
  let codes;
  try { codes = await loadCodes(); } catch { return { ok: false, message: CODE_MESSAGES.offline }; }
  const hash = await codeHash(input);
  let c = codes.find((x) => x.hash === hash);
  // Number rule: any 5 digits that start with 1 or 2 and end in an odd digit
  // are worth their first three digits (23487 -> 234 Octmiles). Listed codes win.
  const digits = normalizeCode(input);
  if (!c && /^[12]\d{3}[13579]$/.test(digits)) c = { octmiles: Number(digits.slice(0, 3)), active: true, expires: null };
  // Special codes (set in data/codes.json): "noLimit" codes do not use up one of the 5 daily codes,
  // "repeat" codes can be used again and again on the same account.
  if (!(c && c.noLimit) && codesLeft(u) <= 0) return { ok: false, message: CODE_MESSAGES.limit };
  let problem = null;
  if (!normalizeCode(input) || !c) problem = "not_real";
  else if (c.active === false) problem = "grounded";
  else if (c.expires && new Date(c.expires + "T23:59:59") < new Date()) problem = "expired";
  else if (!c.repeat && u.codesUsed && u.codesUsed[hash]) problem = "already";
  if (problem) {
    updateUser((x) => { x.codeFails = [...(x.codeFails || []).filter((t) => t > hourAgo), Date.now()]; });
    return { ok: false, message: CODE_MESSAGES[problem] };
  }
  // "atTopTier": what the code gives instead when the account is already in the highest tier.
  const top = c.atTopTier && !nextTier(u.lifetime) ? c.atTopTier : null;
  // "freeTopUses": how many times the top-tier bonus works by itself. After that, each further use needs
  // permission from the control tower (one grant = one more use).
  const topUses = ((u.repeatUses || {})[hash]) || 0;
  if (top && c.freeTopUses != null && topUses >= c.freeTopUses + (await grantsFor(u.username))) {
    requestPermission(u.username, "Crew code: one more use");
    return { ok: false, needsPermission: true, message: CODE_MESSAGES.permission(topUses) };
  }
  const miles = top ? top.octmiles || 0 : c.octmiles, tokens = top ? top.tokens || 0 : 0;
  updateUser((x) => {
    x.codesUsed = x.codesUsed || {};
    x.codesUsed[hash] = new Date().toISOString();
    if (!c.noLimit) x.codeDays = { [today()]: codesToday(x).used + 1 };   // only successful codes count towards the daily limit
    addMiles(x, miles, "Code " + normalizeCode(input));
    if (tokens) { x.tokens = tokensOf(x) + tokens; x.history[0].tokens = tokens; }
    if (top) x.repeatUses = { ...(x.repeatUses || {}), [hash]: topUses + 1 };
  });
  return { ok: true, message: CODE_MESSAGES.ok(miles) + (tokens ? ` And +${tokens} Octeetokens.` : ""), amount: miles, tokens };
}
