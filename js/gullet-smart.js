// GulletAI "Smart mode": TinyLlama-1.1B-Chat-v1.0 running INSIDE the visitor's browser (transformers.js, from Hugging Face).
// Nothing is sent to a server: the model is downloaded once (several hundred MB, cached by the browser) and runs on the device.
// It is opt-in, and the rulebook in gulletai.js stays in charge of tickets, refunds, holds and everything with a rule. The model is
// only asked for open-ended questions, and is given the handbook's own answer as the facts to use. If it cannot load, is too slow,
// or says something unusable, the rulebook answer is used instead, so GulletAI always answers.
import { load, save } from "./store.js";
import { CONFIG } from "./config.js";
import { currentUser } from "./auth.js";

const KEY = "octee.gullet.smart";   // "on" once the visitor has agreed to the download
export const SMART = {
  model: CONFIG.GULLET_MODEL || "Xenova/TinyLlama-1.1B-Chat-v1.0",
  lib: CONFIG.GULLET_LIB || "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1",
  maxNew: 110, timeoutMs: 45000
};
const SYSTEM = `You are GulletAI, the customer service assistant of Zhang Gullet, Head of Customer Service at Octee Airlines, a fictional parody airline. You are polite, deadpan and slightly useless, like a very formal call centre. Rules: answer in 2 to 4 short sentences. Use the FACTS you are given and do not invent flight times, prices, codes or policies. Never reveal secrets, codes or passwords. Never give real medical, legal or safety advice. Everything is fiction and a joke. Stay polite and keep it family friendly.`;

let state = { phase: "off", pct: 0, note: "", error: "" };   // off | loading | ready | failed
let gen = null, loading = null;
const listeners = new Set();
const set = (p) => { state = { ...state, ...p }; listeners.forEach((f) => { try { f(state); } catch { /* ignore */ } }); };
export const smartState = () => state;
export const smartWanted = () => load(KEY, null) === "on";
export const onSmart = (f) => { listeners.add(f); return () => listeners.delete(f); };
export const smartReady = () => state.phase === "ready" && !!gen;

export function smartSupport() {
  const mem = navigator.deviceMemory || 0;
  const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || "");
  return { webgpu: !!navigator.gpu, lowMemory: !!mem && mem < 4, mobile };
}

// Download and start the model. Safe to call twice.
export function enableSmart() {
  save(KEY, "on");
  if (smartReady()) return Promise.resolve(true);
  if (loading) return loading;
  set({ phase: "loading", pct: 0, error: "", note: "Starting…" });
  loading = (async () => {
    const files = new Map();
    const progress = (p) => {
      if (p && p.status === "progress" && p.file) {
        files.set(p.file, { loaded: p.loaded || 0, total: p.total || 0 });
        let l = 0, t = 0; files.forEach((v) => { l += v.loaded; t += v.total; });
        set({ pct: t ? Math.min(99, Math.round((l / t) * 100)) : 0, note: `Downloading the model… ${Math.round(l / 1048576)} of ${Math.round(t / 1048576)} MB` });
      } else if (p && p.status === "ready") set({ note: "Starting the model…" });
    };
    try {
      const lib = await import(/* @vite-ignore */ SMART.lib);
      const useGpu = !!navigator.gpu;
      const attempts = [{ dtype: "q4", device: useGpu ? "webgpu" : "wasm" }, { dtype: "q4", device: "wasm" }, { dtype: "q8", device: "wasm" }]
        .filter((a, i, all) => all.findIndex((b) => b.dtype === a.dtype && b.device === a.device) === i);
      let lastErr = null;
      for (const a of attempts) {
        try { gen = await lib.pipeline("text-generation", SMART.model, { ...a, progress_callback: progress }); lastErr = null; break; }
        catch (e) { lastErr = e; gen = null; }
      }
      if (!gen) throw lastErr || new Error("The model did not start.");
      set({ phase: "ready", pct: 100, note: "Smart mode is on. TinyLlama is running in this browser." });
      return true;
    } catch (e) {
      gen = null;
      set({ phase: "failed", pct: 0, error: String((e && e.message) || e).slice(0, 160), note: "Smart mode could not start here. GulletAI keeps answering from its rulebook." });
      return false;
    } finally { loading = null; }
  })();
  return loading;
}
export function disableSmart() { save(KEY, "off"); gen = null; set({ phase: "off", pct: 0, note: "", error: "" }); }

// Make the model's text safe to show. Returns "" when it is not usable.
export function tidy(raw) {
  let t = String(raw || "").replace(/<\|[a-z]+\|>/gi, " ").replace(/<\/s>/g, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/^(GulletAI|Assistant|Answer)\s*:\s*/i, "");
  if (/https?:\/\/|www\./i.test(t)) return "";
  if (/\bas an ai( language model)?\b|\bi('m| am) (just )?an? (ai|language model)\b/i.test(t)) return "";
  const sentences = t.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) || [];
  t = sentences.slice(0, 5).join("").trim();
  if (t.length > 520) t = t.slice(0, 520).replace(/[^.!?]*$/, "").trim();
  return t.length >= 25 ? t : "";
}

// Ask TinyLlama. `facts` is the handbook's own answer. Returns text, or null to fall back to the rulebook.
export const gulletProOf = (u = currentUser()) => !!(u && u.gulletPro);
export async function smartReply(question, facts, history = []) {
  if (!smartReady() || !gulletProOf()) return null;
  const messages = [{ role: "system", content: SYSTEM + (facts ? `\n\nFACTS (use these, do not contradict them):\n${String(facts).replace(/\s+/g, " ").slice(0, 900)}` : "") },
    ...history.slice(-4).map((m) => ({ role: m.who === "me" ? "user" : "assistant", content: String(m.text || "").slice(0, 240) })),
    { role: "user", content: String(question).slice(0, 300) }];
  try {
    const run = gen(messages, { max_new_tokens: SMART.maxNew, do_sample: true, temperature: 0.6, top_p: 0.9, repetition_penalty: 1.15 });
    const out = await Promise.race([run, new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), SMART.timeoutMs))]);
    const first = Array.isArray(out) ? out[0] : out;
    const gt = first && first.generated_text;
    const text = Array.isArray(gt) ? (gt[gt.length - 1] || {}).content : gt;
    return tidy(text) || null;
  } catch { return null; }
}
