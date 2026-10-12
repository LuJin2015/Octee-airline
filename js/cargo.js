import { $, el, setMsg, fmtMiles } from "./dom.js";
import { currentUser, requireLogin, updateUser } from "./auth.js";
import { PLACES, placeName, RATES } from "./destinations.js";
import { cargoFareTenths, fmtFujitech, fujitechTenthsOf, spendFujitech } from "./fujitech.js";
import { fujitechUnlimited } from "./perks.js";

const presets = ["Any parcel", "Octee peanuts", "Lost suitcase", "Mysterious airport object", "JoelAI server part", "Other Octee item"];
function routeMiles(from, to) {
  if (from === to) return 0;
  const dist = Object.fromEntries(Object.keys(PLACES).map((x) => [x, Infinity])), seen = new Set(); dist[from] = 0;
  while (true) {
    const here = Object.keys(dist).filter((x) => !seen.has(x)).sort((a,b) => dist[a] - dist[b])[0];
    if (!here || !Number.isFinite(dist[here])) break;
    if (here === to) return dist[here]; seen.add(here);
    for (const [edge, miles] of Object.entries(RATES)) {
      const [a,b] = edge.split("-"); const next = a === here ? b : b === here ? a : null;
      if (next && dist[next] > dist[here] + miles) dist[next] = dist[here] + miles;
    }
  }
  return 180;
}
const user = currentUser();
const form = $("#cargo-form");
const message = $("#cargo-msg");
const from = $("#cargo-from"), to = $("#cargo-to"), parcel = $("#cargo-parcel"), weight = $("#cargo-weight");
const options = Object.keys(PLACES).map((code) => el("option", { value: code }, `${code} · ${placeName(code)}`));
from.replaceChildren(...options); to.replaceChildren(...options.map((o) => o.cloneNode(true)));
const fillParcels = () => parcel.replaceChildren(...presets.map((x) => el("option", { value: x }, x)));
fillParcels();
function render() {
  const u = currentUser();
  $("#cargo-balance").textContent = u ? fmtFujitech(fujitechTenthsOf(u)) + (fujitechUnlimited(u) ? " · unlimited is on, nothing is deducted" : "") : "Sign in to view balance";
  const kg = Math.max(.1, Number(weight.value) || .1), miles = routeMiles(from.value, to.value), price = cargoFareTenths(miles, kg);
  $("#cargo-price").textContent = fmtFujitech(price);
  $("#cargo-route").textContent = `${miles.toLocaleString("en-GB")} route miles · ${kg} kg`;
  const rows = u?.cargoShipments || [];
  $("#cargo-shipments").replaceChildren(...rows.slice().reverse().map((s) => el("article", { class: "card" }, el("strong", {}, `${s.parcel} · ${s.from} → ${s.to}`), el("p", {}, `${s.weightKg} kg · ${fmtFujitech(s.paidTenths)} · ${new Date(s.createdAt).toLocaleDateString("en-GB")}`))));
}
for (const x of [from, to, weight]) x.addEventListener("input", render);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!currentUser()) { requireLogin(); return; }
  if (from.value === to.value) return setMsg(message, "Choose two different airports.", "error");
  const kg = Number(weight.value), name = $("#cargo-name").value.trim();
  if (!(kg >= .1 && kg <= 1000)) return setMsg(message, "Enter parcel weight from 0.1 to 1,000 kg.", "error");
  if (name.length < 2 || name.length > 60) return setMsg(message, "Add a sender or recipient name (2–60 characters).", "error");
  const fare = cargoFareTenths(routeMiles(from.value, to.value), kg);
  try {
    const shipment = updateUser((u) => {
      spendFujitech(u, fare, `Cargo shipment · ${from.value} → ${to.value}`);
      const description = $("#cargo-custom").value.trim().slice(0, 80);
      const record = { id: crypto.randomUUID(), parcel: description || parcel.value, category: parcel.value, name, from: from.value, to: to.value, weightKg: kg, paidTenths: fare, createdAt: new Date().toISOString() };
      u.cargoShipments = [...(u.cargoShipments || []), record].slice(-100);
      return record;
    });
    setMsg(message, `Shipment ${shipment.id.slice(0, 8).toUpperCase()} booked for ${fmtFujitech(fare)}. The parcel is now under the airport's care.`, "ok");
    form.reset(); fillParcels(); render();
  } catch (err) { setMsg(message, err.message, "error"); }
});
window.addEventListener("octee:account", render);
window.addEventListener("octee:perks", render);
render();
