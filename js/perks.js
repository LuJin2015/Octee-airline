// Special settings the Control Tower publishes (Save to cloud). Today: which accounts have unlimited Fujitech.
// There is deliberately no switch for this anywhere except the Control Tower, and it is not stored in the account itself.
import { fetchPublished } from "./published.js";

let perks = { unlimitedFujitech: {}, freePro: {} };
let loaded = null;
const names = (o) => { const out = {}; for (const [k, v] of Object.entries(o || {})) if (v === true) out[String(k).toLowerCase()] = true; return out; };
const clean = (j) => ({ unlimitedFujitech: names(j && j.unlimitedFujitech), freePro: names(j && j.freePro) });
export function loadPerks(force = false) {
  if (!loaded || force) {
    loaded = fetchPublished("perks", "data/perks.json", { unlimitedFujitech: {}, freePro: {} }).then((j) => {
      const next = clean(j), changed = JSON.stringify(next) !== JSON.stringify(perks);
      perks = next;
      if (changed) { try { window.dispatchEvent(new CustomEvent("octee:perks")); } catch { /* not in a page */ } }
      return perks;
    });
  }
  return loaded;
}
export const currentPerks = () => perks;
// true when the Control Tower has switched unlimited Fujitech on for this account
export const fujitechUnlimited = (u) => !!(u && u.username && perks.unlimitedFujitech[String(u.username).toLowerCase()] === true);
// true when the Control Tower has made JoelAI Pro and GulletAI Pro free for this account
export const proFree = (u) => !!(u && u.username && perks.freePro[String(u.username).toLowerCase()] === true);
loadPerks();
