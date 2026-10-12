// Permission from the control tower (FAG administration) for codes that need it.
// There is no server, so a "message to the control tower" is kept in this browser:
//  * requests: a list the administration sees when it is opened in this browser;
//  * grants:   how many extra uses each username has been given. A grant made in this browser works here at once.
//    For other devices the administration downloads data/permissions.json and it is committed to the repository.
import { load, save } from "./store.js";
import { fetchPublished } from "./published.js";

const REQUESTS = "octee.tower.requests";
const GRANTS = "octee.tower.grants";
const key = (name) => String(name || "").toLowerCase();

let published = null;
export function publishedGrants() {
  if (!published) {
    published = fetchPublished("permissions", "data/permissions.json", {})
      .then((j) => (j && typeof j.crew === "object" && j.crew ? j.crew : {}))
      .catch(() => ({}));
  }
  return published;
}
export const localGrants = () => load(GRANTS, {}) || {};
// Extra uses this username has been given (the larger of this browser's grant and the published one).
export async function grantsFor(username) {
  const pub = await publishedGrants();
  return Math.max(Number(localGrants()[key(username)]) || 0, Number(pub[key(username)]) || 0);
}
export async function allGrants() {
  const out = { ...(await publishedGrants()) };
  for (const [k, v] of Object.entries(localGrants())) out[k] = Math.max(Number(out[k]) || 0, Number(v) || 0);
  return out;
}
export async function grant(username, n = 1) {
  const map = localGrants();
  map[key(username)] = (await grantsFor(username)) + n;
  save(GRANTS, map);
  save(REQUESTS, pendingRequests().filter((r) => key(r.username) !== key(username)));
}
export const pendingRequests = () => load(REQUESTS, []) || [];
export function requestPermission(username, what) {
  const list = pendingRequests();
  if (!list.some((r) => key(r.username) === key(username))) {
    list.push({ username, what, at: new Date().toISOString() });
    save(REQUESTS, list);
  }
}
export function dismissRequest(username) {
  save(REQUESTS, pendingRequests().filter((r) => key(r.username) !== key(username)));
}
