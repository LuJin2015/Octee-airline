import { codeHash, normalizeCode } from "./crypto.js";
import { fetchPublished } from "./published.js";

let cache = null;
export async function loadFlightDiscounts() {
  if (cache) return cache;
  const j = await fetchPublished("flight-discounts", "data/flight-discounts.json", null);
  if (!j) throw new Error("The discount code list is delayed.");
  cache = Array.isArray(j.discounts) ? j.discounts.filter((x) => x && x.hash) : [];
  return cache;
}

export async function checkFlightDiscount(code, { to, classIds = [], used = {} } = {}) {
  const normalized = normalizeCode(code);
  if (!normalized) return { ok: false, reason: "Enter a discount code, or leave the field empty." };
  const hash = await codeHash(normalized);
  const d = (await loadFlightDiscounts()).find((x) => x.hash === hash && x.active !== false);
  if (!d) return { ok: false, reason: "That flight discount code is not active." };
  if (d.expires && d.expires < new Date().toISOString().slice(0, 10)) return { ok: false, reason: "That discount code has expired." };
  if (d.to && d.to !== to) return { ok: false, reason: `This code is only for flights to ${d.to}.` };
  if (d.classId && !classIds.includes(d.classId)) return { ok: false, reason: `This code is only for ${d.className || d.classId}.` };
  const maxUses = Math.max(1, Math.floor(Number(d.maxUsesPerAccount) || 1));
  if ((Number(used[hash]) || 0) >= maxUses) return { ok: false, reason: "This account has already used that discount code." };
  return { ok: true, hash, percent: Math.min(100, Math.max(0, Math.floor(Number(d.percent) || 0))), note: d.note || "Flight discount", to: d.to || "", classId: d.classId || "" };
}
