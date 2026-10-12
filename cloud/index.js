// Octee Cloud: accounts and one saved profile (JSON) per user, on Cloudflare Workers + D1.
// Passwords are hashed with PBKDF2; session tokens are stored hashed. This is a parody airline: do not reuse real passwords.
const ORIGINS = ["https://zengyixin0205.github.io", "http://localhost:8765", "http://127.0.0.1:8765"];
const MAX_PROFILE = 300 * 1024;          // bytes of JSON per user
const SESSION_MS = 30 * 24 * 3600 * 1000; // 30 days
const ETCHED_URL = "https://zengyixin0205.github.io/Octee-airline/data/accounts.json";
// JoelAI Pro ledger (the browser copies these numbers in js/miles.js; the server is the one that counts).
const JOEL = { price: 100, rate: 2500, grant: 10000, minReserve: 1000, maxCharge: 20000, maxBuy: 50 };
const enc = new TextEncoder();
const iso = () => new Date().toISOString();

const cors = (req) => {
  const o = req.headers.get("origin");
  const h = { "access-control-allow-headers": "content-type, authorization", "access-control-allow-methods": "GET, POST, PUT, DELETE, OPTIONS", "access-control-max-age": "600", vary: "origin" };
  if (o && ORIGINS.includes(o)) h["access-control-allow-origin"] = o;
  return h;
};
const reply = (req, data, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors(req), "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const hex = (buf) => [...new Uint8Array(buf)].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (v) => hex(await crypto.subtle.digest("SHA-256", enc.encode(v)));
async function derive(password, salt) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256));
}
const hashPassword = async (p) => { const salt = crypto.randomUUID(); return salt + "$" + (await derive(p, salt)); };
const checkPassword = async (p, stored) => { const [salt, h] = String(stored).split("$"); if (!salt || !h) return false; const a = await derive(p, salt); return a.length === h.length && a === h; };
const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));

// Accounts etched in the website's code (data/accounts.json, public). Cached for 5 minutes.
let etchedMemo = { at: 0, list: [] };
async function etchedList(env) {
  if (Date.now() - etchedMemo.at < 300000) return etchedMemo.list;
  try {
    // the copy saved from the Control Tower comes first; the file on GitHub Pages is the fallback
    const row = await env.DB.prepare("SELECT body FROM published WHERE name='accounts'").first().catch(() => null);
    let j = null;
    if (row) { try { j = JSON.parse(row.body); } catch { j = null; } }
    if (!j) { const r = await fetch(env.ETCHED_URL || ETCHED_URL, { cf: { cacheTtl: 60 } }); j = r.ok ? await r.json() : null; }
    if (j && Array.isArray(j.accounts)) etchedMemo = { at: Date.now(), list: j.accounts.filter((a) => a && a.username && a.hash).map((a) => ({ key: String(a.username).toLowerCase(), name: String(a.username), hash: String(a.hash), rec: a })) };
  } catch { /* keep the old list */ }
  return etchedMemo.list;
}
// Files the Control Tower publishes (instead of downloading them and committing to GitHub). Anyone may read; only a Control Tower owner or admin may write.
const DATA_NAMES = { codes: (d) => Array.isArray(d.codes), accounts: (d) => Array.isArray(d.accounts), permissions: (d) => d.crew && typeof d.crew === "object" && !Array.isArray(d.crew), "control-tower": (d) => "owner" in d && Array.isArray(d.admins), "flight-discounts": (d) => Array.isArray(d.discounts), perks: (d) => d.unlimitedFujitech && typeof d.unlimitedFujitech === "object" && !Array.isArray(d.unlimitedFujitech) };
const MAX_DATA = 400 * 1024;
// Account perks the Control Tower publishes ("perks"). Until a setting is saved there, these defaults apply.
const DEFAULT_PERKS = { freePro: { octee: true, joel: true }, freeModels: { octee: true, joel: true } };
async function perkOn(db, key, username) {
  const row = await db.prepare("SELECT body FROM published WHERE name='perks'").first().catch(() => null);
  let j = null; try { j = row ? JSON.parse(row.body) : null; } catch { j = null; }
  const list = j && j[key] && typeof j[key] === "object" ? j[key] : DEFAULT_PERKS[key];
  return !!list && list[String(username).toLowerCase()] === true;
}
// Joel models with a flat JoelToken price (they report no token usage). Mirrors js/joel-models.js.
const FLAT = { "joel-3.3pro": { price: 150, name: "Joel-3.3 Pro" }, "joel-4.3neo": { price: 400, name: "Joel-4.3 NEO" } };
const clip = (v, n) => String(v ?? "").slice(0, n);


// ---- Octmiles, Octeetokens, Fujitech and Scraggymiles: the cloud keeps the balances (table `balances`) ----
// The browser still works the numbers out locally and writes a history line for each change. When it saves the account, the cloud
// checks the change against those new history lines: spending is always accepted (never below zero), but a credit is only accepted
// when a rule explains it (an exchange at the real rate, a code that really exists, a booking that really is in the account, ...).
// Anything else is dropped, and the cloud's balance is sent back and replaces the browser's copy.
const WALLET = { tokenRate: 10, fujiMiles: 50, fujiTenths: 55, scraggyRate: 2, topTier: 10000, welcome: 100,
  bookEntry: 2800, bookDay: 3000, scraggyEntry: 2000, scraggyDay: 3000, rideMiles: 20, rideDay: 200, reviewMiles: 30, potDay: 300 };
const wint = (v) => Math.max(0, Math.floor(Number(v) || 0));
const balFromProfile = (p) => ({ octmiles: wint(p?.octmiles), lifetime: wint(p?.lifetime), tokens: wint(p?.tokens), fujitech: wint(p?.fujitechTenths), scraggy: wint(p?.scraggymiles) });
const balanceFields = (b) => ({ octmiles: b.octmiles, lifetime: b.lifetime, tokens: b.tokens, fujitechTenths: b.fujitech, scraggymiles: b.scraggy });
async function getBalances(db, env, u) {
  const row = await db.prepare("SELECT * FROM balances WHERE user_id=?").bind(u.id).first();
  if (row) { let st = {}; try { st = JSON.parse(row.state || "{}"); } catch { st = {}; } return { user_id: u.id, octmiles: row.octmiles, lifetime: row.lifetime, tokens: row.tokens, fujitech: row.fujitech, scraggy: row.scraggy, state: { codes: {}, uses: {}, review: false, days: {}, ...st } }; }
  // first time: start from what the account already has saved in the cloud, an etched account's own record, or the welcome bonus
  const p = await db.prepare("SELECT body FROM profiles WHERE user_id=?").bind(u.id).first();
  let prof = null; try { prof = p ? JSON.parse(p.body) : null; } catch { prof = null; }
  const e = prof ? null : (await etchedList(env)).find((x) => x.key === u.username_key || x.key === String(u.username).toLowerCase());
  const seed = prof ? balFromProfile(prof) : e ? balFromProfile(e.rec) : { octmiles: WALLET.welcome, lifetime: WALLET.welcome, tokens: 0, fujitech: 0, scraggy: 0 };
  const src = prof || (e && e.rec) || {};
  const codes = {}; for (const h of Object.keys(src.codesUsed || {})) codes[h] = true;
  const uses = {}; for (const [h, n] of Object.entries(src.repeatUses || {})) uses[h] = wint(n);
  return { user_id: u.id, ...seed, state: { codes, uses, review: !!src.reviewBonus, days: {} } };
}
const saveBalances = (db, b) => db.prepare("INSERT INTO balances(user_id,octmiles,lifetime,tokens,fujitech,scraggy,state,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET octmiles=?, lifetime=?, tokens=?, fujitech=?, scraggy=?, state=?, updated_at=?")
  .bind(b.user_id, b.octmiles, b.lifetime, b.tokens, b.fujitech, b.scraggy, JSON.stringify(b.state), iso(), b.octmiles, b.lifetime, b.tokens, b.fujitech, b.scraggy, JSON.stringify(b.state), iso());
// Control Tower files (codes, permissions): the saved copy first, the file on GitHub Pages as the fallback. Cached for a minute.
const dataMemo = {};
async function publishedData(env, db, name) {
  const m = dataMemo[name];
  if (m && Date.now() - m.at < 60000) return m.value;
  let value = null;
  const row = await db.prepare("SELECT body FROM published WHERE name=?").bind(name).first().catch(() => null);
  if (row) { try { value = JSON.parse(row.body); } catch { value = null; } }
  if (!value) { try { const r = await fetch((env.DATA_BASE || ETCHED_URL.replace(/accounts\.json$/, "")) + name + ".json", { cf: { cacheTtl: 60 } }); value = r.ok ? await r.json() : null; } catch { value = null; } }
  dataMemo[name] = { at: Date.now(), value };
  return value;
}
const histKey = (e) => JSON.stringify([e && e.at, e && e.text, wint2(e?.amount), wint2(e?.tokens), wint2(e?.fujitechTenths), wint2(e?.scraggy)]);
const wint2 = (v) => Math.trunc(Number(v) || 0);
// Check the new history lines of a saved account against the cloud's balance. Returns the cloud's balance after them.
async function applyWallet(env, db, u, bal, prevProf, nextProf) {
  const b = { ...bal, state: { ...bal.state, codes: { ...bal.state.codes }, uses: { ...bal.state.uses }, days: { ...bal.state.days } } };
  const seen = new Map();
  for (const e of (prevProf && Array.isArray(prevProf.history)) ? prevProf.history : []) seen.set(histKey(e), (seen.get(histKey(e)) || 0) + 1);
  const fresh = [];
  const hist = Array.isArray(nextProf.history) ? nextProf.history : [];
  for (let i = hist.length - 1; i >= 0; i--) { const k = histKey(hist[i]); if (seen.get(k) > 0) seen.set(k, seen.get(k) - 1); else if (prevProf) fresh.push(hist[i]); } // oldest first; the very first save only sets the balance
  const day = iso().slice(0, 10);
  const today = (b.state.days[day] = { book: 0, scraggy: 0, ride: 0, pot: 0, ...(b.state.days[day] || {}) });
  for (const k of Object.keys(b.state.days)) if (k < day) delete b.state.days[k];
  const prevRefs = new Set(((prevProf && prevProf.trips) || []).map((t) => t && t.ref));
  const trips = Array.isArray(nextProf.trips) ? nextProf.trips : [];
  const moveOut = (dM, dT, dF, dS) => { b.octmiles = Math.max(0, b.octmiles + Math.min(0, dM)); b.tokens = Math.max(0, b.tokens + Math.min(0, dT)); b.fujitech = Math.max(0, b.fujitech + Math.min(0, dF)); b.scraggy = Math.max(0, b.scraggy + Math.min(0, dS)); };
  const credit = (dM, dT, dF, dS, life) => { b.octmiles += dM; b.tokens += dT; b.fujitech += dF; b.scraggy += dS; if (life) b.lifetime += dM; };
  let codes = null, perms = null;
  for (const e of fresh) {
    const text = String(e.text || ""), dM = wint2(e.amount), dT = wint2(e.tokens), dF = wint2(e.fujitechTenths), dS = wint2(e.scraggy);
    if (/^Welcome bonus/.test(text)) continue;
    if (dM <= 0 && dT <= 0 && dF <= 0 && dS <= 0) { moveOut(dM, dT, dF, dS); continue; }          // spending
    if (text === "Exchanged Octmiles for Octeetokens") {
      if (dM < 0 && dT > 0 && !dF && !dS && -dM === dT * WALLET.tokenRate && b.octmiles >= -dM) { b.octmiles += dM; b.tokens += dT; }
    } else if (text === "Exchanged Octmiles for Fujitech") {
      if (dM < 0 && dF > 0 && !dT && !dS && -dM % WALLET.fujiMiles === 0 && dF === (-dM / WALLET.fujiMiles) * WALLET.fujiTenths && b.octmiles >= -dM) { b.octmiles += dM; b.fujitech += dF; }
    } else if (/^Exchanged Scraggymiles for Octmiles/.test(text)) {
      if (dS < 0 && dM === -dS * WALLET.scraggyRate && !dT && !dF) {
        const short = Math.max(0, -dS - b.scraggy);                                                 // the part that came from the pot shared with Scraggy Airlines
        if (short <= WALLET.potDay - today.pot) { today.pot += short; b.scraggy = Math.max(0, b.scraggy + dS); credit(dM, 0, 0, 0, true); }
      }
    } else if (/^Booking SCRAG-/.test(text)) {
      const ref = (text.match(/^Booking (SCRAG-\d+)/) || [])[1], t = trips.find((x) => x && x.scraggyRef === ref);
      if (dS > 0 && !dM && t && !prevRefs.has(t.ref) && dS <= WALLET.scraggyEntry && today.scraggy + dS <= WALLET.scraggyDay) { today.scraggy += dS; credit(0, 0, 0, dS, false); }
    } else if (/^Booking OCT-/.test(text)) {
      const ref = (text.match(/^Booking (OCT-\d+)/) || [])[1], t = trips.find((x) => x && x.ref === ref);
      if (dM > 0 && !dT && !dF && !dS && t && !prevRefs.has(t.ref) && dM <= WALLET.bookEntry && today.book + dM <= WALLET.bookDay) { today.book += dM; credit(dM, 0, 0, 0, true); }
    } else if (/^Code \S+$/.test(text)) {
      const hash = await sha("octee-code:" + text.slice(5).toUpperCase().replace(/\s+/g, ""));
      codes = codes || ((await publishedData(env, db, "codes")) || {}).codes || [];
      const digits = text.slice(5).toUpperCase().replace(/[^0-9]/g, "");
      let c = codes.find((x) => x && x.hash === hash);
      if (!c && /^[12]\d{3}[13579]$/.test(text.slice(5)) ) c = { octmiles: Number(digits.slice(0, 3)), active: true };
      if (!c || c.active === false || (c.expires && new Date(c.expires + "T23:59:59") < new Date())) continue;
      if (!c.repeat && b.state.codes[hash]) continue;
      const top = c.atTopTier && b.lifetime >= WALLET.topTier ? c.atTopTier : null;
      if (top && c.freeTopUses != null) {
        perms = perms || ((await publishedData(env, db, "permissions")) || {}).crew || {};
        if ((b.state.uses[hash] || 0) >= c.freeTopUses + wint(perms[String(u.username).toLowerCase()])) continue;
        b.state.uses[hash] = (b.state.uses[hash] || 0) + 1;
      }
      const wantM = top ? wint(top.octmiles) : wint(c.octmiles), wantT = top ? wint(top.tokens) : 0;
      if (dM !== wantM || dT !== wantT || dF || dS) continue;
      b.state.codes[hash] = true;
      credit(dM, dT, 0, 0, true);
    } else if (text === "JOELMOBILE ride (you were helped)") {
      if (dM === WALLET.rideMiles && !dT && !dF && !dS && today.ride + dM <= WALLET.rideDay) { today.ride += dM; credit(dM, 0, 0, 0, true); }
    } else if (text === "First review") {
      if (dM === WALLET.reviewMiles && !dT && !dF && !dS && !b.state.review) { b.state.review = true; credit(dM, 0, 0, 0, true); }
    } else moveOut(Math.min(0, dM), Math.min(0, dT), Math.min(0, dF), Math.min(0, dS));         // anything else may only take away
  }
  return b;
}
async function profileView(db, env, u, body) {
  const prof = JSON.parse(body);
  return { ...prof, ...balanceFields(await getBalances(db, env, u)), ...joelFields(await wallet(db, u.id)) };
}

// ---- JoelAI Pro wallet: Pro flag, purchased JoelTokens, this month's use. Lives on the server only. ----
const monthNow = () => new Date().toISOString().slice(0, 7);
async function wallet(db, userId) {
  const w = (await db.prepare("SELECT * FROM joel_wallet WHERE user_id=?").bind(userId).first()) || { user_id: userId, pro: 0, paid: 0, month: monthNow(), used: 0, in_t: 0, out_t: 0, total_t: 0 };
  if (w.month !== monthNow()) Object.assign(w, { month: monthNow(), used: 0, in_t: 0, out_t: 0, total_t: 0 }); // the monthly grant refreshes
  return w;
}
const monthlyLeft = (w) => (w.pro ? Math.max(0, JOEL.grant - w.used) : 0);
const balanceOf = (w) => w.paid + monthlyLeft(w);
function walletView(w) {
  const [y, m] = w.month.split("-").map(Number);
  return { pro: !!w.pro, balance: balanceOf(w), paid: w.paid, monthlyLeft: monthlyLeft(w), grant: JOEL.grant, month: w.month, resetsAt: new Date(Date.UTC(y, m, 1)).toISOString(),
    usage: { month: w.month, inputTokens: w.in_t, outputTokens: w.out_t, totalTokens: w.total_t, fromMonthly: w.used }, price: JOEL.price, rate: JOEL.rate, minReserve: JOEL.minReserve };
}
// The same numbers written into the saved profile, so the site shows what the server says (a browser edit is overwritten).
const joelFields = (w) => ({ joelPro: !!w.pro, joelPaidTokens: w.paid, joelMonthlyUsage: { month: w.month, usedTokens: w.used }, joelUsage: { month: w.month, inputTokens: w.in_t, outputTokens: w.out_t, totalTokens: w.total_t }, joelTokens: balanceOf(w) });
const saveWallet = (db, w) => db.prepare("INSERT INTO joel_wallet(user_id,pro,paid,month,used,in_t,out_t,total_t) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET pro=?, paid=?, month=?, used=?, in_t=?, out_t=?, total_t=?")
  .bind(w.user_id, w.pro ? 1 : 0, w.paid, w.month, w.used, w.in_t, w.out_t, w.total_t, w.pro ? 1 : 0, w.paid, w.month, w.used, w.in_t, w.out_t, w.total_t);
const ledgerRow = (db, userId, kind, octee, joel, model = "", inT = 0, outT = 0) => db.prepare("INSERT INTO joel_ledger(user_id,at,kind,octee,joel,model,in_t,out_t) VALUES(?,?,?,?,?,?,?,?)").bind(userId, iso(), kind, octee, joel, model, inT, outT);
async function profileWithJoel(db, userId, body) {
  const prof = JSON.parse(body);
  return { ...prof, ...joelFields(await wallet(db, userId)) };
}

async function limited(db, key) {
  const r = await db.prepare("SELECT n, until FROM attempts WHERE k=?").bind(key).first();
  return r && r.until > Date.now() ? Math.ceil((r.until - Date.now()) / 1000) : 0;
}
async function fail(db, key) {
  const r = await db.prepare("SELECT n FROM attempts WHERE k=?").bind(key).first();
  const n = (r?.n || 0) + 1, until = n >= 5 ? Date.now() + 5 * 60 * 1000 : 0;
  await db.prepare("INSERT INTO attempts(k,n,until) VALUES(?,?,?) ON CONFLICT(k) DO UPDATE SET n=?, until=?").bind(key, n >= 5 ? 0 : n, until, n >= 5 ? 0 : n, until).run();
}
const clear = (db, key) => db.prepare("DELETE FROM attempts WHERE k=?").bind(key).run();

async function userFrom(db, req) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!t) return null;
  return db.prepare("SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at>?").bind(await sha(t), iso()).first();
}
async function newSession(db, userId) {
  const t = token();
  await db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)").bind(await sha(t), userId, new Date(Date.now() + SESSION_MS).toISOString()).run();
  await db.prepare("DELETE FROM sessions WHERE expires_at<?").bind(iso()).run();
  return t;
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    const url = new URL(req.url), path = url.pathname.replace(/\/+$/, "") || "/";
    const db = env.DB;
    try {
      if (path === "/") return reply(req, { ok: true, service: "octee-cloud" });
      const u = await userFrom(db, req);
      const isCloudOwner = !!u && !!env.CONTROL_TOWER_OWNER_USERNAME && u.username.toLowerCase() === String(env.CONTROL_TOWER_OWNER_USERNAME).toLowerCase();
      const adminRole = async () => {
        if (!u) return null;
        if (isCloudOwner) return "owner";
        return (await db.prepare("SELECT user_id FROM cloud_admins WHERE user_id=?").bind(u.id).first()) ? "admin" : null;
      };
      if (path.startsWith("/api/admin/")) {
        const role = await adminRole();
        if (!role) return reply(req, { error: u ? "forbidden" : "login" }, u ? 403 : 401);
        if (path === "/api/admin/me" && req.method === "GET") return reply(req, { role, username: u.username });
        if (path === "/api/admin/users" && req.method === "GET") {
          const rows = await db.prepare("SELECT id, username, created_at FROM users ORDER BY created_at DESC LIMIT 500").all();
          return reply(req, { users: (rows.results || []).map((x) => ({ username: x.username, createdAt: x.created_at })) });
        }
        if ((path === "/api/admin/admins" || path.startsWith("/api/admin/admins/")) && role !== "owner") return reply(req, { error: "owner_only" }, 403);
        if (path === "/api/admin/admins" && req.method === "GET") {
          const rows = await db.prepare("SELECT users.username, cloud_admins.granted_at FROM cloud_admins JOIN users ON users.id=cloud_admins.user_id ORDER BY users.username").all();
          return reply(req, { admins: rows.results || [] });
        }
        if (path === "/api/admin/admins" && req.method === "POST") {
          const b = await req.json().catch(() => ({})), username = clip(b.username, 20).trim();
          const target = await db.prepare("SELECT id FROM users WHERE username_key=?").bind(username.toLowerCase()).first();
          if (!target) return reply(req, { error: "no_user", message: "That Cloud account does not exist." }, 404);
          if (target.id === u.id) return reply(req, { error: "owner" }, 400);
          await db.prepare("INSERT INTO cloud_admins(user_id,granted_by,granted_at) VALUES(?,?,?) ON CONFLICT(user_id) DO NOTHING").bind(target.id, u.id, iso()).run();
          return reply(req, { ok: true });
        }
        const demote = path.match(/^\/api\/admin\/admins\/([^/]+)$/);
        if (demote && req.method === "DELETE") {
          const username = decodeURIComponent(demote[1]);
          await db.prepare("DELETE FROM cloud_admins WHERE user_id=(SELECT id FROM users WHERE username_key=?)").bind(username.toLowerCase()).run();
          return reply(req, { ok: true });
        }
        return reply(req, { error: "not_found" }, 404);
      }
      // An etched account (in the code) joins the cloud the first time its owner logs in. The browser has already checked the
      // password against the etched hash; the cloud checks that the name really is etched, and that nobody has claimed it yet.
      if (req.method === "POST" && path === "/api/claim") {
        const b = await req.json().catch(() => ({}));
        const username = String(b.username || "").trim(), password = String(b.password || ""), key = username.toLowerCase();
        const ip = req.headers.get("cf-connecting-ip") || "x";
        const e = (await etchedList(env)).find((x) => x.key === key);
        if (!e || e.hash !== String(b.proof || "")) return reply(req, { error: "bad_login" }, 401);
        if (password.length < 8 || password.length > 200) return reply(req, { error: "bad_password" }, 400);
        const rl = await limited(db, "reg:" + ip); if (rl) return reply(req, { error: "wait", seconds: rl }, 429);
        if (await db.prepare("SELECT id FROM users WHERE username_key=?").bind(key).first()) return reply(req, { error: "bad_login" }, 401);
        await fail(db, "reg:" + ip);
        const r = await db.prepare("INSERT INTO users(username,username_key,password_hash,created_at) VALUES(?,?,?,?)").bind(e.name, key, await hashPassword(password), iso()).run();
        return reply(req, { ok: true, username: e.name, token: await newSession(db, r.meta.last_row_id), profile: null, updatedAt: null }, 201);
      }
      // ---- JoelAI Pro: unlock, buy JoelTokens, read the wallet. Octeetokens are taken from the saved profile. ----
      if (path === "/api/joel" && req.method === "GET") {
        if (!u) return reply(req, { error: "login", message: "Log in to the cloud to see your JoelTokens." }, 401);
        const w = await wallet(db, u.id);
        const rows = await db.prepare("SELECT at, kind, octee, joel, model, in_t, out_t FROM joel_ledger WHERE user_id=? ORDER BY id DESC LIMIT 20").bind(u.id).all();
        return reply(req, { ...walletView(w), ledger: rows.results || [] });
      }
      if (path === "/api/joel/unlock" || path === "/api/joel/buy") {
        if (req.method !== "POST") return reply(req, { error: "not_found" }, 404);
        if (!u) return reply(req, { error: "login", message: "Log in to the cloud first." }, 401);
        const b = await req.json().catch(() => ({}));
        const w = await wallet(db, u.id), buying = path === "/api/joel/buy";
        const count = buying ? Math.floor(Number(b.count)) : 1;
        if (buying && !(count >= 1 && count <= JOEL.maxBuy)) return reply(req, { error: "bad_count", message: `Choose 1 to ${JOEL.maxBuy} Octeetokens.` }, 400);
        if (buying && !w.pro) return reply(req, { error: "not_pro", message: "Unlock JoelAI Pro first." }, 409);
        if (!buying && w.pro) return reply(req, { error: "already", message: "JoelAI Pro is already unlocked." }, 409);
        const free = !buying && (await perkOn(db, "freePro", u.username));
        const cost = buying ? count : free ? 0 : JOEL.price;
        const p = await db.prepare("SELECT body, updated_at FROM profiles WHERE user_id=?").bind(u.id).first();
        if (!p) return reply(req, { error: "no_profile", message: "Your account has not been saved to the cloud yet. Try again in a moment." }, 409);
        const prof = JSON.parse(p.body), bal = await getBalances(db, env, u), have = bal.tokens;
        if (have < cost) return reply(req, { error: "short", message: `You need ${cost - have} more Octeetoken${cost - have === 1 ? "" : "s"} (this costs ${cost}). Nothing was charged.` }, 402);
        if (buying) w.paid += count * JOEL.rate; else { w.pro = 1; w.month = monthNow(); w.used = 0; }
        const at = iso();
        const next = { ...prof, ...balanceFields({ ...bal, tokens: have - cost }), ...joelFields(w), history: [{ at, text: buying ? "Bought JoelTokens" : "Unlocked JoelAI Pro", amount: 0, tokens: -cost, ...(buying ? { joelTokens: count * JOEL.rate } : {}) }, ...(Array.isArray(prof.history) ? prof.history : [])].slice(0, 60) };
        // compare-and-set on updated_at, so two devices cannot spend the same Octeetokens twice
        const done = await db.prepare("UPDATE profiles SET body=?, updated_at=? WHERE user_id=? AND updated_at=?").bind(JSON.stringify(next), at, u.id, p.updated_at).run();
        if (!done.meta?.changes) return reply(req, { error: "busy", message: "Your account changed at the same moment. Nothing was charged. Please try again." }, 409);
        await db.batch([saveWallet(db, w), saveBalances(db, { ...bal, tokens: have - cost }), ledgerRow(db, u.id, buying ? "buy" : "unlock", -cost, buying ? count * JOEL.rate : 0)]);
        return reply(req, { ok: true, ...walletView(w), tokens: have - cost, updatedAt: at });
      }
      // A flat-price answer (Joel-3.3 Pro, Joel-4.3 NEO). The price, the free list and the balance are all decided here.
      if (path === "/api/joel/spend" && req.method === "POST") {
        if (!u) return reply(req, { error: "login", message: "Log in to the cloud first." }, 401);
        const b = await req.json().catch(() => ({})), m = Object.hasOwn(FLAT, b.model) ? FLAT[b.model] : null;
        if (!m) return reply(req, { error: "bad_model", message: "That model has no flat price." }, 400);
        const w = await wallet(db, u.id);
        if (!w.pro) return reply(req, { error: "not_pro", message: "Unlock JoelAI Pro first." }, 409);
        if (await perkOn(db, "freeModels", u.username)) return reply(req, { ok: true, charged: 0, free: true, ...walletView(w) });
        if (balanceOf(w) < m.price) return reply(req, { error: "short", message: `${m.name} needs ${m.price} JoelTokens. Nothing was charged.` }, 402);
        const fromMonthly = Math.min(m.price, monthlyLeft(w)), fromPaid = m.price - fromMonthly;
        w.used += fromMonthly; w.paid -= fromPaid;
        const p = await db.prepare("SELECT body FROM profiles WHERE user_id=?").bind(u.id).first();
        const at = iso(), stmts = [saveWallet(db, w), ledgerRow(db, u.id, "use", 0, -m.price, clip(b.model, 40))];
        if (p) {
          const prof = JSON.parse(p.body);
          const next = { ...prof, ...joelFields(w), history: [{ at, text: `JoelAI Pro · ${m.name}`, amount: 0, tokens: 0, joelTokens: -m.price }, ...(Array.isArray(prof.history) ? prof.history : [])].slice(0, 60) };
          stmts.push(db.prepare("UPDATE profiles SET body=?, updated_at=? WHERE user_id=?").bind(JSON.stringify(next), at, u.id));
        }
        await db.batch(stmts);
        return reply(req, { ok: true, charged: m.price, ...walletView(w) });
      }
      // The model server (Vercel) reports what a finished answer used. Needs the shared secret, so a browser cannot call it.
      if (path === "/api/joel/charge" && req.method === "POST") {
        if (!env.JOEL_LEDGER_SECRET || req.headers.get("x-ledger-secret") !== env.JOEL_LEDGER_SECRET) return reply(req, { error: "forbidden" }, 403);
        if (!u) return reply(req, { error: "login", message: "Log in to the cloud first." }, 401);
        const b = await req.json().catch(() => ({}));
        const inT = Math.max(0, Math.floor(Number(b.usage?.inputTokens) || 0)), outT = Math.max(0, Math.floor(Number(b.usage?.outputTokens) || 0));
        const total = Math.min(JOEL.maxCharge, Math.max(0, Math.floor(Number(b.usage?.totalTokens) || inT + outT)));
        if (!total) return reply(req, { error: "no_usage", message: "The model did not report token usage, so nothing was charged." }, 400);
        const w = await wallet(db, u.id);
        if (!w.pro) return reply(req, { error: "not_pro", message: "Unlock JoelAI Pro first." }, 409);
        const fromMonthly = Math.min(total, monthlyLeft(w)), fromPaid = Math.min(w.paid, total - fromMonthly);
        w.used += fromMonthly; w.paid -= fromPaid; w.in_t += inT; w.out_t += outT; w.total_t += total;
        const p = await db.prepare("SELECT body FROM profiles WHERE user_id=?").bind(u.id).first();
        const at = iso(), stmts = [saveWallet(db, w), ledgerRow(db, u.id, "use", 0, -(fromMonthly + fromPaid), clip(b.model, 40), inT, outT)];
        if (p) {
          const prof = JSON.parse(p.body);
          const next = { ...prof, ...joelFields(w), history: [{ at, text: `JoelAI Pro · ${clip(b.modelName || b.model, 40)}`, amount: 0, tokens: 0, joelTokens: -(fromMonthly + fromPaid) }, ...(Array.isArray(prof.history) ? prof.history : [])].slice(0, 60) };
          stmts.push(db.prepare("UPDATE profiles SET body=?, updated_at=? WHERE user_id=?").bind(JSON.stringify(next), at, u.id));
        }
        await db.batch(stmts);
        return reply(req, { ok: true, charged: fromMonthly + fromPaid, ...walletView(w) });
      }
      // ---- Control Tower: files published to the cloud (codes, accounts, permissions, crew, flight discounts) ----
      if (path.startsWith("/api/data/")) {
        const name = decodeURIComponent(path.slice(10));
        if (!Object.hasOwn(DATA_NAMES, name)) return reply(req, { error: "not_found" }, 404);
        if (req.method === "GET") {
          const row = await db.prepare("SELECT body, updated_at, updated_by FROM published WHERE name=?").bind(name).first();
          if (!row) return reply(req, { error: "not_found" }, 404);
          return reply(req, { data: JSON.parse(row.body), updatedAt: row.updated_at, updatedBy: row.updated_by });
        }
        if (req.method === "PUT") {
          if (!u) return reply(req, { error: "login" }, 401);
          if (!(await adminRole())) return reply(req, { error: "not_publisher" }, 403);
          const text = await req.text();
          if (text.length > MAX_DATA) return reply(req, { error: "too_big" }, 413);
          let b; try { b = JSON.parse(text); } catch { return reply(req, { error: "bad_json" }, 400); }
          if (!b || typeof b.data !== "object" || b.data === null || Array.isArray(b.data) || !DATA_NAMES[name](b.data)) return reply(req, { error: "bad_data" }, 400);
          const at = iso(), body = JSON.stringify(b.data);
          await db.prepare("INSERT INTO published(name,body,updated_at,updated_by) VALUES(?,?,?,?) ON CONFLICT(name) DO UPDATE SET body=?, updated_at=?, updated_by=?").bind(name, body, at, u.username, body, at, u.username).run();
          if (name === "accounts") etchedMemo = { at: 0, list: [] };
          return reply(req, { ok: true, updatedAt: at });
        }
      }
      // Reviews: everyone can read them; a cloud login writes one review each.
      if (req.method === "GET" && path === "/api/reviews") {
        const rows = await db.prepare("SELECT username, stars, title, body, date, route, trip_ref, verified FROM reviews ORDER BY updated_at DESC LIMIT 300").all();
        return reply(req, { reviews: (rows.results || []).map((r) => ({ username: r.username, stars: r.stars, title: r.title, body: r.body, date: r.date, route: r.route || "", tripRef: r.trip_ref || "", verified: !!r.verified })) });
      }
      if (req.method === "POST" && (path === "/api/register" || path === "/api/login")) {
        const b = await req.json().catch(() => ({}));
        const username = String(b.username || "").trim(), password = String(b.password || "");
        const ip = req.headers.get("cf-connecting-ip") || "x";
        if (path === "/api/register") {
          if (!/^[A-Za-z0-9_]{3,20}$/.test(username)) return reply(req, { error: "bad_username" }, 400);
          if (password.length < 8 || password.length > 200) return reply(req, { error: "bad_password" }, 400);
          const rl = await limited(db, "reg:" + ip); if (rl) return reply(req, { error: "wait", seconds: rl }, 429);
          const key = username.toLowerCase();
          if ((await etchedList(env)).some((e) => e.key === key)) return reply(req, { error: "etched" }, 409);
          if (await db.prepare("SELECT id FROM users WHERE username_key=?").bind(key).first()) return reply(req, { error: "taken" }, 409);
          await fail(db, "reg:" + ip); // at most 5 new accounts per IP, then a 5 minute wait
          const r = await db.prepare("INSERT INTO users(username,username_key,password_hash,created_at) VALUES(?,?,?,?)").bind(username, key, await hashPassword(password), iso()).run();
          return reply(req, { ok: true, username, token: await newSession(db, r.meta.last_row_id), profile: null, updatedAt: null }, 201);
        }
        const k = "login:" + username.toLowerCase() + ":" + ip;
        const rl = await limited(db, k); if (rl) return reply(req, { error: "wait", seconds: rl }, 429);
        const u = await db.prepare("SELECT * FROM users WHERE username_key=?").bind(username.toLowerCase()).first();
        if (!u || !(await checkPassword(password, u.password_hash))) { await fail(db, k); return reply(req, { error: "bad_login" }, 401); }
        await clear(db, k);
        const p = await db.prepare("SELECT body, updated_at FROM profiles WHERE user_id=?").bind(u.id).first();
        return reply(req, { ok: true, username: u.username, token: await newSession(db, u.id), profile: p ? await profileView(db, env, u, p.body) : null, updatedAt: p?.updated_at || null });
      }
      if (path === "/api/profile") {
        if (!u) return reply(req, { error: "login" }, 401);
        const p = await db.prepare("SELECT body, updated_at FROM profiles WHERE user_id=?").bind(u.id).first();
        if (req.method === "GET") return reply(req, { username: u.username, profile: p ? await profileView(db, env, u, p.body) : null, updatedAt: p?.updated_at || null });
        if (req.method === "PUT") {
          const text = await req.text();
          if (text.length > MAX_PROFILE) return reply(req, { error: "too_big" }, 413);
          let b; try { b = JSON.parse(text); } catch { return reply(req, { error: "bad_json" }, 400); }
          if (!b || typeof b.profile !== "object" || b.profile === null || Array.isArray(b.profile)) return reply(req, { error: "bad_profile" }, 400);
          if (b.baseUpdatedAt !== undefined && p && p.updated_at !== b.baseUpdatedAt && !b.force) return reply(req, { error: "conflict", profile: await profileView(db, env, u, p.body), updatedAt: p.updated_at }, 409);
          const at = iso(), bal = await getBalances(db, env, u);
          let prevProf = null; try { prevProf = p ? JSON.parse(p.body) : null; } catch { prevProf = null; }
          const after = await applyWallet(env, db, u, bal, prevProf, b.profile);
          const claimed = JSON.stringify(balFromProfile(b.profile)), actual = JSON.stringify({ octmiles: after.octmiles, lifetime: after.lifetime, tokens: after.tokens, fujitech: after.fujitech, scraggy: after.scraggy });
          const merged = { ...b.profile, ...balanceFields(after), ...joelFields(await wallet(db, u.id)) };
          await db.batch([
            db.prepare("INSERT INTO profiles(user_id,body,updated_at) VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET body=?, updated_at=?").bind(u.id, JSON.stringify(merged), at, JSON.stringify(merged), at),
            saveBalances(db, after)
          ]);
          // when the cloud's numbers differ from the ones the browser claimed, send the saved copy back so the browser takes it
          if (claimed !== actual) return reply(req, { ok: true, updatedAt: at, corrected: true, profile: merged });
          return reply(req, { ok: true, updatedAt: at });
        }
      }
      if (path === "/api/review") {
        if (!u) return reply(req, { error: "login" }, 401);
        if (req.method === "DELETE") { await db.prepare("DELETE FROM reviews WHERE user_id=?").bind(u.id).run(); return reply(req, { ok: true }); }
        if (req.method === "PUT") {
          const text = await req.text();
          if (text.length > 4000) return reply(req, { error: "too_big" }, 413);
          let b; try { b = JSON.parse(text); } catch { return reply(req, { error: "bad_json" }, 400); }
          const stars = Math.round(Number(b?.stars)), title = clip(b?.title, 60).trim(), body = clip(b?.body, 500).trim();
          if (!(stars >= 1 && stars <= 5)) return reply(req, { error: "bad_stars" }, 400);
          if (!title) return reply(req, { error: "bad_title" }, 400);
          if (body.length < 20) return reply(req, { error: "bad_body" }, 400);
          const date = /^\d{4}-\d{2}-\d{2}$/.test(String(b?.date || "")) ? b.date : iso().slice(0, 10);
          const at = iso(), route = clip(b?.route, 60), trip = clip(b?.tripRef, 20), ver = b?.verified ? 1 : 0;
          await db.prepare("INSERT INTO reviews(user_id,username,stars,title,body,date,route,trip_ref,verified,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET username=?, stars=?, title=?, body=?, date=?, route=?, trip_ref=?, verified=?, updated_at=?")
            .bind(u.id, u.username, stars, title, body, date, route, trip, ver, at, u.username, stars, title, body, date, route, trip, ver, at).run();
          return reply(req, { ok: true });
        }
      }
      if (req.method === "POST" && path === "/api/logout") {
        const t = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
        if (t) await db.prepare("DELETE FROM sessions WHERE token_hash=?").bind(await sha(t)).run();
        return reply(req, { ok: true });
      }
      if (req.method === "GET" && path === "/api/me") return u ? reply(req, { username: u.username }) : reply(req, { error: "login" }, 401);
      return reply(req, { error: "not_found" }, 404);
    } catch (e) {
      return reply(req, { error: "server", detail: String(e.message || e).slice(0, 200) }, 500);
    }
  }
};
