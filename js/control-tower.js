// FAG (Fuji Airport Group) code administration — opened by clicking the Octee logo 8 times quickly.
// This part is deliberately SERIOUS: plain corporate look, no jokes. A wrong password closes it instantly, with no message.
//
// This is a STATIC site, so there is no server to keep secrets or save codes. Instead:
//  * Who may enter is in data/control-tower.json (owner + admins, passwords stored only as PBKDF2 hashes).
//  * Codes live in data/codes.json, stored only as SHA-256 hashes (reading the file doesn't reveal them).
//  * The Control Tower saves the NEW versions of those files to Octee Cloud ("Save to cloud"): live at once, no push needed.
//    Only a cloud account that is a Control Tower owner or admin (checked by the Worker) can save. Readers fall back to the
//    files in data/, and every panel keeps a "Manual download" so the files can still be committed to GitHub if the cloud is down.
import { el, setMsg } from "./dom.js";
import { hashPassword, randomSalt, codeHash, normalizeCode } from "./crypto.js";
import { loadSession, saveSession, removeSession, load, save, remove } from "./store.js";
import { pendingRequests, allGrants, grant, dismissRequest } from "./permissions.js";
import { cloudAdminCall, cloudState } from "./cloud.js";
import { fetchPublished, publishToCloud, isPublisher } from "./published.js";

const SESSION = "octee.tower.session";
const DRAFT_CODES = "octee.tower.codes";
const DRAFT_CREW = "octee.tower.crew";
const LOCK = "octee.tower.lock";

let back = null;

// The cloud copy if there is one, else the file in data/.
const fetchJson = (path, fallback) => fetchPublished(path.replace(/^data\//, "").replace(/\.json$/, ""), path, fallback);
// Save a file to the cloud and say how it went.
async function saveToCloud(name, data, msg, what) {
  setMsg(msg, "Saving to the cloud…", "info");
  const r = await publishToCloud(name, data);
  setMsg(msg, r.ok ? `${what} saved to the cloud. It is live now, on every device.` : r.message, r.ok ? "ok" : "error");
  return r.ok;
}

function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2) + "\n"], { type: "application/json" });
  const a = el("a", { href: URL.createObjectURL(blob), download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function shell(...content) {
  back?.remove();
  back = el("div", { class: "modal-back fag-back", role: "dialog", "aria-modal": "true", "aria-label": "FAG Fuji Airport Group, Control Tower administration" },
    el("div", { class: "modal fag" },
      el("button", { class: "close-x", type: "button", "aria-label": "Close", onclick: () => back.remove() }, "×"),
      el("div", { class: "fag-head" },
        el("div", { class: "fag-mark", "aria-hidden": "true" }, "FAG"),
        el("div", {}, el("h2", {}, "Fuji Airport Group"), el("p", { class: "fag-sub" }, "Octmiles Code Administration · Restricted system"))),
      ...content));
  back.addEventListener("keydown", (e) => { if (e.key === "Escape") back.remove(); });
  back.addEventListener("click", (e) => { if (e.target === back) back.remove(); });
  document.body.append(back);
  back.querySelector("input, button:not(.close-x)")?.focus();
}

export async function openControlTower() {
  try {
    const cloud = await cloudAdminCall("GET", "/api/admin/me");
    if (cloud?.role) {
      const crew = load(DRAFT_CREW, null) || (await fetchJson("data/control-tower.json", { owner: null, admins: [] }));
      return tower({ name: cloud.username, role: cloud.role, cloud: true }, crew);
    }
  } catch { /* Local Control Tower sign-in remains available. */ }
  const crew = load(DRAFT_CREW, null) || (await fetchJson("data/control-tower.json", { owner: null, admins: [] }));
  const session = loadSession(SESSION, null);
  if (!crew.owner) return setupOwner();
  if (session) return tower(session, crew);
  login(crew);
}

/* ----- first time: create the owner ----- */
function setupOwner() {
  const msg = el("p", { class: "msg", "aria-live": "polite" });
  const form = el("form", { class: "card" },
    el("h3", {}, "Initial setup"),
    el("p", {}, "No administrator account exists yet. Create the owner account with a strong password. After creating it, open the Admins tab and press Save to cloud. A copy is also downloaded as a backup."),
    el("div", { class: "row" },
      el("div", { class: "field" }, el("label", { for: "ct-name" }, "Owner name"), el("input", { type: "text", id: "ct-name", maxlength: "30", autocomplete: "username" })),
      el("div", { class: "field" }, el("label", { for: "ct-pass" }, "Password (12+ characters)"), el("input", { type: "password", id: "ct-pass", autocomplete: "new-password" }))),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Create owner account")), msg);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = form.querySelector("#ct-name").value.trim(), pass = form.querySelector("#ct-pass").value;
    if (name.length < 2) return setMsg(msg, "Enter a name.", "error");
    if (pass.length < 12) return setMsg(msg, "The password must be at least 12 characters.", "error");
    const salt = randomSalt();
    const crew = { owner: { name, salt, hash: await hashPassword(pass, salt) }, admins: [] };
    save(DRAFT_CREW, crew);
    download("control-tower.json", crew);
    saveSession(SESSION, { name, role: "owner" });
    tower({ name, role: "owner" }, crew, "Owner created. Open the Admins tab and press Save to cloud to make it live (a backup control-tower.json was downloaded).");
  });
  shell(form);
}

/* ----- login ----- */
function login(crew) {
  const msg = el("p", { class: "msg", "aria-live": "polite" });
  const form = el("form", { class: "card" },
    el("h3", {}, "Sign in"),
    el("p", {}, "Authorised personnel only. Sign in to access the Octmiles points codes."),
    el("div", { class: "row" },
      el("div", { class: "field" }, el("label", { for: "ct-name" }, "Name"), el("input", { type: "text", id: "ct-name", autocomplete: "username" })),
      el("div", { class: "field" }, el("label", { for: "ct-pass" }, "Password"), el("input", { type: "password", id: "ct-pass", autocomplete: "current-password" }))),
    el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Sign in")), msg);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const lock = loadSession(LOCK, { fails: 0, until: 0 });
    if (Date.now() < lock.until) { back.remove(); return; }   // locked out after 5 wrong tries: just close
    const name = form.querySelector("#ct-name").value.trim(), pass = form.querySelector("#ct-pass").value;
    const people = [{ ...crew.owner, role: "owner" }, ...(crew.admins || []).map((a) => ({ ...a, role: "admin" }))];
    const who = people.find((p) => p.name.toLowerCase() === name.toLowerCase());
    if (who && (await hashPassword(pass, who.salt)) === who.hash) {
      removeSession(LOCK);
      const s = { name: who.name, role: who.role };
      saveSession(SESSION, s);
      return tower(s, crew);
    }
    const fails = lock.fails + 1;
    saveSession(LOCK, { fails: fails >= 5 ? 0 : fails, until: fails >= 5 ? Date.now() + 5 * 60_000 : 0 });
    back.remove();   // wrong name or password: the pop-up vanishes instantly, with no message
  });
  shell(form);
}

/* ----- inside ----- */
async function tower(session, crew, notice = "") {
  const published = await fetchJson("data/codes.json", { codes: [] });
  const publishedPerks = await fetchJson("data/perks.json", { unlimitedFujitech: {}, freePro: {} });
  const perksDraft = { unlimitedFujitech: { ...(publishedPerks.unlimitedFujitech || {}) }, freePro: { ...(publishedPerks.freePro || {}) } };
  const publishedDiscounts = await fetchJson("data/flight-discounts.json", { discounts: [] });
  let codes = load(DRAFT_CODES, null) || published.codes || [];
  let discounts = load("octee.tower.discounts", null) || publishedDiscounts.discounts || [];
  const tabCodes = el("button", { type: "button", role: "tab", "aria-selected": "true" }, "Codes");
  const tabDiscounts = el("button", { type: "button", role: "tab", "aria-selected": "false" }, "Flight discounts");
  const tabCrew = session.role === "owner" && !session.cloud ? el("button", { type: "button", role: "tab", "aria-selected": "false" }, "Admins") : null;
  const tabAccounts = el("button", { type: "button", role: "tab", "aria-selected": "false" }, "Accounts");
  const tabCloud = session.cloud ? el("button", { type: "button", role: "tab", "aria-selected": "false" }, "Cloud accounts") : null;
  const tabRequests = el("button", { type: "button", role: "tab", "aria-selected": "false" }, "Requests");
  const countRequests = () => { const n = pendingRequests().length; tabRequests.textContent = n ? `Requests (${n})` : "Requests"; };
  countRequests();
  const publishedAccounts = (await fetchJson("data/accounts.json", { accounts: [] })).accounts || [];
  const removed = new Set();
  const body = el("div");
  // Saving to the cloud needs a cloud login that is a Control Tower owner or admin (the Worker checks it).
  const cloudBar = el("div", { class: "card", style: "margin-bottom:12px" }, el("p", { class: "note" }, "Checking the cloud…"));
  (async () => {
    const who = (cloudState() || {}).name, ok = await isPublisher();
    cloudBar.replaceChildren(el("p", { class: ok ? "note" : "msg info" }, ok ? `Cloud: signed in as ${who}. This account may save to the cloud.`
      : ok === false ? `Cloud: signed in as ${who}, but this account is not a Control Tower admin, so Save to cloud will be refused. The owner can add it on the Cloud accounts tab.`
      : who ? "The cloud could not be reached, so Save to cloud will not work right now. Manual download still does."
      : "Not logged in to Octee Cloud. To save to the cloud, log in on the login page (Log in tab) with a Control Tower admin account, then open this panel again."));
  })();
  const top = el("p", { class: "msg ok" }, notice);
  const show = (which) => {
    tabCodes.setAttribute("aria-selected", String(which === "codes"));
    tabDiscounts.setAttribute("aria-selected", String(which === "discounts"));
    tabCrew?.setAttribute("aria-selected", String(which === "crew"));
    tabAccounts.setAttribute("aria-selected", String(which === "accounts"));
    tabCloud?.setAttribute("aria-selected", String(which === "cloud"));
    tabRequests.setAttribute("aria-selected", String(which === "requests"));
    countRequests();
    if (which === "requests") { body.replaceChildren(el("p", { class: "note" }, "Loading…")); requestsPanel().then((n) => body.replaceChildren(n)); return; }
    if (which === "cloud") { body.replaceChildren(el("p", { class: "note" }, "Loading Cloud accounts…")); cloudPanel().then((n) => body.replaceChildren(n)); return; }
    body.replaceChildren(which === "codes" ? codesPanel() : which === "discounts" ? discountsPanel() : which === "accounts" ? accountsPanel() : crewPanel());
  };
  tabCodes.addEventListener("click", () => show("codes"));
  tabDiscounts.addEventListener("click", () => show("discounts"));
  tabCrew?.addEventListener("click", () => show("crew"));
  tabAccounts.addEventListener("click", () => show("accounts"));
  tabCloud?.addEventListener("click", () => show("cloud"));
  tabRequests.addEventListener("click", () => show("requests"));

  const saveCodes = (next) => { codes = next; save(DRAFT_CODES, codes); show("codes"); };

  function discountsPanel() {
    const dmsg = el("p", { class: "msg", "aria-live": "polite" });
    const msg = el("p", { class: "msg", role: "status" });
    const form = el("form", { class: "card" }, el("h3", {}, "Create a flight discount"),
      el("div", { class: "row" },
        el("div", { class: "field" }, el("label", { for: "fd-code" }, "Code"), el("input", { id: "fd-code", maxlength: "20", placeholder: "e.g. OCTEEFIRST" })),
        el("div", { class: "field" }, el("label", { for: "fd-percent" }, "Percent off (0–100)"), el("input", { id: "fd-percent", type: "number", min: "0", max: "100", value: "100" })),
        el("div", { class: "field" }, el("label", { for: "fd-to" }, "Destination (airport code, optional)"), el("input", { id: "fd-to", maxlength: "8", placeholder: "FIA" }))),
      el("div", { class: "row" },
        el("div", { class: "field" }, el("label", { for: "fd-class" }, "Cabin (optional)"), el("select", { id: "fd-class" }, [["", "Any cabin"], ["first", "First Class"], ["business", "Business Class"], ["economy", "Economy"], ["chaos", "Chaos Class"], ["scraggy", "Scraggy Class"], ["semi", "Semi-United"]].map(([v,t]) => el("option", { value: v }, t)))),
        el("div", { class: "field" }, el("label", { for: "fd-exp" }, "Expires (optional)"), el("input", { id: "fd-exp", type: "date" })),
        el("div", { class: "field" }, el("label", { for: "fd-note" }, "Note"), el("input", { id: "fd-note", maxlength: "60" }))),
      el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Create discount")), msg);
    form.addEventListener("submit", async (e) => {
      e.preventDefault(); const code = normalizeCode(form.querySelector("#fd-code").value), percent = Math.floor(Number(form.querySelector("#fd-percent").value));
      if (!/^[A-Z0-9-]{4,20}$/.test(code) || !(percent >= 0 && percent <= 100)) return setMsg(msg, "Enter a 4–20 character code and a discount from 0 to 100%.", "error");
      const hash = await codeHash(code); if (discounts.some((d) => d.hash === hash)) return setMsg(msg, "That code already exists.", "error");
      discounts = [...discounts, { hash, percent, to: form.querySelector("#fd-to").value.trim().toUpperCase() || null, classId: form.querySelector("#fd-class").value || null, expires: form.querySelector("#fd-exp").value || null, active: true, note: form.querySelector("#fd-note").value.trim() || "Flight discount", madeBy: session.name }];
      save("octee.tower.discounts", discounts); setMsg(msg, `Created ${code}. Record the plain code now; only its hash is stored. The Download button includes this new discount.`, "ok");
    });
    return el("div", {}, form, el("div", { class: "card" }, el("h3", {}, `Discounts (${discounts.length})`),
      el("p", {}, discounts.map((d) => `${d.note || "Discount"}: ${d.percent}%${d.to ? ` to ${d.to}` : ""}${d.classId ? ` · ${d.classId}` : ""}`).join(" · ") || "No discounts yet."),
      el("p", { class: "note" }, JSON.stringify(discounts) === JSON.stringify(publishedDiscounts.discounts || []) ? "Matches published flight-discounts.json." : "There are unpublished changes."),
      el("div", { class: "actions" },
        el("button", { class: "btn", type: "button", onclick: async () => { if (await saveToCloud("flight-discounts", { discounts }, dmsg, "Flight discounts")) publishedDiscounts.discounts = discounts; } }, "Save to cloud"),
        el("button", { class: "btn small ghost", type: "button", onclick: () => download("flight-discounts.json", { discounts }) }, "Manual download: flight-discounts.json")),
      dmsg,
      el("p", { class: "hint" }, "Save to cloud publishes the discounts at once. Manual download is only for when the cloud has a problem: put the file in data/ and commit it. A 100% First Class discount to FIA makes a free first class flight.")));
  }

  async function cloudPanel() {
    const msg = el("p", { class: "msg", role: "status" });
    try {
      const [u, a] = await Promise.all([cloudAdminCall("GET", "/api/admin/users"), session.role === "owner" ? cloudAdminCall("GET", "/api/admin/admins") : Promise.resolve({ admins: [] })]);
      const add = el("form", { class: "card" }, el("h3", {}, "Add Cloud account as Control Tower admin"), el("div", { class: "row" }, el("div", { class: "field" }, el("label", { for: "cloud-admin-name" }, "Existing Cloud username"), el("input", { id: "cloud-admin-name", maxlength: "20" })), el("button", { class: "btn", type: "submit" }, "Add admin")), msg);
      if (session.role !== "owner") add.hidden = true;
      add.addEventListener("submit", async (e) => { e.preventDefault(); try { await cloudAdminCall("POST", "/api/admin/admins", { username: add.querySelector("#cloud-admin-name").value.trim() }); setMsg(msg, "Cloud admin added.", "ok"); show("cloud"); } catch (err) { setMsg(msg, err?.body?.message || "Could not add that Cloud account.", "error"); } });
      const admins = new Set((a.admins || []).map((x) => x.username.toLowerCase()));
      const table = el("div", { class: "table-wrap" }, el("table", { class: "plain" }, el("thead", {}, el("tr", {}, ["Cloud username", "Created", "Role"].map((x) => el("th", {}, x)))), el("tbody", {}, (u.users || []).map((x) => el("tr", {}, el("td", {}, x.username), el("td", {}, x.createdAt?.slice(0,10) || "—"), el("td", {}, x.username.toLowerCase() === session.name.toLowerCase() && session.role === "owner" ? "Owner" : admins.has(x.username.toLowerCase()) ? "Admin" : "Account"))))));
      const adminList = el("ul", {}, (a.admins || []).map((x) => el("li", {}, x.username, session.role === "owner" ? el("button", { class: "btn small ghost danger", type: "button", onclick: async () => { await cloudAdminCall("DELETE", "/api/admin/admins/" + encodeURIComponent(x.username)); show("cloud"); } }, "Remove admin") : "")));
      return el("div", {}, add, el("div", { class: "card" }, el("h3", {}, `Cloud users (${(u.users || []).length})`), table), el("div", { class: "card" }, el("h3", {}, "Cloud admins"), adminList), el("p", { class: "hint" }, "Cloud roles are checked by the Worker on every request. Set CONTROL_TOWER_OWNER_USERNAME to the owner account in Cloudflare."));
    } catch { return el("p", { class: "msg error" }, "Could not load Cloud administration. Sign in to an authorized Cloud account and ensure the Worker is deployed with the admin schema."); }
  }

  function codesPanel() {
    const msg = el("p", { class: "msg", "aria-live": "polite" });
    const made = el("div");
    const form = el("form", { class: "card" },
      el("h3", {}, "Create a code"),
      el("div", { class: "row" },
        el("div", { class: "field" }, el("label", { for: "nc-code" }, "Code"), el("input", { type: "text", id: "nc-code", maxlength: "20", placeholder: "e.g. OCTEE500" })),
        el("div", { class: "field", style: "justify-content:flex-end" }, el("button", { class: "btn small secondary", type: "button", onclick: () => {
          const abc = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
          form.querySelector("#nc-code").value = "OCT-" + Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => abc[b % abc.length]).join("");
        } }, "Random"))),
      el("div", { class: "row" },
        el("div", { class: "field" }, el("label", { for: "nc-miles" }, "Octmiles (1–5,000)"), el("input", { type: "number", id: "nc-miles", min: "1", max: "5000", value: "500" })),
        el("div", { class: "field" }, el("label", { for: "nc-exp" }, "Expires (optional)"), el("input", { type: "date", id: "nc-exp" })),
        el("div", { class: "field" }, el("label", { for: "nc-note" }, "Note (only in the file)"), el("input", { type: "text", id: "nc-note", maxlength: "60", placeholder: "Internal reference" }))),
      el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Create code")), msg, made);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const code = normalizeCode(form.querySelector("#nc-code").value);
      const miles = +form.querySelector("#nc-miles").value;
      if (!/^[A-Z0-9-]{4,20}$/.test(code)) return setMsg(msg, "Codes are 4–20 letters, numbers or dashes.", "error");
      if (!(miles >= 1 && miles <= 5000)) return setMsg(msg, "Octmiles must be 1–5,000.", "error");
      const hash = await codeHash(code);
      if (codes.some((c) => c.hash === hash)) return setMsg(msg, "That code already exists.", "error");
      saveCodes([...codes, { hash, octmiles: miles, expires: form.querySelector("#nc-exp").value || null, active: true,
        note: form.querySelector("#nc-note").value.trim() || null, madeBy: session.name, made: new Date().toISOString().slice(0, 10) }]);
      body.prepend(el("p", { class: "msg ok" }, `Code ${code} created (${miles} Octmiles). Record it now: only a hash is stored, so it cannot be displayed again. Press Save to cloud to publish the code.`));
    });
    const changed = JSON.stringify(codes) !== JSON.stringify(published.codes || []);
    const cmsg = el("p", { class: "msg", "aria-live": "polite" });
    return el("div", {},
      form,
      el("div", { class: "card", style: "margin-top:12px" },
        el("h3", {}, `Codes (${codes.length})`),
        codes.length ? el("div", { class: "table-wrap" }, el("table", { class: "plain" },
          el("thead", {}, el("tr", {}, ["Note", "Octmiles", "Expires", "Made by", "On", ""].map((h) => el("th", {}, h)))),
          el("tbody", {}, codes.map((c, i) => el("tr", {},
            el("td", {}, c.note || el("span", { class: "note" }, "#" + c.hash.slice(0, 8))),
            el("td", {}, String(c.octmiles)), el("td", {}, c.expires || "never"), el("td", {}, c.madeBy || "—"),
            el("td", {}, el("input", { type: "checkbox", checked: c.active !== false, "aria-label": "Code switched on",
              onchange: (e) => saveCodes(codes.map((x, k) => (k === i ? { ...x, active: e.target.checked } : x))) })),
            el("td", {}, el("button", { class: "btn small ghost danger", type: "button", onclick: () => saveCodes(codes.filter((_, k) => k !== i)) }, "Delete"))))))) : el("p", { class: "note" }, "No codes yet."),
        el("p", { class: changed ? "msg info" : "note" }, changed ? "There are unpublished changes." : "Matches the published codes."),
        el("div", { class: "actions" },
          el("button", { class: "btn", type: "button", onclick: async () => { if (await saveToCloud("codes", { codes }, cmsg, "Codes")) { published.codes = codes; remove(DRAFT_CODES); } } }, "Save to cloud"),
          el("button", { class: "btn small ghost", type: "button", onclick: () => download("codes.json", { codes }) }, "Manual download: codes.json"),
          el("button", { class: "btn small ghost", type: "button", onclick: () => { remove(DRAFT_CODES); codes = published.codes || []; show("codes"); } }, "Discard changes")),
        cmsg,
        el("p", { class: "hint" }, "Save to cloud publishes the codes at once, on every device. Manual download is only for when the cloud has a problem: put the file in the website's data/ folder, commit and push.")));
  }

  // Accounts "etched in the code": data/accounts.json. An account in that file can log in on any device and
  // arrives with its balances and trips as saved here.
  // The only place the "unlimited Fujitech" switch exists. Saved to the cloud like everything else here.
  function perksCard() {
    const pmsg = el("p", { class: "msg", "aria-live": "polite" });
    const on = el("input", { type: "checkbox", id: "perk-octee", checked: perksDraft.unlimitedFujitech.octee === true });
    on.addEventListener("change", () => { if (on.checked) perksDraft.unlimitedFujitech.octee = true; else delete perksDraft.unlimitedFujitech.octee; setMsg(pmsg, "Changed. Press Save to cloud to apply it.", "info"); });
    const pro = el("input", { type: "checkbox", id: "perk-pro", checked: perksDraft.freePro.octee === true });
    pro.addEventListener("change", () => { if (pro.checked) perksDraft.freePro.octee = true; else delete perksDraft.freePro.octee; setMsg(pmsg, "Changed. Press Save to cloud to apply it.", "info"); });
    return el("div", { class: "card", style: "margin-bottom:12px" },
      el("h3", {}, "Account perks"),
      el("p", { class: "note" }, "When this is on, the Octee account books flights and cargo without spending Fujitech. The Fujitech it has earned is never reduced and still shows at the top of the site. Only this panel can change it."),
      el("div", { class: "row" }, el("div", { class: "field" }, el("label", { for: "perk-octee" }, on, " Octee: unlimited Fujitech")),
        el("div", { class: "field" }, el("label", { for: "perk-pro" }, pro, " Octee: JoelAI Pro and GulletAI Pro free"))),
      el("div", { class: "actions" },
        el("button", { class: "btn", type: "button", onclick: () => saveToCloud("perks", perksDraft, pmsg, "The setting") }, "Save to cloud"),
        el("button", { class: "btn small ghost", type: "button", onclick: () => download("perks.json", perksDraft) }, "Manual download: perks.json")),
      pmsg);
  }

  function accountsPanel() {
    const USERS = "octee.users";
    const local = load(USERS, {});
    const pubKey = (a) => a.username.toLowerCase();
    const keys = [...new Set([...Object.keys(local), ...publishedAccounts.map(pubKey)])].sort();
    const picked = new Set();
    const msg = el("p", { class: "msg", "aria-live": "polite" });
    const snapshot = (u, at) => ({
      username: u.username, salt: u.salt, hash: u.hash, createdAt: u.createdAt, etchedAt: at,
      octmiles: u.octmiles || 0, lifetime: u.lifetime || 0, tokens: u.tokens || 0, scraggymiles: u.scraggymiles || 0,
      history: (u.history || []).slice(0, 50), trips: u.trips || [], redemptions: u.redemptions || [],
      codesUsed: u.codesUsed || {}, repeatUses: u.repeatUses || {}, codeDays: u.codeDays || {}, codeExtra: u.codeExtra || {}, rides: u.rides || [], reviewBonus: !!u.reviewBonus
    });
    const rows = keys.map((k) => {
      const u = local[k], p = publishedAccounts.find((a) => pubKey(a) === k);
      const state = removed.has(k) ? "Will be removed from the file"
        : p && u ? (String(u.etchedAt || "") === String(p.etchedAt || "") && u.octmiles === p.octmiles && (u.tokens || 0) === (p.tokens || 0) && (u.trips || []).length === (p.trips || []).length
          ? "In the file, unchanged" : "In the file; this browser has a different copy")
        : p ? "In the file (not on this device)" : "This browser only";
      const src = u || p;
      return el("tr", {},
        el("td", {}, u ? el("input", { type: "checkbox", "aria-label": "Save " + src.username + " to the file", onchange: (e) => { e.target.checked ? picked.add(k) : picked.delete(k); } }) : ""),
        el("td", {}, src.username), el("td", {}, String(src.octmiles || 0)), el("td", {}, String(src.tokens || 0)), el("td", {}, String((src.trips || []).length)),
        el("td", {}, state),
        el("td", {}, p && !removed.has(k) ? el("button", { class: "btn small ghost danger", type: "button", onclick: () => { removed.add(k); show("accounts"); } }, "Remove from file") : ""));
    });
    const build = () => {
      const at = new Date().toISOString();
      const users = load(USERS, {});
      const out = publishedAccounts.filter((a) => !removed.has(pubKey(a)) && !picked.has(pubKey(a)));
      for (const k of picked) {
        if (!users[k]) continue;
        users[k].etchedAt = at;          // this browser's copy now matches the file it is about to publish
        out.push(snapshot(users[k], at));
      }
      save(USERS, users);
      out.sort((a, b) => a.username.localeCompare(b.username));
      return { accounts: out };
    };
    return el("div", {},
      perksCard(),
      el("div", { class: "card" },
        el("h3", {}, `Accounts (${keys.length})`),
        el("p", { class: "note" }, "An account saved to the cloud can sign in on any device and receives the balances and trips recorded at the time of saving. Tick the accounts to save from this browser, then press Save to cloud."),
        keys.length ? el("div", { class: "table-wrap" }, el("table", { class: "plain" },
          el("thead", {}, el("tr", {}, ["Save", "Username", "Octmiles", "Octeetokens", "Trips", "Status", ""].map((h) => el("th", {}, h)))),
          el("tbody", {}, rows))) : el("p", { class: "note" }, "No accounts in this browser or in the file."),
        el("p", { class: "msg info" }, "Notice: the published accounts list is public (anyone can read it). It contains usernames, password hashes, balances and trips, including passenger names. Save only accounts whose owners agree, and only with passwords that are not used anywhere else."),
        el("div", { class: "actions" },
          el("button", { class: "btn", type: "button", onclick: async () => {
            if (!picked.size && !removed.size) return setMsg(msg, "Tick at least one account, or remove one from the file.", "error");
            const out = build();
            if (await saveToCloud("accounts", out, msg, "Accounts")) { publishedAccounts.splice(0, publishedAccounts.length, ...out.accounts); removed.clear(); picked.clear(); show("accounts"); body.prepend(el("p", { class: "msg ok" }, "Accounts saved to the cloud. They are live now.")); }
          } }, "Save to cloud"),
          el("button", { class: "btn small ghost", type: "button", onclick: () => {
            if (!picked.size && !removed.size) return setMsg(msg, "Tick at least one account, or remove one from the file.", "error");
            download("accounts.json", build());
            setMsg(msg, "accounts.json downloaded. Only needed if the cloud has a problem: place it in the website's data/ folder, then commit and push.", "ok");
          } }, "Manual download: accounts.json")),
        msg,
        el("p", { class: "hint" }, "Save to cloud publishes the list at once. Balances earned on a device after saving stay on that device until the account is saved again here; when the file holds a newer copy, the file replaces the device copy at the next sign-in.")));
  }

  // Permission requests. A passenger who has used the crew code beyond its free uses is stopped and a request
  // is recorded. Any administrator or the owner may give permission; each permission allows one more use.
  async function requestsPanel() {
    const reqs = pendingRequests();
    const grants = await allGrants();
    const msg = el("p", { class: "msg", "aria-live": "polite" });
    const give = async (name) => { await grant(name, 1); show("requests"); };
    const form = el("form", { class: "card", style: "margin-top:12px" },
      el("h3", {}, "Give permission by username"),
      el("p", { class: "note" }, "For a request made on another device, enter the passenger's username."),
      el("div", { class: "row" },
        el("div", { class: "field" }, el("label", { for: "pm-user" }, "Username"), el("input", { type: "text", id: "pm-user", maxlength: "20", autocomplete: "off" })),
        el("div", { class: "field", style: "justify-content:flex-end" }, el("button", { class: "btn", type: "submit" }, "Give permission (1 use)"))),
      msg);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.querySelector("#pm-user").value.trim();
      if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return setMsg(msg, "Enter a valid username.", "error");
      await give(name);
    });
    const names = Object.keys(grants).sort();
    const pmsg = el("p", { class: "msg", "aria-live": "polite" });
    return el("div", {},
      el("div", { class: "card" },
        el("h3", {}, `Pending requests (${reqs.length})`),
        reqs.length ? el("div", { class: "table-wrap" }, el("table", { class: "plain" },
          el("thead", {}, el("tr", {}, ["Username", "Request", "Received", "", ""].map((h) => el("th", {}, h)))),
          el("tbody", {}, reqs.map((r) => el("tr", {},
            el("td", {}, r.username), el("td", {}, r.what || "Permission"), el("td", {}, String(r.at || "").slice(0, 16).replace("T", " ")),
            el("td", {}, el("button", { class: "btn small", type: "button", onclick: () => give(r.username) }, "Give permission")),
            el("td", {}, el("button", { class: "btn small ghost danger", type: "button", onclick: () => { dismissRequest(r.username); show("requests"); } }, "Refuse"))))))) : el("p", { class: "note" }, "No pending requests in this browser."),
        el("p", { class: "hint" }, `Decided by ${session.name} (${session.role}). A permission given here takes effect in this browser immediately.`)),
      form,
      el("div", { class: "card", style: "margin-top:12px" },
        el("h3", {}, "Permissions given"),
        names.length ? el("table", { class: "plain" }, el("thead", {}, el("tr", {}, el("th", {}, "Username"), el("th", {}, "Extra uses allowed"))),
          el("tbody", {}, names.map((n) => el("tr", {}, el("td", {}, n), el("td", {}, String(grants[n])))))) : el("p", { class: "note" }, "None yet."),
        el("div", { class: "actions" },
          el("button", { class: "btn", type: "button", onclick: () => saveToCloud("permissions", { crew: grants }, pmsg, "Permissions") }, "Save to cloud"),
          el("button", { class: "btn small ghost", type: "button", onclick: () => download("permissions.json", { crew: grants }) }, "Manual download: permissions.json")),
        pmsg,
        el("p", { class: "hint" }, "Requests are recorded in the browser where they are made. Press Save to cloud to make the permissions given here work on other devices at once. Manual download is only for when the cloud has a problem.")));
  }

  function crewPanel() {
    const kmsg = el("p", { class: "msg", "aria-live": "polite" });
    const msg = el("p", { class: "msg", "aria-live": "polite" });
    const form = el("form", { class: "card" },
      el("h3", {}, "Add an admin"),
      el("p", { class: "note" }, "Administrators can create codes. Only the owner can add or remove administrators."),
      el("div", { class: "row" },
        el("div", { class: "field" }, el("label", { for: "na-name" }, "Name"), el("input", { type: "text", id: "na-name", maxlength: "30" })),
        el("div", { class: "field" }, el("label", { for: "na-pass" }, "Their password (12+ characters)"), el("input", { type: "password", id: "na-pass", autocomplete: "new-password" }))),
      el("div", { class: "actions" }, el("button", { class: "btn", type: "submit" }, "Add admin")), msg);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = form.querySelector("#na-name").value.trim(), pass = form.querySelector("#na-pass").value;
      if (name.length < 2) return setMsg(msg, "Pick a name.", "error");
      if (pass.length < 12) return setMsg(msg, "Use at least 12 characters.", "error");
      if ([crew.owner, ...crew.admins].some((p) => p.name.toLowerCase() === name.toLowerCase())) return setMsg(msg, "That name is already in the crew.", "error");
      const salt = randomSalt();
      crew = { ...crew, admins: [...crew.admins, { name, salt, hash: await hashPassword(pass, salt), added: new Date().toISOString().slice(0, 10) }] };
      save(DRAFT_CREW, crew);
      body.replaceChildren(crewPanel());
    });
    return el("div", {},
      el("div", { class: "card" }, el("h3", {}, "Crew"),
        el("table", { class: "plain" }, el("tbody", {},
          el("tr", {}, el("td", {}, crew.owner.name), el("td", {}, "Owner"), el("td", {})),
          crew.admins.map((a, i) => el("tr", {}, el("td", {}, a.name), el("td", {}, "Admin · added " + (a.added || "")),
            el("td", {}, el("button", { class: "btn small ghost danger", type: "button", onclick: () => {
              crew = { ...crew, admins: crew.admins.filter((_, k) => k !== i) }; save(DRAFT_CREW, crew); body.replaceChildren(crewPanel());
            } }, "Remove"))))))),
      form,
      el("div", { class: "actions" },
        el("button", { class: "btn", type: "button", onclick: () => saveToCloud("control-tower", crew, kmsg, "The crew") }, "Save to cloud"),
        el("button", { class: "btn small ghost", type: "button", onclick: () => download("control-tower.json", crew) }, "Manual download: control-tower.json")),
      kmsg,
      el("p", { class: "hint" }, "Save to cloud makes the crew list live at once. Manual download is only for when the cloud has a problem: replace data/control-tower.json, commit and push."));
  }

  shell(
    top,
    el("p", { class: "fag-who" }, `Signed in as ${session.name} `, el("span", { class: "tag" }, session.role),
      " ", el("button", { class: "btn small ghost", type: "button", onclick: () => { removeSession(SESSION); back.remove(); } }, "Sign out")),
    el("div", { class: "tabs", role: "tablist" }, tabCodes, tabDiscounts, tabAccounts, tabCloud, tabRequests, tabCrew),
    cloudBar,
    body,
    el("p", { class: "hint" }, "Changes here are drafts in this browser until you press Save to cloud. Cloud admin role changes take effect immediately."));
  if (!notice) top.remove();
  show("codes");
}
