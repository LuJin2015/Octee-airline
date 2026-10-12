// GulletAI: the customer-service assistant of Zhang Gullet, Head of Customer Service (the only member).
// Like JoelAI it is a rulebook, not a real AI: it has its own customer-service rules (refunds, holds,
// escalation) and passes everything else to the airport handbook, then answers it in Gullet's voice.
import { converse, SECRET } from "./joelbrain.js";
import { pickRand } from "./joelkb.js";
import { currentUser } from "./auth.js";
import { peanutsOf } from "./peanuts.js";
import { addTicket, updateTicket, ticketsFor, statusOf, KINDS } from "./gullettickets.js";
import { inWindow, nextWindow, span, DAYS } from "./gulletwindow.js";
import { placeShort } from "./destinations.js";
import { smartReply } from "./gullet-smart.js";

const R = (text, chips = [], links = []) => ({ text, links, chips });
const P = (...a) => a.join("\n\n");
const ticketNo = () => "GA-" + String(Math.floor(Math.random() * 9000) + 1000);

export const GULLET_GREETING = "Thank you for contacting Zhang Gullet Customer Service. I am GulletAI. Your call is important to us. You are caller number 1 in the queue, and so are the other callers. How may I fail to help you today?";
export const GULLET_CHIPS = ["I want a refund", "My flight is delayed", "My bag is lost", "When can I speak to Mr Gullet?", "My tickets", "How do I get from MFIA to SIA?", "Can I take a chainsaw on board?", "What can you do?"];

const CLOSERS = [
  "I hope this has resolved your query. If it has not, it will be resolved by the passage of time.",
  "Is there anything else I can help you with? Please choose carefully. Every question has a cost, and the cost is a ticket.",
  "Thank you for your patience. We have received a great deal of it.",
  "Your feedback is important to us. It will be filed under 'Important', in the cupboard.",
  "This answer has been reviewed by a person. The person was Zhang Gullet. He reviewed it once, quickly."
];
const OPENERS = ["Thank you for asking.", "Certainly.", "Of course.", "I understand your question."];

const RULES = [
  [/\b(who|what) (is|are) (zhang )?gullet\b|zhang gullet|\bgullet ?ai\b|who (are|is) you/, () => R(P(
    "Zhang Gullet is the Head of Customer Service at Octee Airlines. He is also the Deputy Head, the Team, and the Department.",
    "I am GulletAI, his assistant. I do not sleep, I do not eat and I do not escalate, unless you press Escalate, in which case I sigh. I am a rulebook, not a real AI: I answer from the airport handbook and from Mr Gullet's customer-service rules.",
    "Mr Gullet is at his desk. He is looking at the telephone. The telephone is looking at him."), ["What can you do?", "Speak to a manager"])],
  [/\b(refund|money back|reimburs\w*|compensat\w*|cancel (my )?(booking|flight|ticket))\b/, () => R(P(
    "I am sorry to hear that you would like a refund. I have good news and I have news.",
    "The good news: every refund is approved instantly. The news: refunds are issued in the form of an apology, which is also instant, and arrives by itself within the next few seconds, from Joel, who is sorry.",
    "If you would prefer something more tangible, a complaint (up to 6 peanuts) pays out in the Peanut Wallet. Octmiles are never refunded. They were never really yours. They were ours, and we lent them to you with love."),
    ["How do I make a complaint?", "Speak to a manager"], [["Gullet Complaints Office", "gullet-complaints.html"], ["Complaint Desk", "complaint.html"], ["Peanut Wallet", "peanuts.html"]])],
  [/\b(hold|queue|wait|waiting|how long|opening hours|open|hours|phone|call centre|call center|telephone|speak to (a )?(human|person|agent|someone))\b.*|^(hello\??|anyone there\??)$/, (q) => /\b(human|person|agent|someone|real)\b/.test(q)
    ? R(P("I understand you would like to speak to a person. I am very nearly one.", "A person is available between 03:00 and 03:01 each Tuesday. The caller before you has been there since the previous Tuesday. Please remain on the line. Your call is important to us. We will play you some waiting music, which is silence, but with a rhythm. You may try it on the Hold Line page."), ["Speak to a manager", "How long is the wait?"], [["Hold Line", "gullet-hold.html"]])
    : R(P("The current wait is 1 millisecond. It is always 1 millisecond. It becomes longer when you look at it.", "Our opening hours are 24 hours, from 00:00 to 00:00. The telephone lines are open, and so is the telephone. There is no one on the other end of it, which is why it is so quick. You are welcome to try the Hold Line, where you are caller number 1."), ["Speak to a human", "I want a refund"], [["Hold Line", "gullet-hold.html"]])],
  [/\b(manager|supervisor|escalate|escalation|boss|someone in charge|in charge)\b/, () => R(P(
    "I will escalate this to a manager. Please hold.",
    "…",
    "I am sorry. The manager is Sir Peanuel Nut. Sir Peanuel Nut is not seen. He has read your message, and he has replied with a nod, which I am told is a very senior one. Your issue is now 'Escalated' and will be 'De-escalated' within 4 to 6 working eternities."), ["Rate my service", "How long is the wait?"])],
  [/\b(complain|complaint|complaints|report (a )?problem)\b/, () => R(P("I am sorry to hear that you wish to complain. You may complain to Mr Gullet in person. He will read it aloud to the telephone, and reply by hand, and you will get a ticket number that begins with ZG.", "If you prefer the automatic desk, it replies at once and is signed by a peanut."), ["Speak to a manager", "I want a refund"], [["Zhang Gullet Complaints Office", "gullet-complaints.html"], ["Automatic Complaint Desk", "complaint.html"]])],
  [/\b(rate|rating|review|survey|feedback|stars?)\b/, () => R(P("Thank you for offering to rate us. Please pick a star using the stars below the chat. Whatever you choose, it is recorded as five. This is our policy, and our policy is thrilled with itself.")  , ["I want a refund", "What can you do?"])],
  [/\b(thanks?|thank you|cheers|ta)\b/, () => R(pickRand(["You are very welcome. It was a pleasure, and also a ticket.", "Thank you for thanking us. This has been logged as a compliment, which is rare, so it has been framed.", "No thank you. Thank you. Whichever is the polite one."]), ["Is there anything else?", "Rate my service"])],
  [/^(bye|goodbye|see you|cya|that is all|that's all|nothing else|no thanks?)\b/, () => R("Thank you for contacting Zhang Gullet Customer Service. Your call has been ended, politely. Your ticket has been closed. It will re-open by itself shortly, as all of them do.", ["Start a new question"])],
  [/\b(lost|missing|where is|find|found)\b.*\b(bag|bags|luggage|suitcase|case)\b|\b(bag|bags|luggage|suitcase)\b.*\b(lost|missing|gone)\b/, (q, c) => R(P(
    `I am sorry about your bag${c.name ? ", " + c.name : ""}. I have checked the baggage hall, which is a hall, and the bag is not in it. This is very good news. It means it is somewhere else.`,
    "Your bag is not lost. It is on a longer trip than you. The Bag Tracker will show its stages, and they are fixed: the sorting room, a gate that is not yours, and a flight to MIA. If nobody claims it, it goes to the Lost Property Auction, where you may bid for your own bag. You cannot open it.",
    "I have opened a ticket for it. The ticket is also lost, but we know where it is: it is with the bag."), ["Speak to a manager", "I want a refund"], [["Bag Tracker", "bagtrack.html"], ["Lost and Found", "lostfound.html"], ["Lost Property Auction", "auction.html"]])],
  [/\b(seat|seats|seating|legroom|aisle|upgrade)\b/, (q, c) => R(P(
    "Seats. A subject close to our hearts and not to our legs.",
    "You choose a seat on the seat map at check-in, and you may only sit in your own class's cabin. Seats marked with a ~ are unavailable, spiritually. A better class costs Octeetokens, and the Upgrade Lottery gives you a different seat for ten tokens a spin. It is not always a better one. It is always a seat.",
    c.name ? `If your seat is not satisfactory, ${c.name}, please complain. I will read it aloud to the telephone.` : "If your seat is not satisfactory, please complain. I will read it aloud to the telephone."), ["How do I check in?", "How do I make a complaint?"], [["Check-in", "checkin.html"], ["Upgrade Lottery", "upgrade.html"]])],
  [/\b(octmiles?|miles|tier|points)\b/, (q, c) => R(P(
    c.u ? `Certainly. You have ${(c.u.octmiles || 0).toLocaleString("en-GB")} Octmiles${c.name ? ", " + c.name : ""}. They are a measure of how far you have gone, and how far we have not.` : "Octmiles are the airline's miles. You may have them if you log in. They are not refundable. They were never really yours. They were ours, and we lent them to you with love.",
    "They only come from flights (and from codes, about which I know nothing). Your tier depends on lifetime miles, so spending miles never lowers it. Turning Octmiles into Octeetokens is one way, at 10 to 1."), ["Speak to a manager", "What can you do?"], [["Octmiles", "octmiles.html"]])],
  [/\b(peanuts?|wallet)\b/, (q, c) => R(P(
    c.u ? `You have ${peanutsOf(c.u)} peanut${peanutsOf(c.u) === 1 ? "" : "s"}${c.name ? ", " + c.name : ""}. I would not spend them all in one place. Duty Free would be that place.` : "Peanuts are the airline's other currency. Log in and I can say how many you hold. Please do not eat them.",
    "They come from apology letters, complaints (up to 6 each) and the games. Spend them at the Peanut Shop, in Duty Free, and at the Lost Property Auction."), ["What is in Duty Free?", "How do I make a complaint?"], [["Peanut Wallet", "peanuts.html"], ["Duty Free", "dutyfree.html"]])],
  [/\b(duty ?free|souvenir|shop|banned|not allowed|prohibited)\b/, () => R(P(
    "Duty Free sells things you cannot take on board. There are now 32 of them, including a chainsaw, a jar of lightning and a retired eel. You may buy any of them. You may not carry any of them. A receipt is issued, and so is a reason.",
    "If you are unsure whether something may go on the plane, use the Security Scan at the top of the Duty Free page. The answer is no. The reason is the interesting bit."), ["I want a refund", "What can you do?"], [["Duty Free", "dutyfree.html"]])],
  [/\b(check ?in|checking in|boarding pass|online check)\b/, (q, c) => R(P(
    "Certainly. To check in: log in, open Check-in in the menu, choose your flight, pick a seat on the seat map, and press Check in. Each passenger gets a seat, and a boarding pass that you may print.",
    "Check-in opens 24 hours before departure, and closes 1 millisecond after it opens, but only in theory. If the page says a seat is unavailable, it is unavailable spiritually."), ["My seat", "Speak to a manager"], [["Check-in", "checkin.html"], ["My account", "account.html"]])],
  [/\b(wifi|wi-fi|internet|connection on board)\b/, () => R(P(
    "Octee Wi-Fi is available on all flights, and in the terminal, and in principle. The network is called OcteeFree. The password is a secret, so I have not been told it. It is, I am told, on a peanut.",
    "If it will not connect, please try turning yourself off and on again. If it still will not connect, please complain, and I will read your complaint to the router."), ["How do I make a complaint?", "What can you do?"], [["Octee Wi-Fi", "wifi.html"]])],
  [/\b(meal|food|menu|hungry|snack|vegetarian|vegan|halal|kosher|allergy|allergic|gluten)\b/, () => R(P(
    "Every meal on Octee is a peanut in a different mood: roasted, salted, thoughtful. You may pre-order one, and the receipt prints on A4.",
    "For dietary needs, please pre-order and tell us. We will note it on the ticket. The note will be taken seriously, and then eaten by the peanut."), ["What can you do?", "Speak to a manager"], [["Meal pre-order", "meal.html"]])],
  [/\b(wheelchair|special assistance|disabled|disability|mobility|reduced mobility|assistance|help me board|carry my)\b/, () => R(P(
    "I am very glad you asked. Special assistance is available at FIA on request: please tell a member of staff, and Joel will come. He will be sorry, he will be slightly late, and he will help.",
    "You may also call the JOELMOBILE to your gate. It will take you there, by the longest route that works. Please allow extra time. We always do, and we are always late anyway."), ["Speak to a manager", "What can you do?"], [["JOELMOBILE", "joelmobile.html"], ["FIA airport", "fia.html"]])],
  [/\b(change|rebook|re-book|move|reschedule|amend)\b.*\b(booking|flight|ticket|seat|date)\b|\b(booking|flight|ticket)\b.*\b(change|rebook|reschedule|amend)\b/, () => R(P(
    "To change a booking: cancel it in your account and book a new one. It is the same thing, but with feeling. Octmiles from a cancelled flight are not earned, so please do not cancel the one you already took.",
    "If the flight is delayed, we will have changed it for you. That is the only change we are good at."), ["I want a refund", "My flight is delayed"], [["My account", "account.html"], ["Book a flight", "book.html"]])],
  [/\b(lounge|vip|first class lounge)\b/, () => R(P("The Octee lounge is a bench near Gate B3. It has a plant. The plant is a member. You may sit near it, and it will pretend not to see you.", "For a better seat in a better place, try the Upgrade Lottery. Not a better lounge. A different seat."), ["My seat", "What can you do?"], [["Upgrade Lottery", "upgrade.html"]])],
  [/\b(what can you do|help|options|menu)\b/, () => R(P("I can help with: refunds (an apology), compensation (peanuts), lost bags (found, in a way), delays (1 millisecond), escalation (a nod), and anything on this website. For the rest, I will say so and open a ticket.", "You can also ask me anything that you would ask JoelAI. I use the same handbook, but I am more polite and slightly slower."), ["I want a refund", "My bag is lost", "Speak to a manager", "Tell me a joke"])],
  [/\b(joke|funny)\b/, () => R("A passenger asks Customer Service for a refund. Customer Service gives him one. It is an apology. The passenger leaves satisfied, and so does Customer Service. This is the joke. It is called 'service'.", ["Another joke", "I want a refund"])]
];

const YES = /^(yes|yeah|yep|yup|sure|it has|it is|resolved|that is all|that's all|thank(s| you)|all good|solved|resolved, thank you)\b/;
const NO = /^(no|nope|not really|not at all|it has not|it hasn'?t|still|escalate|please escalate)\b/;

function theName(st, u) {
  const m = /\b(?:my name is|call me|i am called|name'?s)\s+([a-z][a-z' -]{1,18})/i.exec(st.said || "");
  if (m) return m[1].trim().replace(/\b\w/g, (x) => x.toUpperCase());
  return st.name || u?.username || "";
}

export async function gulletAnswer(raw, st = {}) {
  const t = String(raw || "").trim();
  const q = t.toLowerCase();
  if (!t) return R("You did not say anything. This is the most we hear all day. Please say something, or press a chip.", GULLET_CHIPS.slice(0, 4));
  const u = (() => { try { return currentUser(); } catch { return null; } })();
  const owner = u?.username || "guest";
  st.n = (st.n || 0) + 1; st.said = t;
  st.name = theName(st, u); delete st.said;
  const name = st.name;
  const c = { u, name };
  let tk = "";
  if (!st.ticket) {
    st.ticket = ticketNo();
    addTicket({ ticket: st.ticket, kind: "chat", title: t.slice(0, 60), owner });
    tk = `Your ticket number is ${st.ticket}. `;
  }
  // "Have I resolved your issue?"
  if (st.pending === "resolved") {
    if (YES.test(q)) {
      st.pending = null; st.since = 0; updateTicket(st.ticket, owner, { closed: true });
      return R(`I am glad${name ? ", " + name : ""}. Ticket ${st.ticket} is closed. It will re-open by itself shortly, as they all do. Thank you for contacting Zhang Gullet Customer Service.`, ["Start a new question", "Rate my service"]);
    }
    if (NO.test(q)) {
      st.pending = null; st.since = 0;
      return R(`I am sorry that I have not resolved it${name ? ", " + name : ""}. I will escalate ticket ${st.ticket}. Sir Peanuel Nut has been told. He has nodded, which is the highest form of attention we have. Please describe the problem again, and I will fail more slowly.`, ["Speak to a manager", "How do I make a complaint?"]);
    }
    st.pending = null;
  }
  const finish = (r) => {
    r.text = tk + r.text;
    st.since = (st.since || 0) + 1;
    if (st.since >= 2 && !st.pending && !/^(bye|goodbye)/.test(q)) {
      st.pending = "resolved"; st.since = 0;
      r.text += `\n\nHave I resolved your issue${name ? ", " + name : ""}? Please say Yes or No.`;
      r.chips = ["Yes, thank you", "No, please escalate"];
    }
    return r;
  };
  // secrets and codes: always the handbook's refusal, unchanged
  if (SECRET.test(q)) { const r = await converse(t); return { ...r, chips: ["What can you do?", "Speak to a manager"], text: tk + r.text }; }
  if (/^(what is my name|who am i)\??$/.test(q)) return finish(R(name ? `Your name is ${name}. It is on the ticket. I wrote it in pen, and then in a better pen.` : "I do not know your name. If you tell me ('my name is ...'), I will remember it for this ticket. I will not be able to pronounce it, but I will remember it.", ["What can you do?"]));
  if (/\b(my name is|call me)\b/.test(q)) return finish(R(`Thank you${name ? ", " + name : ""}. I have written your name on the ticket. I will use it, carefully, like a pen.`, GULLET_CHIPS.slice(0, 4)));
  // ticket lookup: "what is the status of ZG-1234"
  const tn = /\b(ga|zg|hl)[- ]?(\d{4})\b/i.exec(t);
  if (tn) {
    const id = tn[1].toUpperCase() + "-" + tn[2], found = ticketsFor(owner).find((x) => x.ticket === id);
    return finish(found
      ? R(`Ticket ${id} (${KINDS[found.kind] || "ticket"}${found.title ? ': "' + found.title + '"' : ""}). Status: ${statusOf(found)}`, ["My tickets", "Speak to a manager"], [["My account", "account.html"]])
      : R(`I do not have a ticket ${id} in this browser. Tickets are kept where they were made, and under the name they were made with. It may be in the cupboard. Joel has been told.`, ["My tickets", "How do I make a complaint?"]));
  }
  if (/\b(my|all|list|show)\b.*\b(tickets?|cases?|complaints?)\b|\bticket (history|list)\b|\bwhat tickets\b/.test(q) && !/how do i/.test(q)) {
    const mine = ticketsFor(owner).slice(0, 5);
    return finish(mine.length
      ? R(P(`You have ${mine.length} recent ticket${mine.length === 1 ? "" : "s"}${name ? ", " + name : ""}:`, mine.map((x) => `${x.ticket} · ${KINDS[x.kind] || "ticket"} · ${statusOf(x)}`).join("\n")), ["Speak to a manager", "How do I make a complaint?"], [["Ticket history", "account.html"]])
      : R("You have no tickets yet. This is very rare. Please make one, and I will keep it safe.", ["How do I make a complaint?", "I want a refund"], [["Complaints Office", "gullet-complaints.html"]]));
  }
  if (/\b(my|upcoming|next)\b.*\b(flights?|trips?|bookings?|reservations?)\b/.test(q) && !/\b(change|cancel|rebook|refund|delayed|late)\b/.test(q)) {
    const legs = (u?.trips || []).flatMap((b) => (b.legs || []).map((l) => ({ b, l }))).sort((a, b2) => (a.l.date + a.l.dep).localeCompare(b2.l.date + b2.l.dep));
    return finish(!u ? R("Please log in, and I will look at your bookings. I cannot see through walls, only through gates.", ["What can you do?"], [["Log in", "login.html?next=customer-service.html"]])
      : legs.length ? R(P(`You have ${legs.length} flight${legs.length === 1 ? "" : "s"} booked${name ? ", " + name : ""}. The next ones are:`, legs.slice(0, 4).map(({ b, l }) => `${l.no} · ${l.date} · ${placeShort(l.from)} → ${placeShort(l.to)} · departs ${l.dep} (booking ${b.ref || "—"})`).join("\n"), "All of them are on time, in the sense that we have not yet said otherwise."), ["My flight is delayed", "Check-in"], [["My account", "account.html"]])
      : R("You have no flights booked. I am sorry. It is the best way to avoid a delay, but it is not a good way to get to Scraggy House.", ["What can you do?"], [["Book a flight", "book.html"]]));
  }
  // when can I speak to Mr Gullet?
  if (/\b(when|what time)\b.*\b(speak|talk|call|reach|pick ?up|answer|phone|ring|contact|available)\b|\bpicks? up\b|\bmr gullet'?s? (hours|window)\b/.test(q)) {
    const d = new Date(), nw = nextWindow(d);
    return finish(R(inWindow(d)
      ? "It is Tuesday, between 03:00 and 03:01. Mr Gullet can pick up right now. Please go to the Hold Line, and hurry. It is one minute."
      : P(`Mr Gullet picks up on Tuesdays, from 03:00 to 03:01 (your local time). The next window is ${DAYS[nw.getDay()]} ${nw.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, in ${span(nw - d)}.`, "Until then, I will do. I am slower, but I am here."), ["How long is the wait?", "Speak to a manager"], [["Hold Line", "gullet-hold.html"]]));
  }
  // anger: calm it, and offer the Complaints Office
  const caps = (t.match(/[A-Z]/g) || []).length > 12 && (t.match(/[a-z]/g) || []).length < (t.match(/[A-Z]/g) || []).length * 0.4;
  if (caps || /!{2,}|\b(furious|angry|outraged|unacceptable|ridiculous|disgusting|useless|worst|terrible|awful|pathetic|rubbish|fed up|sick of|hate|stupid)\b/.test(q)) {
    st.anger = (st.anger || 0) + 1;
    updateTicket(st.ticket, owner, { title: "Upset customer" });
    return finish(R(P(`I can hear that you are upset${name ? ", " + name : ""}. I am sorry. I am going to say that slowly, in a calm voice, to the telephone: I am sorry.`,
      st.anger > 1 ? "You have been upset more than once. This is now a Priority Calm ticket. I have given it a biscuit." : "Being upset is allowed. It is the first step of a complaint. The second step is writing it down, and Mr Gullet will read it aloud, with feeling, to the telephone.",
      "If you would like, I can take it to the Complaints Office for you. You will get a handwritten letter. It will not help, but it will be signed."), ["Speak to a manager", "How do I make a complaint?", "I want a refund"], [["Complaints Office", "gullet-complaints.html"]]));
  }
  for (const [re, fn] of RULES) { if (re.test(q)) return finish(fn(q, c)); }
  // everything else: the airport handbook, answered in Gullet's voice
  const r = await converse(t);
  // Smart mode (opt-in, TinyLlama in this browser): it answers in its own words using the handbook's answer as the facts.
  // Anything it cannot do, or is too slow for, falls back to the handbook answer below.
  const smart = await smartReply(t, r.text);
  if (smart) return finish({ ...r, text: smart, smart: true, handbook: r.text, chips: (r.chips && r.chips.length ? r.chips : ["What can you do?", "Speak to a manager"]).slice(0, 4) });
  const opener = pickRand(OPENERS).replace(/\.$/, "") + (name && st.n % 2 ? `, ${name}.` : ".");
  const closer = st.n % 2 ? pickRand(CLOSERS) : "";
  return finish({ ...r, text: opener + " " + r.text + (closer ? "\n\n" + closer : ""), chips: (r.chips && r.chips.length ? r.chips : ["What can you do?", "Speak to a manager"]).slice(0, 4) });
}
