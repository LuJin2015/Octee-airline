// JoelAI as a trip finder: "how do I get from MFIA to SIA?", "next flight to TDA", "FIA to Tabletop".
// It uses the real timetable (the same trip finder as the booking form), so it can never disagree with it.
// "flights to X" (a list of every flight) is left to the older handbook; this answers "how do I get from A to B".
import { PLACES, normalize, nextDates, describeItinerary, placeName, placeShort, mins, itineraryMiles, rate, OA_PLACES } from "./destinations.js";
import { passengerFareTenths, fmtFujitech, fujitechTenthsOf } from "./fujitech.js";
import { fujitechUnlimited } from "./perks.js";
import { scraggyData } from "./scraggy.js";
import { today, niceDate } from "./dom.js";

// the longest place name or alias found in the text, as whole words
function findPlace(text) {
  const t = " " + String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim() + " ";
  let best = null;
  for (const [code, p] of Object.entries(PLACES)) {
    for (const n of [p.name, p.short, code, ...p.aliases]) {
      const k = String(n).toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim();
      if (k.length < 3 || !t.includes(" " + k + " ")) continue;
      if (!best || k.length > best.len) best = { code, len: k.length, at: t.indexOf(" " + k + " ") };
    }
  }
  return best;
}
const strip = (s) => s.replace(/\b(please|today|tomorrow|tonight|now|airport|the|and|then|on|at)\b.*$/, "").trim();

export function parseRoute(q) {
  const m = q.match(/\bfrom (.+?) to (.+?)(?:[?.!]|$)/) || q.match(/\b(?:get|fly|go|travel|journey|route|way|connect|connection|flight|flights|trip)\b.*?\b(?:from )?(.+?) to (.+?)(?:[?.!]|$)/) || q.match(/^(.+?) (?:to|->|→) (.+?)$/);
  if (m) {
    const a = findPlace(m[1]), b = findPlace(strip(m[2]));
    if (a && b && a.code !== b.code) return { from: a.code, to: b.code };
  }
  // "how do I get to MFIA", "next flight to TDA": from FIA (where you are)
  const n = q.match(/\b(?:how (?:do|can|would) i (?:get|go|fly|travel)|next flight|first flight|earliest flight|way)\b.*?\b(?:to|into) (.+?)(?:[?.!]|$)/);
  if (n) { const b = findPlace(strip(n[1])); if (b && b.code !== "FIA") return { from: "FIA", to: b.code }; }
  return null;
}

export async function routeAnswer(q, state) {
  const r = parseRoute(q);
  if (!r) return null;
  const { routes } = await scraggyData();
  const ups = nextDates(r.from, r.to, routes, today(), 2);
  const fromN = placeName(r.from), toN = placeName(r.to);
  if (state?.last) { state.last.place = placeShort(r.to); state.last.topic = "route"; }
  if (!ups.length) return { text: `I looked, and there is no way to get from ${fromN} to ${toN} in the next three weeks. Not even eventually. Try going somewhere else first. (Every journey here goes through somewhere you did not plan.)`, links: [["Destinations", "destinations.html"]], chips: ["Flights to " + placeShort(r.to), "Plan a trip for me"] };
  const lines = ups.map((u) => {
    const legs = u.it.map((s) => `${s.no} ${placeShort(s.from)} ${s.dep} → ${placeShort(s.to)} ${s.arr}`).join(", then ");
    return `${niceDate(u.date)}: ${legs} (${describeItinerary(u.it)}).`;
  });
  const first = ups[0].it, last = first[first.length - 1];
  const total = mins(last.arr) - mins(first[0].dep);
  let text = `Here is how to get from ${fromN} to ${toN}.\n\n` + lines.join("\n") + `\n\nThe first option takes about ${Math.floor(total / 60)}h ${String(total % 60).padStart(2, "0")}m, in theory. In practice, add the delay.`;
  const hasMfiaFia = ups.some((u) => u.it.some((s) => (s.from === "MFIA" && s.to === "FIA") || (s.from === "FIA" && s.to === "MFIA")));
  if (hasMfiaFia) text += "\n\nNote: the MFIA to FIA leg is Octee Airlines only. No other airline flies it.";
  if (ups.some((u) => u.it.some((s) => s.airline === "SA"))) text += "\n\nScraggy Airlines legs are booked on a second form (the SIA form), one passenger at a time.";
  return { text, links: [["Book it", `book.html?from=${r.from}&to=${r.to}&date=${ups[0].date}`], ["Destinations", "destinations.html"]], chips: ["Flights to " + placeShort(r.to), "Can I take a chainsaw on board?"] };
}

// ---- JoelAI plans a trip: "plan a trip to MIA", "plan a 3 day trip from FIA to TDA", "plan a weekend away", "plan a trip for me" ----
// Real timetable, real fares and Octmiles (the same numbers as the booking form), an outbound flight, a way back, and a short to-do list.
const PLAN_RE = /\b(plan|organi[sz]e|arrange|sort out|help me (?:plan|book|get))\b.{0,30}\b(trip|holiday|weekend|visit|journey|getaway|vacation|break|day out|adventure)\b|\b(trip|holiday|getaway|vacation|weekend away) (?:to|from)\b|\bwhere should i (?:go|fly|travel)\b|\bsend me somewhere\b|\bplan (?:something|a day|my day)\b/;
const TIPS = {
  FIA: "FIA is home: the Peanut Bar is open, and the Lost and Found is where your plans will end up.",
  SIA: "At SIA, ask Scraggy for a tour. He will say yes, and then give you a pamphlet.",
  LIA: "At Lu Pin International, try the noodles. They are the only thing there that arrives on time.",
  SCH: "Scraggy House is a house. It is also an airport. Both facts are true at once; do not ask which.",
  MIA: "Mdm Wrong-Wrong International is wrong in a different way every day. Bring a map you do not trust.",
  TDA: "Tabletop Domestic Airport is on a table. Mind the edges, and the crumbs.",
  MFIA: "MFIA is a transit hub, so the best view is of other people's connections."
};
const addDaysIso = (iso, n) => { const [y, m, d] = iso.split("-").map(Number), dt = new Date(y, m - 1, d + n); return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`; };
const legMiles = (s) => { const stops = [s.from, ...(s.via || []), s.to]; return stops.slice(1).reduce((n, p, i) => n + rate(stops[i], p), 0) || s.miles || 0; };
const legsLine = (it) => it.map((s) => `${s.no} ${placeShort(s.from)} ${s.dep} → ${placeShort(s.to)} ${s.arr}`).join(", then ");
const placesIn = (text) => {
  const t = " " + String(text || "").toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim() + " ", out = [];
  for (const [code, p] of Object.entries(PLACES)) {
    let at = -1;
    for (const n of [p.name, p.short, code, ...p.aliases]) { const k = String(n).toLowerCase().replace(/[^a-z0-9' ]/g, " ").replace(/\s+/g, " ").trim(); if (k.length < 3) continue; const i = t.indexOf(" " + k + " "); if (i >= 0 && (at < 0 || i < at)) at = i; }
    if (at >= 0 && p.oa) out.push({ code, at });
  }
  return out.sort((a, b) => a.at - b.at).map((x) => x.code).filter((c, i, a) => !(c === "FIA" && a.includes("MFIA") && !/\bfia\b|fuji international airport/.test(text.replace(/mt fuji|mount fuji|mfia/g, ""))));
};
export async function planAnswer(q, state, u) {
  if (!PLAN_RE.test(q)) return null;
  const { routes } = await scraggyData();
  const found = placesIn(q);
  let from = "FIA", to = null, chosenForYou = false;
  if (found.length >= 2) [from, to] = found; else if (found.length === 1) { if (found[0] !== "FIA") to = found[0]; else chosenForYou = true; } else chosenForYou = true;
  const dm = q.match(/\b(\d{1,2})\s*(?:-|\s)?(day|night)s?\b/);
  const days = Math.max(1, Math.min(14, dm ? +dm[1] : /\bweekend\b/.test(q) ? 2 : /\bweek\b/.test(q) ? 7 : 3));
  const start = today();
  // find the outbound flight (a random destination if none was named: try each until one has a flight)
  let pool = to ? [to] : OA_PLACES.filter((p) => p !== from).sort(() => Math.random() - 0.5);
  let out = null;
  for (const dest of pool) { const ups = nextDates(from, dest, routes, start, 1); if (ups.length) { to = dest; out = ups[0]; break; } }
  if (!out) {
    const named = pool.length === 1;
    return { text: named ? `I looked at the timetable, and there is no way from ${placeName(from)} to ${placeName(pool[0])} in the next three weeks. Try another place and I will plan around it.` : "I could not find any flights in the next three weeks. That is unusual. It is also very on brand.", links: [["Destinations", "destinations.html"]], chips: ["Plan a trip to MIA", "Plan a weekend trip"] };
  }
  const back = nextDates(to, from, routes, addDaysIso(out.date, days), 1)[0] || null;
  const cost = (it) => it.filter((s) => s.airline !== "SA").reduce((n, s) => n + passengerFareTenths(legMiles(s), "economy", false, 1), 0);
  const fare = cost(out.it) + (back ? cost(back.it) : 0), miles = itineraryMiles(out.it, "economy") + (back ? itineraryMiles(back.it, "economy") : 0);
  const hasSA = out.it.some((s) => s.airline === "SA") || (back && back.it.some((s) => s.airline === "SA"));
  const fromN = placeName(from), toN = placeName(to);
  const summary = `${chosenForYou ? "I picked " + toN + " for you. " : ""}Here is a ${days}-day trip, ${placeShort(from)} → ${placeShort(to)}: out on ${niceDate(out.date)}${back ? `, back on ${niceDate(back.date)}` : ""}, about ${fmtFujitech(fare)} and ${miles.toLocaleString("en-GB")} Octmiles.`;
  const lines = [`Out, ${niceDate(out.date)}: ${legsLine(out.it)} (${describeItinerary(out.it)}).`, back ? `Back, ${niceDate(back.date)}: ${legsLine(back.it)} (${describeItinerary(back.it)}).` : `I could not find a way back within three weeks of ${niceDate(out.date)}. Pick a different length and I will try again.`];
  let money = `Estimated fare in economy, one passenger: ${fmtFujitech(fare)}${hasSA ? " (Scraggy Airlines legs are priced on their own form, so they are not in this number)" : ""}.`;
  if (u) money += fujitechUnlimited(u) ? " Your account has unlimited Fujitech, so nothing is deducted." : ` You have ${fmtFujitech(fujitechTenthsOf(u))}${fujitechTenthsOf(u) >= fare ? ", which is enough." : `, so you are ${fmtFujitech(fare - fujitechTenthsOf(u))} short. Exchange Octmiles on the Octmiles page.`}`;
  const todo = `Before you go: 1) book the flights, 2) check in online and pick a seat, 3) pre-order a peanut meal, 4) track the flight (it will be late). ${TIPS[to] || ""}`.trim();
  if (state?.last) { state.last.place = placeShort(to); state.last.topic = "plan"; }
  return { text: [summary, lines.join("\n"), money, todo, "Want a different place or a different number of days? Ask, for example: \"Plan a 5 day trip to TDA\"."].join("\n\n"),
    links: [["Book it", `book.html?from=${from}&to=${to}&date=${out.date}`], ["Check-in", "checkin.html"], ["Meal pre-order", "meal.html"], ["Destinations", "destinations.html"]],
    chips: ["Plan a weekend trip", "Plan a trip to " + placeShort(pool[0] === to ? "FIA" : to), "How do I check in?"].slice(0, 3) };
}

// "Can I take a chainsaw on board?" -> the Duty Free Security Scan
const CAN = /\b(?:can|may|could|am i allowed to|is it ok(?:ay)? to|is it allowed to|are we allowed to|do you allow)\b.{0,12}?\b(?:i|we|you)?\s*(?:take|bring|carry|pack|board with|travel with|fly with|have|check in|put)\b\s+(.+?)\s+(?:on|onto|in|into|through|past|to|aboard|with me|on board)\b/;
const ALLOWED = /\b(?:allowed|permitted|banned|prohibited|forbidden)\b/;
export async function scanAnswer(q) {
  const m = q.match(CAN) || q.match(/\bis (?:a |an |the |my )?(.+?) (?:allowed|permitted|banned|prohibited|forbidden)\b/);
  if (!m) return null;
  let item = m[1].replace(/^(a|an|the|my|some|any)\s+/, "").trim();
  if (!item || item.length > 40 || /^(it|this|that|they|them|something|anything)$/.test(item)) return null;
  const { scanVerdict, scanAllowed } = await import("./dutyscan.js");
  const ok = scanAllowed(item);
  return { text: `${ok ? "ALLOWED. " : "NOT PERMITTED ON BOARD. "}${scanVerdict(item)}\n\n(That was the Duty Free Security Scan. The answer is always no. The reason is the interesting bit. There are 32 things for sale there that you cannot carry.)`, links: [["Duty Free", "dutyfree.html"]], chips: ["Can I take a trombone on board?", "What is in Duty Free?"] };
}
