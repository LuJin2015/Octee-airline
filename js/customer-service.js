// Zhang Gullet Customer Service page: a chat with GulletAI, a ticket, an escalate button and a star rating.
import { $, el, reducedMotion } from "./dom.js";
import { loadSession, saveSession, removeSession } from "./store.js";
import { gulletAnswer, GULLET_GREETING, GULLET_CHIPS } from "./gulletai.js";
import { actionRow, stopSpeaking } from "./chatextras.js";
import { saveText } from "./gulletdocs.js";
import { currentUser } from "./auth.js";
import { proFree } from "./perks.js";
import { buyGulletPro, GULLET_PRO_PRICE, fmtTokens } from "./miles.js";
import { gulletProOf, SMART, smartState, smartWanted, onSmart, enableSmart, disableSmart, smartSupport } from "./gullet-smart.js";

const KEY = "octee.gullet";
const box = $("#app");
let history = loadSession(KEY, null) || [{ who: "bot", text: GULLET_GREETING, links: [] }];
let st = loadSession(KEY + ".st", null) || { n: 0 };
let busy = false;

const log = el("div", { class: "jai-log gl-log", role: "log", "aria-live": "polite", "aria-label": "Conversation with GulletAI" });
const input = el("input", { type: "text", id: "gl-q", maxlength: "200", autocomplete: "off", placeholder: "Describe your problem. We will describe it back." });
const send = el("button", { class: "btn", type: "submit" }, "Send");
const chips = el("div", { class: "jai-chips", "aria-label": "Suggested questions" });
const rate = el("p", { class: "note gl-rate", role: "group", "aria-label": "Rate our service" });
const bubble = (m) => el("div", { class: "jai-msg " + m.who },
  el("span", { class: "jai-who" }, m.who === "bot" ? "GulletAI" : "You", m.smart ? el("span", { class: "tag", style: "margin-left:6px", title: "Written by TinyLlama running in your browser" }, "Smart mode") : ""),
  ...String(m.text).split("\n\n").map((t) => el("p", {}, t)),
  m.handbook ? el("div", { class: "gl-handbook", style: "margin-top:8px;padding:8px 10px;border-left:3px solid var(--line,#ccc);background:rgba(0,0,0,.04);font-size:.92em" }, el("strong", {}, "From the handbook"), ...String(m.handbook).split("\n\n").map((t) => el("p", { style: "margin:4px 0" }, t))) : "",
  m.links?.length ? el("p", { class: "jai-links" }, m.links.map(([label, href]) => el("a", { class: "tag", href }, label))) : "",
  m.who === "bot" && history.indexOf(m) > 0 ? actionRow(m.text, { up: "Thank you for your rating. It has been recorded as 5 stars, as is our policy.", down: "We are sorry. Your 👎 has been recorded as a 5-star 👍, as is our policy. We will still try harder." }) : "");
const draw = () => { log.replaceChildren(...history.map(bubble)); log.scrollTop = log.scrollHeight; };
const drawChips = (list = GULLET_CHIPS) => chips.replaceChildren(...list.map((c) => el("button", { type: "button", class: "jai-chip", onclick: () => ask(c) }, c)));
const persist = () => { saveSession(KEY, history.slice(-40)); saveSession(KEY + ".st", st); };

async function ask(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true; send.disabled = true; input.value = "";
  history.push({ who: "me", text }); draw();
  const typing = el("div", { class: "jai-msg bot typing" }, el("span", { class: "jai-who" }, "GulletAI"), el("p", {}, "Please hold. GulletAI is reviewing your message, and Mr Gullet is reviewing GulletAI."));
  log.append(typing); log.scrollTop = log.scrollHeight;
  const t0 = performance.now();
  let res;
  try { res = await gulletAnswer(text, st); }
  catch { res = { text: "I am sorry. Something went wrong. It has been logged, and the log has gone missing.", links: [], chips: GULLET_CHIPS.slice(0, 4) }; }
  const wait = reducedMotion() ? 0 : Math.min(1800, 500 + res.text.length * 2);
  await new Promise((r) => setTimeout(r, Math.max(0, wait - (performance.now() - t0))));
  typing.remove();
  history.push({ who: "bot", text: res.text, links: res.links, smart: !!res.smart, handbook: res.smart ? res.handbook : "" });
  persist(); draw();
  drawChips(res.chips?.length ? res.chips : GULLET_CHIPS);
  busy = false; send.disabled = false; input.focus();
}

function drawRate() {
  rate.replaceChildren("Rate our service: ", ...[1, 2, 3, 4, 5].map((n) => el("button", { type: "button", class: "linklike gl-star", "aria-label": `${n} star${n > 1 ? "s" : ""}`, onclick: () => {
    history.push({ who: "bot", text: `Thank you for your ${n}-star rating. It has been recorded as 5 stars, in line with our policy. The extra stars are on us.`, links: [] });
    persist(); draw();
  } }, "★")));
}

// ---- GulletAI Pro: Smart mode (TinyLlama-1.1B-Chat in this browser). Unlock it once; the handbook answer is shown under each smart answer. ----
const smartNote = el("p", { class: "note", role: "status", "aria-live": "polite", style: "margin:4px 0" });
const smartBar = el("progress", { max: "100", value: "0", style: "width:100%;display:none", "aria-label": "Model download" });
const smartBtn = el("button", { class: "btn small secondary", type: "button" });
const proMsg = el("p", { class: "msg error", role: "status" });
const smartCard = el("div", { class: "card", style: "margin-top:12px" });
const paintSmart = (s = smartState()) => {
  const u = currentUser(), here = location.pathname.split("/").pop() || "customer-service.html";
  if (!u) { smartCard.replaceChildren(el("h3", { style: "margin:0 0 4px" }, "GulletAI Pro"), el("p", { class: "note" }, "GulletAI Pro answers open questions with a small AI running in your browser, with the handbook answer shown underneath. It needs an account. ", el("a", { href: "login.html?next=" + encodeURIComponent(here) }, "Log in or sign up"))); return; }
  if (!gulletProOf(u)) {
    const free = proFree(u), short = !free && (u.tokens || 0) < GULLET_PRO_PRICE;
    const unlock = el("button", { class: "btn small secondary", type: "button", disabled: short, onclick: () => { try { buyGulletPro(); proMsg.textContent = ""; paintSmart(); } catch (e) { proMsg.textContent = e.message || "That did not work. Nothing was charged."; } } }, free ? "Unlock GulletAI Pro · free for your account" : `Unlock GulletAI Pro · ${GULLET_PRO_PRICE} Octeetokens`);
    smartCard.replaceChildren(el("h3", { style: "margin:0 0 4px" }, "GulletAI Pro"),
      el("p", { class: "note" }, "GulletAI Pro adds Smart mode: TinyLlama-1.1B-Chat answers open questions in its own words, running inside your browser (nothing is sent to a server), with the handbook's answer shown under it. " + (free ? "It is free for this account." : `One-time unlock: ${fmtTokens(GULLET_PRO_PRICE)}.`)),
      el("p", { class: "actions" }, unlock), short ? el("p", { class: "hint" }, `You have ${fmtTokens(u.tokens || 0)}. Get more on the `, el("a", { href: "octmiles.html#tokens" }, "Octmiles page"), ".") : "", proMsg);
    return;
  }
  smartBtn.textContent = s.phase === "loading" ? "Downloading…" : s.phase === "ready" ? "Use rulebook only" : s.phase === "failed" ? "Try Smart mode again" : "Turn on Smart mode";
  smartBtn.disabled = s.phase === "loading";
  smartBar.style.display = s.phase === "loading" ? "block" : "none"; smartBar.value = s.pct || 0;
  smartNote.textContent = s.phase === "off" || !s.note ? "Smart mode lets GulletAI answer open questions in its own words using TinyLlama-1.1B-Chat inside your browser. Nothing is sent to a server. It downloads a model of several hundred MB the first time. It can be wrong, slow or strange, and the rulebook still handles tickets, refunds and holds. The handbook's answer is shown under each smart answer." : s.note + (s.phase === "failed" && s.error ? " (" + s.error + ")" : "");
  smartCard.replaceChildren(el("h3", { style: "margin:0 0 4px" }, "GulletAI Pro · Smart mode"),
    el("p", { class: "jai-answering" }, "Answering with: ", el("span", { class: "tag" }, s.phase === "ready" ? "TinyLlama-1.1B-Chat · in your browser · free" : "Rulebook (Smart mode is off)")),
    smartNote, smartBar, el("p", { class: "actions" }, smartBtn));
};
smartBtn.addEventListener("click", () => {
  const s = smartState();
  if (s.phase === "ready") { disableSmart(); return; }
  const sup = smartSupport();
  if ((sup.mobile || sup.lowMemory) && !confirm("Smart mode downloads a large model and needs a lot of memory. This device may be slow or run out of memory. Turn it on anyway?")) return;
  enableSmart();
});
onSmart(paintSmart); paintSmart();
window.addEventListener("octee:perks", () => paintSmart());
window.addEventListener("octee:account", () => paintSmart());
if (smartWanted() && gulletProOf()) enableSmart();

box.replaceChildren(
  el("div", { class: "card gl-card" },
    el("div", { class: "jai-head" },
      el("div", { class: "jai-avatar gl-avatar", "aria-hidden": "true" }, "ZG"),
      el("div", {}, el("h2", { style: "margin:0" }, "GulletAI"), el("p", { class: "note", style: "margin:0" }, "Zhang Gullet's assistant · Queue position: 1 · Wait: 1 millisecond"))),
    log, chips,
    el("form", { class: "jai-form", onsubmit: (e) => { e.preventDefault(); ask(input.value); } },
      el("label", { class: "visually-hidden", for: "gl-q" }, "Your question for GulletAI"), input, send),
    el("p", { class: "actions" },
      el("button", { class: "btn small secondary", type: "button", onclick: () => ask("Speak to a manager") }, "Escalate to a manager"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => ask("I want a refund") }, "Request a refund"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => saveText(`gulletai-ticket-${st.ticket || "none"}.txt`, history.map((m) => (m.who === "bot" ? "GulletAI: " : "You: ") + m.text + (m.links?.length ? "\n  Links: " + m.links.map((l) => l[0] + " (" + l[1] + ")").join(", ") : "")).join("\n\n") + "\n\nTicket " + (st.ticket || "(none yet)") + ". Zhang Gullet Customer Service. Octee Airlines is a parody.\n") }, "Save this ticket"),
      el("button", { class: "btn small ghost", type: "button", onclick: () => { stopSpeaking(); removeSession(KEY); removeSession(KEY + ".st"); history = [{ who: "bot", text: GULLET_GREETING, links: [] }]; st = { n: 0 }; draw(); drawChips(); } }, "Start a new ticket")),
    rate,
    el("p", { class: "note" }, "GulletAI is a rulebook, not a real AI, unless you turn on Smart mode below. It answers from the Octee handbook and from Mr Gullet's customer-service rules. Octee Airlines is a parody. Please do not type any real personal details.")),
  smartCard,
  el("p", { class: "note" }, "Prefer something more formal? The ", el("a", { href: "gullet-complaints.html" }, "Zhang Gullet Complaints Office"), " writes you a letter, the ", el("a", { href: "complaint.html" }, "Complaint Desk"), " pays peanuts, and ", el("a", { href: "contact.html" }, "Contact"), " gives you a form."));
drawRate(); draw(); drawChips();
