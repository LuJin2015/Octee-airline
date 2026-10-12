// The JoelAI chat box on the JOELMOBILE page.
import { $, el, reducedMotion, fmtMiles } from "./dom.js";
import { load, save, loadSession, saveSession, removeSession } from "./store.js";
import { proConverse } from "./joelpro.js";
import { actionRow, stopSpeaking } from "./chatextras.js";
import { converse, GREETING, CHIPS, resetState, setPage } from "./joelbrain.js";
import { currentUser } from "./auth.js";
import { proFree } from "./perks.js";
import { smartState, onSmart, enableSmart, disableSmart, smartReady, smartSupport, tinyJoelReply } from "./gullet-smart.js";
import { buyJoelPro, joelTokensOf, joelUsageMonth, JOEL_PRO_PRICE, JOEL_TOKEN_RATE, JOEL_MONTHLY_GRANT, JOEL_MIN_CALL_RESERVE } from "./miles.js";
import { JOEL_MODELS, JOEL_MODEL_DEFAULT } from "./joel-models.js";
import { modelStatus, hasLedger, unlockPro, buyJoelTokens, askModel, ModelError } from "./joelwallet.js";

const KEY = "octee.joelai";
const MODEL_KEY = "octee.joelai.model";
const page = $("#joelai");
if (page) mountJoelAI(page);

// Open JoelAI as a pop-up from the top row of any page.
export function openJoelAI() {
  if (document.querySelector(".jai-modal")) { document.querySelector(".jai-modal #jai-q")?.focus(); return; }
  const close = () => { back.remove(); document.querySelector(".jai-open")?.focus(); };
  const holder = el("section", { class: "jai", "aria-label": "JoelAI, the airport assistant" });
  const back = el("div", { class: "modal-back jai-modal", role: "dialog", "aria-modal": "true", "aria-label": "JoelAI", onclick: (e) => { if (e.target === back) close(); } },
    el("div", { class: "modal", style: "max-width:640px;background:#fff;color:var(--ink)" },
      el("button", { class: "close-x", type: "button", "aria-label": "Close JoelAI", onclick: close }, "×"), holder));
  back.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  document.body.append(back);
  mountJoelAI(holder, "jmq");
  holder.querySelector("input")?.focus();
}

export function mountJoelAI(box, idSuffix = "q") {
  const here = location.pathname.split("/").pop() || "index.html";
  setPage(here);
  // chosen = what the visitor picked (null = never picked). The default is Joel-3.3, but only where the model server answers.
  let chosen = load(MODEL_KEY, null);
  if (chosen && !JOEL_MODELS.some((m) => m.id === chosen)) chosen = null;
  let modelInfo = { state: "checking", why: "" };
  const modelReady = () => modelInfo.state === "ready" && hasLedger();
  const selectedId = () => chosen || (modelReady() ? JOEL_MODEL_DEFAULT : "handbook");
  const selectedModelObj = () => JOEL_MODELS.find((m) => m.id === selectedId()) || JOEL_MODELS[0];
  const handbookModel = JOEL_MODELS.find((m) => !m.model);
  const log = el("div", { class: "jai-log", role: "log", "aria-live": "polite", "aria-label": "Conversation with JoelAI" });
  const input = el("input", { type: "text", id: "jai-" + idSuffix, maxlength: "200", autocomplete: "off", placeholder: "Ask about gates, flights, security, bags, Octmiles…" });
  const send = el("button", { class: "btn", type: "submit" }, "Ask");
  const chips = el("div", { class: "jai-chips", "aria-label": "Suggested questions" });
  const proBox = el("div", { class: "jai-pro" });
  let history = loadSession(KEY, null) || [{ who: "bot", text: GREETING, links: [] }];
  let busy = false;

  const bubble = (m) => el("div", { class: "jai-msg " + m.who },
    el("span", { class: "jai-who" }, m.who === "bot" ? "JoelAI" : "You", m.mood && m.mood !== "calm" ? el("span", { class: "jai-mood" }, "feeling " + m.mood) : ""),
    ...String(m.text).split("\n\n").map((t) => el("p", {}, t)),
    m.usage ? el("p", { class: "jai-usage" }, `${m.usage.inputTokens.toLocaleString("en-GB")} input + ${m.usage.outputTokens.toLocaleString("en-GB")} output = ${m.usage.totalTokens.toLocaleString("en-GB")} tokens · ${m.modelName}`) : "",
    m.handbook ? el("div", { class: "jai-handbook", style: "margin-top:8px;padding:8px 10px;border-left:3px solid var(--line,#ccc);background:rgba(0,0,0,.04);font-size:.92em" }, el("strong", {}, "From the handbook"), ...String(m.handbook).split("\n\n").map((t) => el("p", { style: "margin:4px 0" }, t))) : "",
    m.note ? el("p", { class: "jai-usage jai-note" }, m.note) : (m.via ? el("p", { class: "jai-usage" }, m.via) : ""),
    m.links?.length ? el("p", { class: "jai-links" }, m.links.map(([label, href]) => el("a", { class: "tag", href, ...(/^https?:/.test(href) ? { target: "_blank", rel: "noopener noreferrer" } : {}) }, label))) : "",
    m.who === "bot" && !m.error && history.indexOf(m) > 0 ? actionRow(m.text, { up: "Joel is glad. Joel is always glad. Joel is also sorry.", down: "Sorry! Joel will try again. Ask it another way and Joel will look in a different drawer." }) : "");
  const draw = () => { log.replaceChildren(...history.map(bubble)); log.scrollTop = log.scrollHeight; };
  const drawChips = (list = (here === "joelmobile.html" ? CHIPS : ["What is this page?", ...CHIPS.slice(0, 5)])) => chips.replaceChildren(...list.map((c) => el("button", { type: "button", class: "jai-chip", onclick: () => ask(c) }, c)));

  const problem = (msg) => { proBox.querySelector(".msg.error")?.remove(); proBox.append(el("p", { class: "msg error", role: "status" }, msg)); };
  const pending = async (btn, work) => { btn.disabled = true; try { await work(); } catch (e) { problem(e.message || "That did not work. Nothing was charged."); btn.disabled = false; } };

  // Joel-TinyLlama: runs in this browser, so no model server, no cloud account and no JoelTokens are involved.
  function drawLocal(model) {
    const s = smartState();
    const choices = el("select", { class: "jai-model-select", "aria-label": "JoelAI Pro model", onchange: (e) => { chosen = e.target.value; save(MODEL_KEY, chosen); drawPro(); } },
      JOEL_MODELS.map((m) => el("option", { value: m.id, selected: m.id === model.id }, `${m.name} · ${m.detail}`)));
    const btn = el("button", { class: "btn small secondary", type: "button", disabled: s.phase === "loading", onclick: () => {
      if (s.phase === "ready") { disableSmart(); return; }
      const sup = smartSupport();
      if ((sup.mobile || sup.lowMemory) && !confirm("This downloads a large model and needs a lot of memory. This device may be slow or run out of memory. Turn it on anyway?")) return;
      enableSmart();
    } }, s.phase === "loading" ? "Downloading…" : s.phase === "ready" ? "Unload the model" : s.phase === "failed" ? "Try again" : "Download and turn on TinyLlama");
    const note = s.phase === "off" || !s.note ? "TinyLlama-1.1B-Chat runs inside your browser: nothing is sent to a server and it costs no JoelTokens. The first time it downloads several hundred MB. It can be wrong, slow or strange, so the handbook answer is shown under each reply." : s.note + (s.phase === "failed" && s.error ? " (" + s.error + ")" : "");
    proBox.replaceChildren(
      el("div", { class: "jai-pro-row" }, el("strong", {}, "JoelAI Pro"), choices),
      el("p", { class: "jai-answering" }, "Answering with: ", el("span", { class: "tag" }, s.phase === "ready" ? "Joel-TinyLlama · in your browser · free" : "Handbook Pro (TinyLlama is not running yet)")),
      el("p", { class: "jai-status" + (s.phase === "failed" ? " warn" : s.phase === "ready" ? " ok" : "") }, note),
      s.phase === "loading" ? el("progress", { max: "100", value: String(s.pct || 0), style: "width:100%", "aria-label": "Model download" }) : "",
      el("p", { class: "actions" }, btn));
  }
  onSmart(() => { if (currentUser()?.joelPro && selectedModelObj().local) drawPro(); });

  function drawPro() {
    const u = currentUser();
    if (!u) {
      proBox.replaceChildren(el("p", { class: "note" }, "JoelAI Pro needs an account. ", el("a", { href: "login.html?next=" + encodeURIComponent(here) }, "Log in or sign up")));
      return;
    }
    const ledger = hasLedger();
    if (!u.joelPro) {
      const free = proFree(u), price = free ? 0 : JOEL_PRO_PRICE, short = (u.tokens || 0) < price;
      const unlock = el("button", { class: "btn small secondary", type: "button", disabled: short, onclick: (e) => pending(e.target, async () => {
        if (ledger) await unlockPro(); else buyJoelPro();
        drawPro();
      }) }, free ? "Unlock JoelAI Pro · free for your account" : `Unlock JoelAI Pro · ${price} Octeetokens`);
      const controls = [
        el("div", { class: "jai-pro-copy" }, el("strong", {}, "JoelAI Pro"), " · Longer handbook answers built from the real timetable, a random page to explore, and questions to ask next. With a cloud account you also get a model and a monthly JoelToken allowance."),
        el("p", { class: "note" }, free ? "JoelAI Pro is free for this account. " : `One-time unlock: ${price} Octeetokens. ` + (ledger ? "The cloud records it, so it follows you to every device." : "This account is not in the cloud, so Pro works as the handbook only.")),
        unlock
      ];
      if (short && !free) controls.push(el("p", { class: "hint" }, `You have ${fmtMiles(u.tokens || 0)} Octeetokens. Get more on the `, el("a", { href: "octmiles.html#tokens" }, "Octmiles page"), "."));
      if (!ledger) controls.push(el("p", { class: "hint" }, "Want the model too? ", el("a", { href: "login.html?next=" + encodeURIComponent(here) }, "Log in with a cloud account"), " first."));
      proBox.replaceChildren(...controls);
      return;
    }

    const model = selectedModelObj(), usingModel = !!model.model && modelReady();
    if (model.local) { drawLocal(model); return; }
    const choices = el("select", { class: "jai-model-select", "aria-label": "JoelAI Pro model", onchange: (e) => { chosen = e.target.value; save(MODEL_KEY, chosen); drawPro(); } },
      JOEL_MODELS.map((m) => el("option", { value: m.id, selected: m.id === model.id }, `${m.name} · ${m.detail}`)));

    // 1. which model is answering, and can it?
    let status;
    if (modelInfo.state === "checking") status = el("p", { class: "jai-status" }, "Checking the model server…");
    else if (modelInfo.state !== "ready") {
      status = el("p", { class: "jai-status warn" }, el("strong", {}, "Model unavailable here. "), modelInfo.why + " ",
        modelInfo.state === "file" ? "Run the site through a local server, or deploy it to Vercel with the AI service switched on, to get model answers. " : modelInfo.state === "none" ? "Model answers need the site on Vercel (or JOELAI_API_URL pointing at it). " : "",
        model.model ? el("button", { class: "btn small ghost", type: "button", onclick: () => { chosen = handbookModel.id; save(MODEL_KEY, chosen); drawPro(); } }, "Use Handbook JoelAI") : el("span", {}, "Handbook JoelAI is answering."),
        " ", el("button", { class: "linklike", type: "button", onclick: async () => { modelInfo = { state: "checking", why: "" }; drawPro(); modelInfo = await modelStatus(true); drawPro(); } }, "Check again"));
    } else status = !hasLedger() ? el("p", { class: "jai-status warn" }, el("strong", {}, "Model unavailable here. "), "Model answers need a cloud account. ", el("a", { href: "login.html?next=" + encodeURIComponent(here) }, "Log in"), ", or keep using Handbook JoelAI.") : el("p", { class: "jai-status ok" }, "Model server ready.");
    const answering = usingModel ? `${model.name} · ${model.detail}` : model.model ? "Handbook Pro (the model is unavailable, so Joel uses the handbook)" : "Handbook Pro · free, works everywhere";

    // 2. the wallet, shown the same way everywhere (the numbers come from the server's ledger)
    const month = u.joelUsage?.month === joelUsageMonth() ? u.joelUsage : { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const usedMonthly = u.joelMonthlyUsage?.month === joelUsageMonth() ? Math.max(0, u.joelMonthlyUsage.usedTokens || 0) : 0;
    const [year, monthNo] = joelUsageMonth().split("-").map(Number);
    const resetDate = new Date(Date.UTC(year, monthNo, 1)).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
    const wallet = el("div", { class: "jai-wallet-box" },
      el("p", { class: "jai-wallet" }, el("strong", {}, fmtMiles(joelTokensOf(u))), " JoelTokens"),
      el("ul", { class: "jai-wallet-list" },
        el("li", {}, `Monthly allowance: ${fmtMiles(Math.max(0, JOEL_MONTHLY_GRANT - usedMonthly))} of ${fmtMiles(JOEL_MONTHLY_GRANT)} left · refreshes ${resetDate} UTC`),
        el("li", {}, `Bought with Octeetokens: ${fmtMiles(Math.max(0, u.joelPaidTokens || 0))} (carries over)`),
        el("li", {}, `Used this month: ${fmtMiles(month.totalTokens)} model tokens (${fmtMiles(month.inputTokens)} in + ${fmtMiles(month.outputTokens)} out)`)),
      el("p", { class: "note" }, hasLedger() ? "Charged 1:1 from the input and output tokens the model reports, and counted by the cloud, not by this browser. A failed request costs nothing. The last four chat messages go to the model provider: no passwords or sensitive details." : "Handbook Pro costs no JoelTokens."));
    const topups = hasLedger() ? [1, 5, 10].map((n) => el("button", { class: "btn small ghost", type: "button", disabled: (u.tokens || 0) < n, onclick: (e) => pending(e.target, async () => { await buyJoelTokens(n); drawPro(); }) }, `+${fmtMiles(n * JOEL_TOKEN_RATE)} JoelTokens · ${n} Octeetoken${n === 1 ? "" : "s"}`)) : [];
    proBox.replaceChildren(
      el("div", { class: "jai-pro-row" }, el("strong", {}, "JoelAI Pro"), choices),
      el("p", { class: "jai-answering" }, "Answering with: ", el("span", { class: "tag" }, answering)),
      status, wallet, topups.length ? el("div", { class: "jai-topups" }, topups) : "");
  }

  async function proAnswer(selected, messages) {
    const reserve = JOEL_MIN_CALL_RESERVE + messages.reduce((n, m) => n + m.content.length, 0);
    const u = currentUser();
    if (!u) throw new ModelError("Log in to use JoelAI Pro. Nothing was charged.");
    if (joelTokensOf(u) < reserve) throw new ModelError(`Keep ${fmtMiles(reserve)} JoelTokens available for this chat first. Buy a top-up above. Nothing was charged.`);
    const data = await askModel(selected.id, messages);
    drawPro();
    return { ...data, modelName: selected.name };
  }

  async function ask(text) {
    text = text.trim();
    if (!text || busy) return;
    busy = true; send.disabled = true;
    history.push({ who: "me", text });
    const typing = el("div", { class: "jai-msg bot typing" }, el("span", { class: "jai-who" }, "JoelAI"), el("p", {}, "Joel is thinking… (he is not)"));
    draw(); log.append(typing); log.scrollTop = log.scrollHeight;
    input.value = "";
    const t0 = performance.now();
    let res;
    const pro = !!currentUser()?.joelPro;
    const sel = selectedModelObj();
    const messages = history.filter((m) => m.who === "me" || m.who === "bot").slice(-4).map((m) => ({ role: m.who === "me" ? "user" : "assistant", content: String(m.text).slice(0, 300) }));
    try {
      if (pro && sel.local) {
        res = await proConverse(text);
        const hb = res.text, tiny = smartReady() ? await tinyJoelReply(text, hb, history.slice(0, -1)) : null;
        if (tiny) res = { ...res, text: tiny, handbook: hb, via: "Answered by Joel-TinyLlama in your browser. Nothing was charged." };
        else res.via = smartReady() ? "TinyLlama could not answer that one, so Handbook JoelAI did." : "TinyLlama is not running yet, so Handbook JoelAI answered. Turn it on in the JoelAI Pro panel.";
      }
      else if (pro && sel.model && modelReady()) res = await proAnswer(sel, messages);
      else if (pro) {
        res = await proConverse(text);
        if (sel.model) res.via = `Answered by Handbook JoelAI · ${modelInfo.state === "checking" ? "the model server was still being checked" : "model unavailable here"}. Nothing was charged.`;
      } else res = await converse(text);
    } catch (e) {
      // the model failed before anything was charged: the handbook answers, and says so in one line
      if (pro && sel.model) { try { res = await proConverse(text); res.note = `${e.message || "The model could not answer."} Handbook JoelAI answered instead.`; } catch {} }
      if (!res) res = { text: e.message || "Something went wrong. Please blame Joel.", links: [], error: true };
      if (e instanceof ModelError) { drawPro(); }
    }
    const wait = reducedMotion() ? 0 : Math.min(2200, 400 + res.text.length * 3);
    await new Promise((r) => setTimeout(r, Math.max(0, wait - (performance.now() - t0))));
    history = history.slice(-40);
    if (!reducedMotion() && res.text.length > 60) {
      const words = res.text.split(" "), step = Math.max(1, Math.ceil(words.length / 70));
      const live = el("div", { class: "jai-msg bot" }, el("span", { class: "jai-who" }, "JoelAI"), el("p", {}, ""));
      typing.remove(); draw(); log.append(live);
      for (let i = step; i < words.length + step; i += step) {
        live.querySelector("p").textContent = words.slice(0, i).join(" ");
        log.scrollTop = log.scrollHeight;
        await new Promise((r) => setTimeout(r, 22));
      }
    }
    history.push({ who: "bot", text: res.text, links: res.links, mood: res.mood, usage: res.usage, modelName: res.modelName, note: res.note, via: res.via, handbook: res.handbook });
    saveSession(KEY, history);
    draw();
    if (res.chips) drawChips(res.chips);
    busy = false; send.disabled = false; input.focus();
  }

  function saveChat() {
    const txt = history.map((m) => (m.who === "bot" ? "JoelAI: " : "You: ") + m.text + (m.links?.length ? "\n  Links: " + m.links.map((l) => l[0] + " (" + l[1] + ")").join(", ") : "") + (m.usage ? `\n  Usage: ${m.usage.inputTokens} input + ${m.usage.outputTokens} output tokens (${m.modelName})` : "")).join("\n\n") + "\n\n(JoelAI is part handbook, part model-powered assistant. Octee Airlines is a parody.)\n";
    const a = el("a", { href: URL.createObjectURL(new Blob([txt], { type: "text/plain" })), download: "joelai-chat.txt" });
    document.body.append(a); a.click(); a.remove();
  }

  box.replaceChildren(
    el("div", { class: "jai-head" },
      el("div", { class: "jai-avatar", "aria-hidden": "true" }, "J"),
      el("div", {}, el("h2", { style: "margin:0" }, "Ask JoelAI"), el("p", { class: "note", style: "margin:0" }, "Use the airport handbook, or unlock JoelAI Pro for longer answers."))),
    proBox, log, chips,
    el("form", { class: "jai-form", onsubmit: (e) => { e.preventDefault(); ask(input.value); } },
      el("label", { class: "visually-hidden", for: "jai-" + idSuffix }, "Your question for JoelAI"), input, send),
    el("p", { class: "note" }, el("button", { class: "linklike", type: "button", onclick: saveChat }, "Save this chat"), " · ", el("button", { class: "linklike", type: "button", onclick: () => { stopSpeaking(); removeSession(KEY); resetState(); history = [{ who: "bot", text: GREETING, links: [] }]; drawChips(); draw(); } }, "Start again")));
  drawPro(); draw(); drawChips();
  window.addEventListener("octee:account", drawPro);
  window.addEventListener("octee:cloud", drawPro);
  modelStatus().then((info) => { modelInfo = info; drawPro(); });
}
