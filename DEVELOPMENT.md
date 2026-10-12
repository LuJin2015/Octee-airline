# Octee Airlines — Development Guide

> A parody website for **Octee Airlines**, a completely fictional airline that is a total mess but desperately pretends everything is fine.
>
> **The website is static on GitHub Pages, with an optional Cloudflare Worker and D1 database for Cloud accounts.** Local-only accounts remain in each visitor's browser; linked Cloud accounts sync their profile (see §7). Live at `https://zengyixin0205.github.io/Octee-airline/` once Pages is switched on.

---

## 1. Concept

Octee Airlines presents itself like a premium, award-winning carrier. Glossy hero images, confident corporate copy, smiling crew. But the cracks show everywhere: delayed buttons, missing baggage, one peanut per passenger, and taglines that accidentally tell the truth.

**The core joke:** *the website is trying very hard to trick passengers into thinking Octee is doing well, and failing.*

### Design principle: "The Two Faces"

Every page has two layers:

| Layer | What it looks like | Example |
|---|---|---|
| **The Facade** | Polished, corporate, luxury-airline styling | "Award-winning service across 3 continents" |
| **The Mess** | Small truths that leak through | Tiny footnote: "*award was a participation certificate" |

Rule of thumb: the facade is **big and loud**, the mess is **small, quick, or hidden**, and the user discovers it. The humour should land on second glance.

---

## 2. Organisation (in-universe lore)

```
FAG — Fuji Airport Group            (parent company)
 └── FIA — Fuji International Airport   (home base / hub)
      └── Octee Airlines                (the airline)
```

- **FAG (Fuji Airport Group):** the parent group. Appears only in the footer and the "About" page, always with overly formal legal wording.
- **FIA (Fuji International Airport):** Octee's hub. All flights depart from FIA (eventually). FIA has its own slogans, shown on the airport pages and around the site.
- **Octee Airlines:** the main brand of the site.

### Airports Octee serves

| Code | Airport | Role |
|---|---|---|
| **FIA** | Fuji International Airport | Home base / hub (part of FAG) |
| **SIA** | Scraggy International Airport | Destination |
| **LIA** | Lu Pin International Airport | Destination |
| **SCH** | Scraggy House | Destination (new). Not really an airport: "we land in the garden" |

Octee Airlines' flight code is **OA**. FIA is Octee's home base, but flights **don't all have to start or end at FIA**:

- Some OA flights make **stops**, like real airlines. For example OA 101 flies **LIA → SIA → FIA**: passengers can board or get off at SIA on the way. One flight number covers the whole trip.
- Passengers can **change planes at any airport** where flights meet (FIA, SIA, LIA or Scraggy House), including changing from an Octee flight to a **Scraggy Airlines (SA)** flight at SIA.
- Every OA flight still touches FIA somewhere on its route (start, stop or end).

#### Weekly timetable

Flight numbers: **OA 58** is the flight to Scraggy International (SIA). **OA 100–OA 118** are all the other flights, each flying on set days of the week. Times are local; FIA, SIA, LIA and Scraggy House all use Singapore time ("we checked once"). Days and times are placeholders kept in one place (`js/destinations.js`).

| Flight | Route (stops) | Days | Times |
|---|---|---|---|
| **OA 58** | FIA → SIA | Every day | FIA 07:30 → SIA 09:20 |
| OA 100 | FIA → **SIA** → LIA | Mon, Thu | FIA 07:40 → SIA 09:30 / 10:10 → LIA 11:25 |
| OA 101 | LIA → **SIA** → FIA | Tue, Fri | LIA 07:45 → SIA **09:34** / 10:15 → FIA 12:05 |
| OA 102 | FIA → **SIA** → LIA | Wed, Sat | FIA 14:30 → SIA 16:20 / 17:00 → LIA 18:15 |
| OA 103 | LIA → **SIA** → FIA | Thu, Sun | LIA 13:20 → SIA 14:35 / 15:10 → FIA 17:00 |
| OA 104 | SIA → FIA | Mon | SIA 13:30 → FIA 15:20 |
| OA 105 | SIA → FIA | Wed | SIA 16:45 → FIA 18:35 |
| OA 106 | SIA → FIA | Sat | SIA 13:30 → FIA 15:20 |
| OA 107 | FIA → LIA | Tue | FIA 09:00 → LIA 11:30 |
| OA 108 | FIA → LIA | Fri | FIA 15:40 → LIA 18:10 |
| OA 109 | LIA → FIA | Wed | LIA 07:10 → FIA 09:40 |
| OA 110 | LIA → FIA | Sun | LIA 18:00 → FIA 20:30 |
| OA 111 | FIA → Scraggy House | Tue | FIA 11:15 → SCH 13:05 |
| OA 112 | FIA → Scraggy House | Sat | FIA 08:00 → SCH 09:50 |
| OA 113 | Scraggy House → FIA | Wed | SCH 14:00 → FIA 15:50 |
| OA 114 | Scraggy House → FIA | Sun | SCH 17:00 → FIA 18:50 |
| OA 115 | LIA → **FIA** → Scraggy House | Sat | LIA 06:30 → FIA 09:00 / 09:45 → SCH 11:35 |
| OA 116 | Scraggy House → **FIA** → LIA | Sun | SCH 08:20 → FIA 10:10 / 10:50 → LIA 13:20 |
| OA 117 | FIA → **Scraggy House** → SIA | Thu | FIA 10:00 → SCH 11:50 / 12:30 → SIA 13:10 |
| OA 118 | SIA → **Scraggy House** → FIA | Thu | SIA 15:00 → SCH 15:40 / 16:20 → FIA 18:10 |

Bold airports are stops in the middle of a flight.

| Octmiles per stretch flown | Octmiles |
|---|---|
| FIA ↔ SIA | 150 |
| FIA ↔ LIA | 200 |
| FIA ↔ Scraggy House | 250 |
| SIA ↔ LIA | 120 |
| SIA ↔ Scraggy House | 80 |

A trip earns the Octmiles of every stretch flown on OA (e.g. FIA → SIA → LIA on OA 100 = 150 + 120).

#### Connections: different passengers, same flight

Passengers from different places can end up on **the same flight**, either by changing planes or by boarding a flight that stops:

**Example 1 — changing at SIA onto a Scraggy flight (Tuesday or Friday):**

```
FIA ── OA 58  ──► SIA  lands 09:20 ─┐
                                    ├──► SA103  SIA 10:30 → MIA (Mdm Wrong-Wrong International Airport)   (same flight, both passengers)
LIA ── OA 101 ──► SIA  lands 09:34 ─┘    (OA 101 then carries on to FIA without them)
```

**Example 2 — boarding a flight that stops (Saturday):** OA 115 picks up passengers at LIA (06:30), lands at FIA (09:00), picks up more passengers at FIA (09:45) and takes **everyone** on to Scraggy House. LIA passengers stay on board.

**Example 3 — changing at FIA (Wednesday):** OA 109 from LIA lands at FIA 09:40; the passenger changes to OA 102 (FIA 14:30 → SIA → LIA) or waits for anything else leaving FIA later that day.

Rules:

- **Minimum connection time: 45 minutes** at any airport (OA → OA, OA → SA, SA → OA). *"Plenty of time. Unless you take the JOELMOBILE."*
- **Staying on a flight that stops** is not a connection (no minimum time, same seat).
- At most **2 changes** (3 flights) in one direction, all on the **same day**.
- Each OA flight has **180 seats**, counted **per stretch**: a passenger from LIA to Scraggy House on OA 115 uses a seat on LIA → FIA and FIA → SCH; one from FIA uses a seat only on FIA → SCH. A static site can't see other visitors' bookings, so "other passengers" are a steady made-up number per flight and date, minus the real bookings saved in this browser. When a stretch is full, the calendar greys the day out.

### ONE UNITED (OU)

> **ONE UNITED**
> *unitation is a dream, it's chaos.*

One United is **another airline at FIA** (flight code **OU**). It serves mainly **Scraggy House and SIA** from FIA, plus **MIA** (OU 9 FIA 09:30 → MIA 11:40 and OU 10 MIA 12:40 → FIA 14:50, on Tue/Thu/Sat), and its flights are timed so they can be **one part of a longer trip with Octee (OA) or Scraggy Airlines (SA)**.

| Flight | Route (stops) | Days | Times |
|---|---|---|---|
| OU 1 | FIA → SIA | Every day | FIA 06:45 → SIA 08:35 |
| OU 2 | SIA → FIA | Every day | SIA 13:20 → FIA 15:10 |
| OU 3 | FIA → **Scraggy House** → SIA | Mon, Wed, Fri | FIA 06:30 → SCH 08:20 / 08:45 → SIA 09:20 |
| OU 4 | SIA → **Scraggy House** → FIA | Mon, Wed, Fri | SIA 13:45 → SCH 14:20 / 14:50 → FIA 16:40 |
| OU 5 | FIA → Scraggy House | Thu, Sun | FIA 17:50 → SCH 19:40 |
| OU 6 | Scraggy House → FIA | Thu, Sun | SCH 20:20 → FIA 22:10 |
| OU 7 | FIA → SIA | Every day | FIA 16:30 → SIA 18:20 |
| OU 8 | SIA → FIA | Every day | SIA 19:10 → FIA 21:00 |

- **More connections with SA:** OU 1 (daily) and OU 3 land at SIA in time for every morning Scraggy flight (SA101 10:20, SA103 10:30, SA105 10:45, SA107 11:00). Coming back, the Scraggy flights land at SIA by 12:30 and OU 2 (daily, 13:20), OU 4 (13:45) and OU 8 (19:10) fly home to FIA. So there is now a way to and from MIA and Lujin's **every day**. OA 100 was also moved 30 minutes earlier (lands SIA 09:30) so it connects with all four SA flights.
- **Connections with OA:** e.g. OA 103 from LIA lands at FIA 17:00 → OU 5 to Scraggy House 17:50 (Thu, Sun); OA 104 / OA 106 land at FIA 15:20 → OU 7 to SIA 16:30.
- **Booking:** OU flights appear in the same flight options, marked "One United". A trip with any OU flight adds the special **One United form** after the FIA form (see "Forms" below). They follow the same rules (45 minutes to change, max 2 changes, 180 seats per stretch).
- **Octmiles:** OU flights earn **half** the Octmiles of the same stretch on Octee. *"One United shares the miles. Unevenly."*
- **Where it shows:** its own page `oneunited.html` (headline + timetable + live examples of connections), a banner on Home, the search results, the Destinations cards, the status board (marked "[One United]") and boarding passes (light blue).
- Data: `OU_FLIGHTS` in `js/destinations.js`.

### Scraggy Airlines (SA) — part of Octee Airlines

**SA is Scraggy Airlines, based at Scraggy International Airport (SIA)**: the airline from the Scraggy project. In the Octee story **Scraggy Airlines is under Octee Airlines** (FAG → FIA → Octee Airlines → Scraggy Airlines). It serves **Scraggy House, SIA and FIA**, plus **MIA** and Lujin's. It keeps its own flight numbers, its own booking form and its own yellow livery. Octee planes (OA) do **not** fly to MIA or Lujin's; Scraggy Airlines does from SIA, and One United flies FIA ↔ MIA. Everything about SA flights must **match the real Scraggy flights** in `Scraggy-airlines/js/data.js`: flight numbers, gates, aircraft, classes, snacks, reasons, tick boxes and rules. Octee never makes up its own version.

| Scraggy route (from Scraggy's `ROUTES`) | Outbound | Times (daily) | Return | Times (daily) | Gate at SIA |
|---|---|---|---|---|---|
| SIA ↔ Scraggy House | SA101 | 10:20 → 10:50 | SA102 | 11:50 → 12:20 | SCG001 |
| SIA ↔ MIA | SA103 | 10:30 → 11:20 | SA104 | 11:40 → 12:30 | SCG002 |
| SIA ↔ Lujin's | SA105 | 10:45 → 11:40 | SA106 | 11:35 → 12:30 | SCG003 |
| **SIA ↔ FIA** (new) | **SA107** | SIA 11:00 → FIA 12:50 | **SA108** | FIA 14:00 → SIA 15:50 | SCG012 |

- **Times and the FIA route are now in the Scraggy project** (`Scraggy-airlines/js/data.js`, `routes` table in its `schema.sql`, its Destinations page and boarding passes). Octee reads them from there; don't copy them into Octee by hand.
- **Scraggy flies to FIA too.** SA107 / SA108 compete with Octee on SIA ↔ FIA. Octee's search and flight options show them as "Operated by Scraggy Airlines" next to OA flights (e.g. SIA → FIA: OA 101 at 10:15 or SA107 at 11:00). An SA-only trip is booked with the SIA form only.
- **More connections at FIA:** SA107 lands at FIA 12:50, so passengers from SIA can change at FIA onto later OA flights (e.g. OA 102 at 14:30 on Wed/Sat, OA 108 at 15:40 on Fri), and OA flights landing at FIA before 13:15 connect onto SA108 at 14:00.
- Scraggy books **one passenger per booking** (its form has a single passenger name), so transfer bookings are for **1 passenger**.

So to reach MIA, passengers fly Octee to **SIA** (e.g. OA 58 from FIA, or OA 101 from LIA), then change at **Scraggy International Airport (SIA)** to SA103 → MIA. Booking a transfer means filling in **two forms** (§5.10): one for the Octee flight(s) and one for the SIA flight (Scraggy). The destination search (§5.12) shows the route.

> All names, companies and places are fictional. Any resemblance to real airlines or airports is coincidental.

---

## 3. Official FIA Taglines

These are the signature quotes. **Line breaks are part of the joke and must be preserved exactly.** Each one is one "slide" in the hero rotator and can also appear as a standalone banner.

**1. FLY SOMEWHERE.**
```
FLY SOMEWHERE.
EVENTUALLY
```

**2. LOST?**
```
LOST? we will make you more lost
```

**3. YOUR BAGS**
```
YOUR BAGS
our mystery
```

**4. Are we taking off yet**
```
"are we taking off yet"
Are the engines working?
```

**5. THINK**
```
THINK
before you
say
```

**6. Becoming sophisticated**
```
becoming sophisticated
is impossible
at least on this flight        ← rendered in SMALL text
```

**7. Peanut? Peanut?**
```
Peanut? Peanut?
ONE PEANUT
```

### Typography rules for taglines

- First line = the **facade**: large, bold, confident.
- Final line = the **punchline**: noticeably different (smaller, lighter, italic, or delayed fade-in).
- Tagline 6: last line must be *small* (about 40% of the heading size).
- Tagline 7: "ONE PEANUT" in bold caps, ideally with a single 🥜 icon, never more than one.
- Store taglines as data (see §8) so line breaks are explicit, never hard-coded `<br>` soup.

---

## 4. Site Map

| Page | File | Purpose |
|---|---|---|
| Home | `index.html` | Hero tagline rotator, flight search widget (leads to the booking form), highlights |
| Destinations | `destinations.html` | Destination search box (§5.12) + places Octee *claims* to fly to |
| Flight Status | `status.html` | Live departures board from FIA (everything is delayed) |
| Baggage | `baggage.html` | "Track your bag" tool (results are always a mystery) |
| In-Flight Experience | `experience.html` | Meals (one peanut), entertainment, comfort |
| About Octee | `about.html` | Corporate history, FAG/FIA structure, "awards" |
| FIA Airport | `fia.html` | Fuji International Airport info and taglines |
| Contact | `contact.html` | Customer service form that goes nowhere |
| Log in / Sign up | `login.html` | Octee account login (see §7) |
| My Account | `account.html` | Profile and My Trips (logged-in only) |
| Octmiles | `octmiles.html` | Octmiles balance, tier, history, rewards shop and the **"Have a code?"** box (see §7) |
| JOELMOBILE | `joelmobile.html` | The airport "help" buggy at FIA (see §5.9) |
| One United | `oneunited.html` | **ONE UNITED / unitation is a dream, it's chaos.** The OU airline: timetable and connections (see §2) |
| Book a Flight | `book.html` | The booking form. **The only way to book a flight** (see §5.10) |
| Reviews | `reviews.html` | Passenger reviews and a write-a-review form (see §5.11) |

Start with **Home** only, then add pages in the order in §10.

---

## 5. Page Specs

### 5.0 Every page: live clock at the side

A live clock panel on the side of every page, the same as the Scraggy Airlines project (reuse its `js/clock.js`).

| Row | Shows | Time zone |
|---|---|---|
| **Your time** | The visitor's computer time | Browser default (no time zone set) |
| **FIA time** | Fuji International Airport | `Asia/Singapore` |
| **SIA time** | Scraggy International Airport (same as Scraggy's clock) | `Asia/Singapore` (Scraggy's `SIA_TIMEZONE`) |

- Under the times: today's date, e.g. "Thu, 1 Oct 2026".
- Small joke caption at the bottom: *"FIA and SIA share a time zone. Our flights still can't agree on the time."*
- 24-hour `HH:MM:SS`, updates every second, pauses while the tab is hidden (saves battery).
- **Desktop (900px and wider):** fixed card on the right side, just under the nav, about 172px wide. Give the page `padding-right` so content never hides behind it.
- **Phones:** a slim strip under the nav with the three times in one row.
- **Accessibility:** `<aside aria-label="Current time">` with `<time>` elements. No `aria-live` on the ticking times (screen readers would read it every second).

```js
// js/clock.js (from Scraggy, with FIA added and MIA row removed)
const fmt = (timeZone) => new Intl.DateTimeFormat("en-GB", {
  timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
});
const yourFmt = fmt(undefined);            // computer's own time
const fiaFmt  = fmt(CONFIG.FIA_TIMEZONE);  // "Asia/Singapore"
const siaFmt  = fmt(CONFIG.SIA_TIMEZONE);  // "Asia/Singapore"
```

### 5.1 Home (`index.html`)

- **Nav bar:** Octee logo (`assets/img/octee-logo.svg`) + links + account area on the right ("Log in", or "Hi, username · 1,250 Octmiles · Gold Wing · Log out"). One link is slightly misaligned on purpose. Clicking the logo 8 times quickly opens the FAG code administration sign-in (§7.5).
- **Hero:** full-width sky image, tagline rotator cycling the 7 taglines (about 5s each). Punchline line fades in about 1s after the main line.
- **Destination search box** in the hero: *"Where do you want to go? (We may take you there.)"* Same search as §5.12; pressing Enter opens `destinations.html?q=…` with the results.
- **Booking widget:** From / To (one end is always FIA, the other is SIA, LIA or Scraggy House) / Dates (the flight calendar from §5.10) / Passengers → "Search Flights".
  - On submit: loading spinner that takes far too long, then a result like *"1 flight found. Departure: TBA. Arrival: Hopefully."*
  - The result has a **"Book this flight"** button that opens the booking form (`book.html`) with From / To / Date / Passengers already filled in. The widget itself never books anything: every booking goes through the form.
- **Stats strip (facade):** "99% On-Time*", "1,000,000 Happy Passengers*", "0 Problems*".
  - Footnote in tiny text: "*on-time for something", "*passengers who did not leave a review", "*that we know of".
- **Highlights cards:** Destinations, Baggage, In-Flight, Reviews, each linking to its page.
- **Review strip:** the three newest 4–5★ reviews, with "Read all reviews" → `reviews.html`.
- **Footer:** "Octee Airlines, a member of FAG (Fuji Airport Group). Operating from FIA (Fuji International Airport)."

### 5.2 Flight Status (`status.html`)

Airport-style departures board (flip-board look).

Rows come from the weekly timetable (§2) for **today's** day of the week, so the board changes every day. Flights that stop show it, e.g. "LIA via SIA". Example for a Tuesday:

| Flight | Destination | Scheduled | Status |
|---|---|---|---|
| OA 58 | SIA — Scraggy International | 07:30 | DELAYED |
| OA 107 | LIA — Lu Pin International | 09:00 | BOARDING (since Tuesday) |
| OA 111 | Scraggy House | 11:15 | ENGINES BEING CHECKED |
| OA 101 | Arriving from LIA via SIA | 12:05 | PILOT LOOKING FOR KEYS |
| OA 404 | Not Found | — | LOST |

- Statuses update randomly every few seconds via JS, but never to "ON TIME".
- Banner: *"are we taking off yet" / Are the engines working?*

### 5.3 Baggage (`baggage.html`)

- Banner: *YOUR BAGS / our mystery*
- "Track your bag" input (any tag number).
- Result is random from a list, e.g.:
  - "Your bag is on a better holiday than you."
  - "Last seen: Gate 7. Possibly Gate 8. Spiritually, everywhere."
  - "Your bag has been upgraded to a different flight."
- A fake progress bar that reaches 99% and stops.

### 5.4 In-Flight Experience (`experience.html`)

- **Dining:** luxury-menu styling for a single peanut. "Chef's Selection: One Peanut. Served at room temperature."
  - Interactive gag: a "Request another peanut" button → *"Peanut? Peanut? / ONE PEANUT"*.
- **Comfort:** banner *"becoming sophisticated / is impossible / at least on this flight"*.
- **Entertainment:** "Window (subject to availability)".

### 5.5 About (`about.html`)

- Proud corporate timeline with suspicious entries ("2019: Bought a second plane. 2020: Found the first plane.").
- Org chart: FAG → FIA → Octee.
- "Awards" section with participation certificates.
- Banner: *THINK / before you / say*.

### 5.6 FIA Airport (`fia.html`)

- **FIA directory board** ("ONE OF OUR DIRECTORIES · 248 / 322", from the hand-drawn directory): outlined FIA mark, "the most reliable in the world", Mdm Wrong's quote ("The airport is so large and confusing that it has 322 directories!"), the line "We hope you don't become the 10,000th passenger to miss your flight within three days!", then a real table (Terminal / Airlines / Gates) and the FAG mark:

  | Terminal | Airlines | Gates |
  |---|---|---|
  | 1 | Octee Airlines, Scraggy Airlines, Lupin Airlines | A8, A11–A16 (A/B), A17 (A), A19 (A/C), B1–B4 (A/B), B5 (A), C1 (B) |
  | 2 | Riley Airlines, ONE UNITED ("unitation is a dream, it's chaos") | D140–D146 (A/B), E50–E52 (A/B) |
  | 3 | Scraggy, for reservation | J121–J125 (A/B), J126–J128 (A/B) |
  | 4 | Scraggy Airlines, Lupin Airlines, Wrong Airlines | G12 (B), G31 (A/B), G32 (B), G33 (A), G34–G35 (A/B), G36 (B), G37–G44 (A/B), G41 (B), G42 (A/B), G43 (B), G20 (B) |
  | 5 | Scraggy Building + Scraggy's OWN illegal terminal + Scraggy illegal island | SC1–SC14 (A/B), SC15 (B), "Scraggy is intelligent 1" (A/B) |

  The same data is in `js/destinations.js` as `FIA_TERMINALS`; `fiaGate(airline)` gives boarding passes a real gate (Octee from Terminal 1, One United from Terminal 2). The JOELMOBILE page uses these gate names too.
- **Airport map** (follows the hand-drawn FIA airport map, top to bottom): one long building with **Terminal 2** (Riley Airlines, One United, other airlines; gates D140–D146, Fuji Mall, E50–E52) and **Terminal 3** (Scraggy, for reservation; J121–J128), each with an SBB train sign to the other terminals; **Terminal 1** (Octee, Scraggy, Lupin, cargo) with the A8 annex, gates A11–A19, the **ATC** box, then B1–B5 and C1; the **runway** in the middle (taxiways are deliberately not drawn); south of it **Scraggy's own illegal terminal** (gates "Scraggy is intelligent" 1 · 2) joined to **Terminal 5 / Scraggy Building** (SC11–SC15 on top, SC1–SC10 below), the **aircraft cleaning land** and **Scraggy illegal island**; at the bottom **Terminal 4** (Scraggy, Lupin, Wrong Airlines; G12, G31–G44, G20) and the **Mdm Wrong-Wrong building** (M1, M2). Every gate is drawn as a T-shaped stand with its number and sides (A/B). The map is **black and white only** (white shapes, black lines and text), like the pen drawing; no airline colours.
- **Inside Terminal 1:** a second SVG plan, also **black and white only**, laid out to match the airport map: Airport Road, the JOELMOBILE stop and the SBB train on the north side; inside, west to east: check-in hall (Octee desks 1–8, Scraggy desks 9–12), information, toilets, the SBB station, Lupin Airlines check-in, then cargo at the east end; behind them security & passports, Octee Lounge, Peanut Bar, baggage claim and a very large Lost & Found; along the south side the concourse with Pier A (A11–A16, A17, A19), the ATC box, Pier B (B1–B5) and C1, each gate a T-shaped stand with a parked plane or "delayed"; a long walkway west to the annex and gate A8; the apron and the runway to the south. "You are here" appears twice. Both maps have a `<title>`/`<desc>` and scroll sideways on phones.
- The old "official FIA taglines" poster grid was **removed** from this page. The taglines now live as the big page headings (and in the Home rotator).

- **Header:** a full-width photo of **Mount Fuji** (`assets/img/fuji.jpg`, snow peak, town below, red pagoda on the right) as the background of the page header. A dark fade at the top keeps the white title, the tagline and the intro readable. The photo has a text description (`role="img"` + `aria-label`). On phones the header is taller so the words sit in the sky above the mountain.

- Terminal map that is deliberately confusing, with tagline *LOST? we will make you more lost*.
- All 7 FIA taglines shown as a poster gallery.
- A "Need help? Call the JOELMOBILE" banner linking to `joelmobile.html`.

### 5.7 Destinations (`destinations.html`)

- **Destination search box** at the top of the page (§5.12).
- Three main destination cards: **SIA (Scraggy International Airport)**, **LIA (Lu Pin International Airport)** and **Scraggy House** (new, badge "NEW: we land in the garden"), each with a glossy photo, flight number, flight time ("about 2 hours, give or take a day") and a "Book now" button that opens `book.html?to=SIA` / `?to=LIA` / `?to=SCH`.
- A smaller "Partner destinations (transfer via SIA, operated by Scraggy Airlines)" row: MIA and Lujin's, each with "Book transfer (2 forms)" → `book.html?to=mdm-wrong-wrong` / `?to=lujin`.
- Below them, smaller joke cards: "Somewhere", "Eventually", "Back to FIA".
- A **realistic route map**, drawn by `js/destinations-page.js` as an SVG from the real timetables (so it can't go out of date): pale sea with faint latitude/longitude lines, irregular islands, Mount Fuji next to FIA, a compass and a joke scale bar, sea names ("Sea of Delays", "Lost Luggage Strait"). Curved route lines in livery colours with a dark outline: **OA orange**, **OU light blue**, **SA yellow and dashed** (so airlines are not told apart by colour alone). Airports are white dots with code + full name; FIA is the bigger hub dot. A legend sits under the map and the SVG has a `<title>` and a `<desc>` listing every route.
- An **MIA card** in the main list (One United from FIA, Scraggy Airlines from SIA), and a "Scraggy Airlines destinations" row built from the Scraggy data (Scraggy House, MIA, Lujin's, FIA).
- Banner: *FLY SOMEWHERE. / EVENTUALLY*.

### 5.8 Contact (`contact.html`)

- Normal-looking form. On submit: *"Thank you. Your message has been placed with your baggage."*
- Client-side only. **No data is sent or stored.**

### 5.9 JOELMOBILE (`joelmobile.html`)

The JOELMOBILE is FIA's airport buggy that "helps" passengers get around the terminal. It is managed by **Joel Teh Yit Siang**, JOELMOBILE Operations Manager.

- **Page title:** **JOELMOBILE** in big letters, with this sentence directly below it:
  > *"I'm a joel!"*
- **Hero banner (under the title):** **NEED HELP? / the JOELMOBILE is coming / (eventually)**
- **Facade copy:** "Fast, friendly, free* door-to-gate service across FIA." Footnote: "*free to board. Getting off is a separate conversation."
- **Manager card:** photo placeholder (or an illustration), name **Joel Teh Yit Siang**, title "JOELMOBILE Operations Manager", and a quote from Joel (ask Joel to write his own).
- **Request a ride form:** Pick-up (Check-in Hall, Food Court, Toilets, Baggage Belt 7, Any Gate) → Drop-off (Gate FIA01–FIA12) → "Call the JOELMOBILE". After a short "Locating the JOELMOBILE…" spinner, show a random result:
  - "The JOELMOBILE is on its way. It is currently going the other way."
  - "You have arrived! At a gate. Not your gate, but a gate."
  - "The JOELMOBILE has stopped for snacks. Please hold."
  - "Joel says you are already at your gate. Joel is very confident."
  - "Ride complete. Your bags have taken a separate JOELMOBILE."
- **Live tracker:** a small buggy icon driving loops around the FIA terminal map, always just missing the gate it is heading to. Status text: "JOELMOBILE location: nearby (spiritually)".
- **Octmiles:** logged-in users earn **20 Octmiles per ride**, up to 3 rides a day (§7.2). Guests see "Log in to earn Octmiles for being helped."
- Respect `prefers-reduced-motion`: show the buggy parked instead of driving.

### 5.10 Book a Flight (`book.html`)

**You can only book a flight by filling in this form.** The Home search widget and the Destinations "Book now" buttons just open it with some fields filled in.

The form **follows Scraggy Airlines' booking form** (`Scraggy-airlines/book.html` + `js/book.js`, Scraggy DEVELOPMENT.md §7.2): the same six steps in the same order, fake, nothing charged, and **no card or payment fields at all**. The changes for Octee are listed in the table below.

- **Headline:** **BOOK A FLIGHT / we will try**
- A step indicator at the top ("Step 2 of 6"), with **Back** and **Next** buttons.

| Step (same as Scraggy) | Octee version |
|---|---|
| **1. Trip** | The form **asks three things, in this order**, in a highlighted box: **① Destination** ("Where are you going?"), **② Departure date** (the day you leave) and **③ Arrival date** (the day you fly back). Both dates are picked on the flight calendar (below). Underneath: **Departing from** (FIA by default; any of FIA, SIA, LIA, Scraggy House), **Passengers** (1–9) and a tick box **"One-way only (I'm not flying back)"**, which removes the arrival date. After a date is picked, the form lists that day's flights, like a real airline: direct, flights with a stop (stay on board) and connections (change planes); the passenger picks one for the departure and one for the flight back. Destinations marked "transfer via SIA (2 forms)" (MIA, Lujin's) switch to the transfer booking below with 1 passenger. Missing answers: *"Pick your departure date on the calendar."* / *"Pick your arrival date (the day you fly back) on the calendar, or tick One-way."* If there's nothing that day: *"No flights that day. Not even eventually."* |
| **2. Aircraft** | Choose from the Octee fleet (Airbus 777, Boeing 330, Airbus 747, Boeing 380, same joke mix-up as Scraggy) or "Surprise me (we will pick the wrong one)". |
| **3. Class** | Octee Economy, Octee Business, or **Octee First** ("Economy with a curtain"). Octee First earns +50 Octmiles per leg. |
| **4. Passenger** | Name for each passenger (first one defaults to the username; a nickname is fine), seat preference (window, aisle, "somewhere"), snack preference (One Peanut · One Peanut (vegetarian) · One Peanut (served warm)), number of bags (0–3, *"We will lose them in a random order."*). |
| **5. Fun extras** | "Reason for travelling" (dropdown of joke options), ☐ JOELMOBILE pickup to my gate (optional), and **three tick boxes that must all be ticked** (below). |
| **6. Review and confirm** | Shows the whole trip, the Octmiles that will be earned, and **"Confirm (no money will be taken)"**. Payment is just *"Paid in peanuts."* |

#### Flight calendar (departure and arrival dates)

Dates are picked on **one calendar for both dates, like an airline app**. Passengers can't type a date.

- Clicking **Departure date** or **Arrival date** opens the calendar. At the top are two tabs, **Departure Date** and **Arrival Date**, each showing the month, weekday and a big day number once picked.
- Months are stacked and scroll (weeks start on Sunday). Tap the **departure day**, then the **arrival day** (the day you fly back). The two days are filled orange with a little arrow shape, and the **days in between are shaded** light orange.
- A big orange **Done** button at the bottom saves both dates. × closes without saving.
- Each day shows, in small text, the first flight that day (e.g. `OA 107`). Days with **no flight** on that route (or no seats) are greyed out and can't be picked; so are past days. Bookings open up to 11 months ahead.
- **Stops and connections:** a day can be picked if **at least one** way to get there works that day (direct, a flight with a stop, or changes of plane with 45+ minutes each), on Octee, One United or Scraggy flights.
- **Arrival date:** only days on or after the departure day that have a flight back; same-day only if the flight back leaves at least 90 minutes after landing (*"time to look for your bags"*). One-way trips only pick a departure date.
- After **Done**, the form lists that day's flights for the departure and for the flight back, and a summary:
  > **Departure:** Tue 6 Oct 2026 · **OA 107** FIA 09:00 → LIA 11:30
  > **Arrival (flight back):** Wed 7 Oct 2026 · **OA 109** LIA 07:10 → FIA 09:40
- **Keyboard:** arrow keys move between days (skipping days with no flight), Enter picks, Esc closes. Each day has a full label like "Tuesday 6 October 2026, departure date".
- Built as `js/calendar.js` (`openRangeCalendar`).
- **Keyboard:** arrow keys move between days, Page Up / Page Down change month, Enter picks, Esc closes. Follow the WAI-ARIA "date picker dialog" pattern (`role="dialog"`, grid of days, `aria-selected`, each day has a full label like "Tuesday 6 October 2026, OA 107 at 09:00").
- Built once as `js/calendar.js` and reused by the Home widget and the booking form. The flight days come from `js/destinations.js`.

**Required tick boxes (step 5)** — all three must be ticked:

- ☐ **I accept Octee to be CEO**
- ☐ **I accept that the engines MAY be working**
- ☐ **FIA and SIA are not responsible for loss of luggage**

If one is missing: *"Please tick all three. We need it in writing."*

#### Every page must be filled in before Confirm

This is the main change from Scraggy:

- The **Confirm** button stays **disabled** until **all six steps are complete and valid**, including all three tick boxes.
- The step indicator shows ✓ on each finished step and ✗ on any step that still has a problem. Users can't skip ahead to a step until the steps before it are done.
- If a user goes **Back** and changes something so a step is no longer valid, its ✓ turns back into ✗ and Confirm is disabled again.
- Step 6 lists anything still missing, with links back to that step, e.g. *"Step 4: number of bags is missing."*
- When Confirm is pressed, every step is checked again (including all three tick boxes); if anything is missing, nothing is booked.

#### Forms: FIA form, One United form, SIA form

Step **1. Trip** is shared by every booking: destination, dates, flights and the **passenger name(s)**. After that, passengers **only fill in the forms for the airlines they actually fly**, and every form shown must be finished before Confirm:

| Trip includes | Forms to fill |
|---|---|
| Octee Airlines (OA) flights | **FIA form** (aircraft, class, seat/snack/bags, fun extras + the three tick boxes) |
| One United (OU) flights | **One United form** |
| Scraggy Airlines (SA) flights | **SIA form** |

So a One United-only trip has no FIA form, and an OA + SA trip has the FIA form and the SIA form. With two or more forms a banner shows the order, e.g. ① Trip → ② FIA form → ③ One United form → ④ SIA form (Scraggy) → ⑤ Confirm all. (The FIA form used to be called the Octee form.)

**One United form** (light blue, dotted steps marked "OU"; "unitation is a dream, it's chaos"):

1. **Flights** — the One United flights from the trip, fixed; passengers copied from the FIA form and locked.
2. **Unitation** — United / Semi-united / Chaos (all free).
3. **Seat & snack** — sit next to someone I know / a stranger / the engine (if working); half a peanut (shared) / the other half / a photo of the peanut.
4. **Declarations** — both required: "I accept that unitation is a dream" and "I accept that it's chaos".

One United boarding passes show "Unitation" instead of Class, the chosen seat, and the aircraft "Whichever plane is free". Octee class prices (Octeetokens), the Octee First bonus and My Trips upgrades apply to **Octee (OA) flights only**.

#### Transfer bookings: two forms (FIA form + SIA form)

When the destination is a Scraggy Airlines place (MIA, Lujin's, or Scraggy House "via SIA"), the user fills in **two forms, one after the other**:

| | Form 1: **FIA form** | Form 2: **SIA form** |
|---|---|---|
| Airline | Octee Airlines (OA) | Scraggy Airlines (SA), based at SIA |
| Flight | The OA flight(s) that get the passenger to SIA (e.g. OA 58 from FIA, OA 101 from LIA), and back from SIA if return | SIA → destination (SA103 / SA105 / SA101), and back to SIA (SA104 / SA106 / SA102) if return |
| Form | Octee's 6-step form above, with the OA part of the trip and 1 passenger | **Scraggy's own 6-step form**: same steps, fields, wording, options and rules as `Scraggy-airlines/book.html` |
| Look | Octee style | Scraggy style, with "Operated by Scraggy Airlines" and the Scraggy logo |
| Tick boxes | Octee's three (I accept Octee to be CEO, engines MAY be working, FIA and SIA not responsible for loss of luggage) | Scraggy's two: "I accept that Scraggy is the CEO." and "I accept that we may go somewhere else eventually." |
| Rewards | Octmiles | Scraggy Points (on Scraggy's side; see below) |

A banner across the top shows the progress: **① FIA form → ② SIA form (Scraggy) → ③ Confirm both**.

**The SIA form must match the real Scraggy flights.** Don't copy Scraggy's options by hand. Load them from Scraggy's own data file, so if Scraggy changes something, Octee changes too:

```js
// js/scraggy.js — loads Scraggy's real js/data.js from CONFIG.SCRAGGY_SITE_URL
// (both sites are on zengyixin0205.github.io, so it's the same website origin).
// If it can't load, or the live version has no flight times yet, it uses js/scraggy-data-snapshot.js
// (a copy of Scraggy's js/data.js). The Destinations page says which one is in use.
```

So the SIA form offers exactly Scraggy's: Airbus 777 / Boeing 330 / Airbus 747 / Boeing 380 / "Surprise me"; Scraggy Economy / Business / First / Scraggy Class; Scraggy's snacks (Scraggyton food only in Scraggy Class); seat Window / Aisle / Somewhere; bags 0–5 ("Bags will be lost in 1 to 5 places."); Scraggy's reasons for travelling; and Scraggy's gates SCG001–SCG003 and `SCRAG-####` booking references.

**Rules that join the two forms:**

- **Same passenger:** the passenger name from the FIA form is copied into the SIA form and locked.
- **Times must connect:** the SA flight must leave SIA **at least 45 minutes after** the Octee flight lands there (e.g. OA 101 lands 09:34 → SA103 at 10:30 ✓). On the way back, the SA flight must land at SIA at least 45 minutes before the Octee flight home leaves. Times come from the timetable (§2) and Scraggy's `data.js`.
- **Route must be real:** the SIA form's route is fixed to SIA → the chosen destination and checked with Scraggy's `planLegs()`.
- **Confirm both at once:** the **Confirm** button only appears after **both** forms are fully filled in (every step, every required tick box). It books all the legs together; if anything in either form is wrong, nothing is booked.
- Going back to the FIA form and changing the date re-checks the SIA form, and Confirm locks again if the dates no longer connect.

**After confirming a transfer**, show one itinerary with every boarding pass in order: OA 58 (Octee style, gate FIA01–FIA12, `OCT-####`) → change at SIA → SA103 (Scraggy style, gate SCG002, `SCRAG-####`), then the return legs. Octmiles are earned on the OA legs only; the SA legs show *"Scraggy Points are collected with Scraggy Airlines."*

**Saving the SA legs:** everything is saved together as one booking in the passenger's account in this browser (Octee ref `OCT-####` + Scraggy ref `SCRAG-####`). It does not appear in the Scraggy site's own account, because the two sites can't share data without a server.

**After confirming** (same as Scraggy), show a fake **boarding pass** for each leg (two for a return trip):

- Flight number and times from the timetable in §2 for the chosen day (e.g. `OA 58` to SIA, `OA 103` back on a Thursday)
- Depart and arrive date and time for each leg
- Passenger name(s), date, aircraft, class, seat preference, gate (`FIA01`–`FIA12`) and a booking reference like `OCT-4821`
- Octmiles earned, and a link "Call the JOELMOBILE to this gate"
- The trip also appears in **My Trips** on `account.html`.

**Guests** can fill in the whole form, but at step 6 they're asked to log in or sign up to confirm. Their answers are saved in `sessionStorage` and restored after login (`login.html?next=book.html`), so nothing is lost.

Use plain HTML form elements with real `<label>`s, `<fieldset>`/`<legend>` for each step, and error messages linked with `aria-describedby`. A disabled Confirm button gets a visible note saying why ("Finish steps 2 and 5 first").

### 5.11 Reviews (`reviews.html`)

> **Static site:** reviews are the archive in `data/reviews.json` (seen by everyone) plus reviews written in **this browser**. To publish a visitor's review for everyone, add it to `data/reviews.json` and commit.


Passengers can read reviews and write their own.

- **Headline:** **PASSENGER REVIEWS / we read them (eventually)**
- **Facade rating:** a huge **"4.9 ★\*"** at the top. Footnote: *"\*rounded up, a lot."* Right under it, in small print, the **real** average worked out from the actual reviews (e.g. "Actual average: 2.3 ★ from 41 reviews").
- **Featured reviews:** 4–5★ reviews in big glossy cards at the top.
- **"Reviews currently lost with your baggage":** 1–3★ reviews sit in a collapsed section with that title. Clicking it opens them. Nothing is hidden for real; they're just "misplaced".
- **Filters:** All · 5★ · 4★ · 3★ · 2★ · 1★, and sort by Newest / Highest / Lowest.
- Each review shows: username, stars, title, text, date, the route flown (if picked), and a **"Verified Octee flyer ✈"** badge if the user has at least one booked trip.

**Write a review** (logged-in users only; guests see "Log in to write a review"):

| Field | Rules |
|---|---|
| Star rating (1–5) | Required. 5 stars are pre-selected "for your convenience" (the user can change it). |
| Which flight? | Optional dropdown of the user's own trips |
| Title | Required, up to 60 characters |
| Review | Required, 20–500 characters, with a live character counter |
| ☐ "This review is about Octee, not my bag" | Required tick box |

- **One review per user.** They can edit or delete their own review.
- Writing your **first** review earns **30 Octmiles** (once only).
- **Safety:** reviews are shown as plain text only (set with `textContent`, never `innerHTML`), so nobody can inject code. Length limits are checked before saving.
- After posting: *"Thank you! Your review has been placed in the queue. The queue is also delayed."* (then it appears straight away).
- **Empty state** (no reviews yet): *"No reviews yet. Everyone is still waiting to land."*

### 5.12 Destination search

A search box where visitors type where they want to go. It's at the top of `destinations.html` and in the Home hero.

- **Placeholder:** *"Where do you want to go? (We may take you there.)"*
- **Suggestions while typing:** a dropdown under the box that updates on every key press. Arrow keys move, Enter picks, Esc closes.
- **Forgiving matching:** ignore capitals, spaces, dashes and apostrophes, and match on names, codes and nicknames. For example `mdm wrong wrong`, `wrong-wrong`, `mdm wrong wrong house`, `lujin`, `scraggy house`, `SIA`, `scraggy international`, `lu pin`, `LIA` all work. (Scraggy's `data.js` has a similar `normalize` helper.)
- A small **"Flying from"** dropdown next to the box (FIA by default; also SIA, LIA, Scraggy House). Searching from SIA to LIA shows every way to get there, e.g. *"OA 100 / OA 102 · SIA → LIA direct (these flights started at FIA) · Mon, Thu / Wed, Sat"*.
- The page URL updates to `destinations.html?q=…&from=…` so a search can be shared or bookmarked.

#### Four kinds of result

**1. Direct flight** (Octee flies there: SIA, LIA, Scraggy House)

> ✈ **Direct flight** to Scraggy House · flies **Tue, Thu, Sat**
> Next flights: **OA 111** Tue 6 Oct 11:15 → 13:05 · **OA 117** Thu 8 Oct 10:00 → 11:50 · **OA 112** Sat 10 Oct 08:00 → 09:50
> Back to FIA: OA 113 (Wed), OA 118 (Thu), OA 114 (Sun)
> Earn 250 Octmiles per leg · **[Book this flight]** → `book.html?to=SCH`

**2. Transfer flight** (Octee doesn't fly there, but Scraggy Airlines does from SIA: MIA, Lujin's)

> 🔁 **Transfer flight** — Octee Airlines does not fly to MIA.
> **OA 58** FIA → SIA · every day · 07:30 → 09:20 (Octee Airlines)
> ⏱ Change planes at **Scraggy International Airport (SIA)** · 70 minutes *(or 3 days)*
> **SA103** SIA 10:30 → MIA 11:20 · gate SCG002 (operated by Scraggy Airlines, based at SIA)
> *Also from LIA (Tue, Fri): OA 101 lands at SIA 09:34 → same SA103.*
> Return: SA104 → SIA 12:30, then an OA flight home that day (e.g. OA 104 Mon 13:30, OA 103 Thu/Sun 15:10)
> **[Book transfer (2 forms)]** → `book.html?to=mdm-wrong-wrong` · *Octmiles are only earned on the OA flight.*

Show the two legs as a little timeline (plane icon → transfer dot at SIA → plane icon), with the SA leg in a different colour and marked "Partner: Scraggy Airlines". Both legs are booked from the Octee site using the two forms (FIA form, then SIA form), see §5.10.

For **Scraggy House**, show the direct OA flights first, then underneath: *"Also possible any day: OA 58 to SIA, then SA101 to Scraggy House (if you enjoy airports)."*

Dates in "Next flights" are worked out from today and the timetable, and clicking one opens the booking form with that date already picked.

**3. FIA itself:** *"You are already at FIA. Probably. Try asking the JOELMOBILE."* (links to `joelmobile.html`)

**4. Not found:** *"No flights to "xyz". Not even eventually."* followed by "Places we (sort of) fly to:" with all destinations as buttons.

#### Data (`js/destinations.js`)

One file is the single source of truth for the search, the Destinations cards, the booking form, the status board and the calendar:

- `PLACES` — FIA, SIA, LIA, Scraggy House (`SCH`, Octee flies there) and MIA — Mdm Wrong-Wrong International Airport (`MIA`, flown by One United from FIA and Scraggy Airlines from SIA), and Lujin's (`LUJ`, Scraggy Airlines only), with search nicknames.
- `OA_FLIGHTS` — the weekly timetable from §2; each flight is a list of stops `[airport, arrive, depart]`.
- `segmentsOn(date, saRoutes)` — every bookable piece of every flight that day (any boarding stop → any later stop), plus the Scraggy flights from `js/scraggy.js`.
- `itinerariesOn(from, to, date, saRoutes)` — every way to get there that day: direct, staying on board through stops, and up to 2 changes of plane with 45+ minutes at any airport.
- `seatsLeft(segment, browserTrips)` — simulated seats (see §2).
- `matchPlace(query)` — the forgiving search ("mdm wrong wrong", "lu pin", "SIA" …).

Search order: OA direct match first, then partner (transfer) match, then FIA, then not found. The search runs fully in the browser; no account needed.

**Accessibility:** a real `<label>` (can be visually hidden), `role="combobox"` with `aria-expanded` and `aria-activedescendant` on the input, suggestions in a `role="listbox"`, and the results area as `aria-live="polite"` so screen readers hear "1 transfer flight found".

---

### Page headings (all pages)

Every page starts with the same heading block (`.hero`): a small spaced-out label (`.eyebrow`, e.g. `BAGGAGE · MAYBE`), then the page's tagline as a **very big, tight, bold sans heading in two tones** — first line dark, punchline in deep orange — on a soft cream-to-orange wash. Sizes use `clamp()` and the text wraps, so **every word always fits** (no clipping) from phone to desktop. Long punchlines use `.punch.long` (smaller). The Baggage page adds a three-column strip under the heading (`.trio`: Carry-on / Checked / Lost & found). Home keeps its dark orange hero and FIA its Mount Fuji photo, with the same type style in white.

The **In-Flight page** (`experience.html`) uses a cabin photo (`assets/img/cabin.jpg`, a first class suite at sunset) as its header background, the same way FIA uses Mount Fuji, with the line "Actual cabin may differ. Actual cabin will differ."

The **Destinations page** uses `assets/img/destinations-bg.jpg` as its header background: the whole picture stays visible on the right (at the bottom on phones) and the heading, search box and results sit on a dark panel that fades into it.

## 6. Visual Design

### Logo

- File: `assets/img/octee-logo.svg` (PNG version: `assets/img/octee-logo.png`).
- Based on the original hand drawing, in the same thin pen line (no font):
  - **Kept as drawn:** the creature and the "s" of Airlines.
  - **Straightened:** the "o" is a perfect circle, and the other letters (c, t, first e, A, i, r, l, i, n, e) are redrawn with straight, even strokes. The first "e" of "ee" is a regular "e" with no line coming out.
  - **Baselines:** every letter in "octee" sits on one straight line, and every letter in "Airlines" sits on another.
  - **Same height:** "Airlines" uses the same letter heights as "octee" (same x-height for small letters; A and l the same height as o and t). The hand-drawn "s" is scaled down evenly to match.
  - **"s" line:** a perfectly straight, flat (180°) line runs from the bottom of the "s" back to the "l", sitting just below the baseline.
  - **Last "e" of octee:** drawn the same as the "e" before it (same size and shape). Its bottom stroke carries on into a straight line along the baseline, the same thickness from start to end, and **ending right above the "s"** of Airlines.
  - **Even spacing:** "Airlines" has the same gap between every pair of letters. "octee" is spaced to **look the same as "Airlines"**: the average white space between each pair of its letters matches Airlines' average, and no two letters get closer than a set minimum (so the "c" never touches the "t").
- Don't swap the letters for a font or redraw the kept parts.
- Use the SVG everywhere (it stays sharp at any size). Minimum width: 140px. Always on a light background, or swap the fill to white on dark.
- Favicon: crop the creature only.
- Transparent PNG, so it works on any light background.

### Brand: everything revolves around orange

| Token | Value | Use |
|---|---|---|
| `--octee-orange` | `#FF7A00` | Buttons, accents, selected things, the calendar's Done button |
| `--octee-orange-dark` | `#B34700` | Banners, the nav's current page, links |
| `--octee-orange-deep` | `#C25500` | Hover states, gradients |
| `--octee-ink` | `#2B1A0E` | Text, headings, dark panels (clock, footer) |
| `--octee-cream` | `#FFF3E6` | Page background |
| `--octee-white` | `#FFFFFF` | Cards |
| `--mess-red` | `#C03A3A` | DELAYED, errors, cracks in the facade |
| `--mess-gray` | `#6B7280` | Tiny footnotes |

- Hero banners: a dark-brown to orange gradient with white text. Buttons: orange with dark brown text (readable contrast).
- **Airline liveries** (tags, flight lists, boarding passes, banners): **Octee Airlines (OA) = orange** `#FF7A00`, **One United (OU) = light blue** `#A8DCF7`, **Scraggy Airlines (SA) = light yellow** `#FFF1A8`, each with dark text for contrast. Tokens `--oa`, `--ou`, `--sa` in `css/styles.css`.
- **Headings:** elegant serif (*Playfair Display*). **Body:** *Inter*. **Departures board:** *JetBrains Mono*, yellow on black.

### Comedy details (use sparingly)

- One nav item 2px lower than the others.
- Logo plane icon slightly tilted.
- "Loading…" states that are a little too long.
- Footnotes (`*`) that undercut every bold claim.
- Hover on "Book Now" button: it shifts slightly away the first time only.

Keep the site usable. The mess is the joke, not actual broken UX.

---

## 7. Accounts, Octmiles, Codes & FAG code administration (static, no database)

GitHub Pages only serves static files: no server, no database. So everything that "remembers" something is saved **in the visitor's own browser** with `localStorage` (wrapped in `try/catch`, with a memory fallback, see `js/store.js`). Shared things that every visitor must see (codes, archived reviews, who may use the Control Tower) are **JSON files in the repo** under `data/`, changed by committing to GitHub.

| What | Where it lives | Who sees it |
|---|---|---|
| Accounts, Octmiles, trips, history, rewards | `localStorage` (`octee.users`, `octee.session`) | Only that browser |
| Reviews written on the site | `localStorage` (`octee.reviews`) | Only that browser |
| Archived / published reviews | `data/reviews.json` | Everyone |
| Octmiles codes (as SHA-256 hashes) | `data/codes.json` | Everyone (codes can't be read back from the hashes) |
| FAG administrators (password hashes) | `data/control-tower.json` | Everyone (passwords can't be read back) |
| Timetable, places, Octmiles rates | `js/destinations.js` | Everyone |
| Scraggy Airlines flights | Scraggy's `js/data.js` (live) or `js/scraggy-data-snapshot.js` | Everyone |

**Honest limits (by design, it's a joke site):**

- An account only exists in the browser where it was made. Another device or browser won't know it.
- Anyone can edit their own browser storage and give themselves Octmiles. That only affects their own browser, and Octmiles have no real-world value.
- Seats are simulated (§2). Other visitors' bookings can't be seen.
- Nothing is ever sent anywhere: no tracking, no analytics, and the contact form stays in the page.

### 7.1 Accounts (`login.html`, `account.html`, `js/auth.js`)

1. **Log in / Sign up** tabs. Headline: **WHO ARE YOU? / we also forgot**.
2. **Sign up:** username (3–20 letters, numbers, underscores; unique, not case-sensitive), password (8+ characters), confirm password. Welcome bonus: **100 Octmiles**.
3. **Passwords are never stored:** only a salted **PBKDF2-SHA256** hash (150,000 rounds, Web Crypto), same idea as Scraggy's demo mode.
4. After login the visitor returns to the page they came from (`login.html?next=book.html`, only Octee page names allowed).
5. The header shows **"Hi, username · 1,250 Octmiles · Gold Wing · Have a code? · Log out"**.
6. **My Account** (`account.html`): username, member since, Octmiles, tier, **My Trips** (each trip opens to show its boarding passes) and "Delete my account from this browser" (press twice).
7. The login page says plainly: *"Your account is saved in this browser only … Don't reuse an important password."*

| Situation | Message |
|---|---|
| Wrong username or password | "Wrong password. Or wrong username. We lose track of things." |
| Username taken | "That username is taken. Someone boarded first." |
| Password too short | "Password too short. Like our legroom." |
| Passwords don't match | "Those passwords don't match. Neither do our timetables." |

### 7.2 Earning Octmiles and tiers (`js/miles.js`)

| How | Octmiles |
|---|---|
| Sign up | 100 |
| Octee flights, per stretch flown | FIA ↔ SIA 150 · FIA ↔ LIA 200 · FIA ↔ Scraggy House 250 · SIA ↔ LIA 120 · SIA ↔ Scraggy House 80 |
| One United (OU) flights | Half the Octee rate for the same stretch |
| Octee First | +50 per flight |
| JOELMOBILE ride | 20 (max 3 a day) |
| First review | 30 (once) |
| Octmiles code | whatever the code is worth (once per code per account) |

- Scraggy Airlines flights earn no Octmiles ("Scraggy Points are collected with Scraggy Airlines").
- At most **5 flights booked per day** per account: *"Sorry, you have flown too much today."*
- **Tiers use lifetime Octmiles** (only go up), so spending never drops a tier: Economy Peanut (0+), Silver Wing (500+), Gold Wing (2,000+), Platinum Wing (10,000+).

### 7.3 Rewards shop (`octmiles.html`)

A second peanut (250, always out of stock) · Priority JOELMOBILE pickup (300) · Bag tracking upgrade (500) · Window seat (800, window not included) · Engine check (1,500, once) · Name a gate at FIA (5,000, once; shows on the FIA map in that browser) · Cockpit tour (10,000, once). Spending takes from the balance only. Unaffordable rewards are greyed out with *"You need 120 more Octmiles."* The page says: "Octmiles and rewards have no real-world value."

### 7.4 Octmiles codes ("Have a code?" box)

- On `octmiles.html` and as a pop-up from **Have a code?** in the header. Logged-in only.
- Codes ignore capitals and spaces (`octee 500` = `OCTEE500`).
- **How a static site checks a code:** the browser turns what you typed into `SHA-256("octee-code:" + CODE)` and looks for that hash in `data/codes.json`. The file never contains the code itself, so reading the repo doesn't give codes away.
- Each code: `octmiles` (1–5,000), optional `expires` date, `active` on/off, optional `note`.
- Once per code **per account** (remembered in that browser). A "max uses for everyone" limit isn't possible without a server, so it isn't offered.
- At most **10 wrong codes per hour** per account.
- Messages: *"+500 Octmiles! Please don't spend them all on one peanut."* · *"That code is not real. Like our on-time record."* · *"You already used this code. Nice try."* · *"This code has expired. Like your boarding pass."* · *"This code has been grounded."* · *"Too many wrong codes. Please wait an hour and think about what you've done."*
- The repo ships with one welcome code: **`OCTEE500`** (500 Octmiles). Switch it off in the FAG code administration if you don't want it.

### 7.5 FAG code administration (the secret code-maker, `js/control-tower.js`)

Clicking the Octee logo **8 times within 4 seconds** on any page opens a pop-up for **FAG — Fuji Airport Group**, asking the visitor to sign in to access the Octmiles points codes. (A single click still goes Home.)

**This part looks serious on purpose.** It is the one place on the site with no jokes:

- Plain corporate styling: white panel, dark grey text, square corners, a dark "FAG" mark, the heading **Fuji Airport Group** and the line "OCTMILES CODE ADMINISTRATION · RESTRICTED SYSTEM". No orange, no emojis, no punchlines.
- Sign-in text: *"Authorised personnel only. Sign in to access the Octmiles points codes."* Fields: Name, Password. Button: **Sign in**.
- **Wrong name or password: the pop-up vanishes instantly.** No error message, no hint, nothing left on the page. After 5 wrong tries it also closes instantly for the next 5 minutes, even with the right password.
- **Who can sign in:** the owner and administrators listed in `data/control-tower.json`. Passwords are stored only as salted PBKDF2 hashes.
- **First time** (no owner in the file yet): "Initial setup" asks for the owner name and a strong password (12+ characters), then **downloads `control-tower.json`**. Put it in `data/`, commit and push.
- **Codes tab:** create a code (type one or press **Random**, e.g. `OCT-7K2P`), set Octmiles (1–5,000), optional expiry and note; switch codes on/off; delete. Then **Download codes.json**, replace `data/codes.json`, commit and push. The plain code is shown once only, so record it.
- **Admins tab (owner only):** add an administrator (name + their password) or remove one, then **Download control-tower.json** and commit it.
- **The real lock is GitHub.** This system only prepares files in the browser. Nothing changes for anyone else until someone with push access to the repo commits them. So even if someone found the 8-click trick or guessed a weak password, they couldn't publish anything.
- Changes not yet published are kept in that browser (`octee.tower.*`) and the panel says "There are unpublished changes."

### 7.6 Reusing Scraggy's code

| Scraggy file | Used in Octee as |
|---|---|
| `js/data.js` | Loaded **live** by `js/scraggy.js` (flight numbers, times, gates, aircraft, classes, snacks, reasons). A copy is kept as `js/scraggy-data-snapshot.js` for when the live one can't load; refresh the copy when Scraggy changes. |
| `js/backend-local.js` (demo mode) | Same idea for `js/auth.js`: localStorage accounts + PBKDF2. Scraggy's Supabase mode is **not** used. |
| `book.html` / `js/book.js` | Same 6 steps; reused as the **SIA form** in transfers (§5.10). |
| `js/clock.js` | Side clock, with FIA added (§5.0). |

### 7.7 Accessibility

- Real `<label>`s everywhere; `autocomplete="username"`, `"current-password"`, `"new-password"`; "Show password" toggles.
- Messages use `role="status"` / `aria-live="polite"`; booking errors use `role="alert"`.
- The flight calendar follows the WAI-ARIA date picker dialog pattern (arrow keys, Enter, Esc; full labels like "Tuesday 6 October 2026, departure date").
- The destination search is a combobox (`role="combobox"`, `aria-expanded`, `aria-activedescendant`, `role="listbox"`).
- `prefers-reduced-motion`: no tagline rotation animation, no button dodge, the JOELMOBILE stays parked.
- All user text (names, reviews) is set with `textContent`, never `innerHTML`.

---

### Accounts etched in the code (log in on any device)

There is still no server. An account can live in two places:

- **This browser** (localStorage): every account made with Sign up.
- **The code** (`data/accounts.json`): accounts the owner has saved from the FAG administration. Anyone can log in to these on **any device**, and they arrive with their Octmiles, Octeetokens, trips, rewards and used codes as they were when the file was last published.

How it works (`js/auth.js`):

- `logIn` checks the file. If the browser has no copy of that account, or an older one (`etchedAt`), and the password matches the file's hash, the file's copy is loaded into the browser. Otherwise the browser's own copy is used.
- `signUp` refuses a username that is already in the file.
- `syncEtched()` runs on every page: a logged-in account with the same password picks up a newer copy from the file by itself.
- **The file wins.** Points earned on a device after the last save stay on that device until the owner saves the account again; when a newer file is published, it replaces the device copy.

Two accounts are etched from the start: **Octee** and **Joel** (100 Octmiles each).

How to etch an account (FAG administration → **Accounts** tab): tick the accounts in this browser, press **Download accounts.json**, put it in `data/`, commit and push. "Remove from file" takes an account out.

Privacy: `data/accounts.json` is **public** in the repo. It holds usernames, salted PBKDF2 password hashes, balances and trips (with passenger names). Only save accounts whose owners agree, with passwords not used anywhere else. No real passwords, emails or payment details are ever stored.

### Scraggymiles

- **Earned** on Scraggy Airlines flights booked here: Scraggy's own points for that route and class (`legPoints` from the Scraggy data): 100 Scraggy House, 250 MIA or Lujin's, 300 FIA, plus the Scraggy class bonus. Shown on the SA boarding pass and in the booking message.
- **Exchange:** 1 Scraggymile = **2 Octmiles** (`SCRAGGY_RATE` in `js/miles.js`), on the Octmiles page ("Scraggymiles" section). One way. The Octmiles received count as earned, so they raise lifetime Octmiles and the tier.
- **Sharing with Scraggy Airlines:** on the Octmiles page a passenger can move Scraggymiles into a pot shared with the Scraggy Airlines website (`transferScraggymiles`). Both sites live at the same web address, so they read the same browser storage key, `scraggy.shared.points` (`{ "username": points }`). Shared miles become Scraggy Points for the account with the **same username** on the Scraggy site and still show here ("on Octee only" / "shared with Scraggy Airlines"). Spending them on either site takes them off both; unspent, they stay on both. Exchanging to Octmiles uses Octee-only miles first, then the shared pot. Works per browser, on the live site.
- The etched accounts `Octee` and `Joel` also exist on the Scraggy site (`Scraggy-airlines/data/accounts.json`) with the same passwords.
- Stored on the account (`u.scraggymiles`), shown on the Account page, in the history table, and saved with etched accounts. They are not the Scraggy Points of the Scraggy Airlines website.

### Octeetokens (second currency)

Octmiles are **earned**; Octeetokens are what you **pay with**. All in `js/miles.js`, stored on the account in the browser (`u.tokens`).

- **Exchange:** 10 Octmiles = 1 Octeetoken (`TOKEN_RATE`), on the Octmiles page ("Octeetokens" section). One way only. Exchanging lowers spendable Octmiles but not lifetime Octmiles, so the tier never drops.
- **What tokens pay for** (`TOKEN_PRICES`, `OA_CLASSES[].tokens`):
  | Thing | Price |
  |---|---|
  | A JOELMOBILE ride (must be logged in; the first 3 rides a day still give 20 Octmiles back) | 5 Octeetokens |
  | Octee Business, per booking (Economy is free) | 30 Octeetokens |
  | Octee First, per booking | 60 Octeetokens |
  | Upgrading an existing trip on My Trips | the difference (Economy → Business 30, Business → First 30) |
  | One more code for today | 20 Octeetokens |
- **Code limit:** each account can redeem **5 codes a day** (`CODES_PER_DAY`), counting listed codes and number-rule codes together. Only successful codes count. Each extra code slot bought with tokens is for that day only. The code box shows how many are left.
- Booking: the class step shows each price and refuses a class the account cannot afford; tokens are taken at Confirm. Scraggy Airlines flights keep Scraggy's own classes and are not upgraded.
- The header shows both balances; the Octmiles history table has an Octeetokens column.

### Ready-made codes and the number rule

- `data/codes.json` ships with four codes: `OCTEE500` (500 Octmiles), `JOEL` (1,000), `OCTEE` (5,000) and the crew code `OCTEECREW`.
- **`OCTEECREW` is special** (flags on its entry in `codes.json`: `repeat`, `noLimit`, `atTopTier`): it gives 100,000 Octmiles, which reaches the top tier (Platinum Wing) at once. If the account is **already in the top tier**, it gives **100 Octmiles + 100 Octeetokens** instead. It **does not count** towards the 5 codes a day (it also works when the 5 are used up). After the first (tier) use, the 100 + 100 bonus works **twice** by itself (`freeTopUses: 2`). Every use after that is stopped with "A message has been sent to the control tower" and needs **permission from an admin or the owner**; each permission allows one more use.
- **Permissions (`js/permissions.js`):** there is no server, so the "message" is a request saved in that browser (`octee.tower.requests`). In the FAG administration, the **Requests** tab lists pending requests with **Give permission** / **Refuse**, a form to give permission by username (for a request made on another device), and the permissions given. A permission given in a browser works there at once (`octee.tower.grants`). For other devices, **Download permissions.json**, put it in `data/`, commit and push (`data/permissions.json` = `{ "crew": { "username": extraUses } }`). Codes ignore capitals and spaces; each account can use a code once.
- **Number rule** (in `js/miles.js`, no file needed): any **5-digit number** whose **first digit is 1 or 2** and whose **last digit is odd** is worth its **first three digits** in Octmiles. Example: `23487` gives 234; `10001` gives 100; `12340` (even) and `31235` (starts with 3) give nothing. Each number works once per account. A code listed in `codes.json` always wins over the rule.

## 8. Tech Stack & Structure

- **Plain HTML + CSS + JavaScript modules.** No build step, no framework, no server, no database.
- **Hosting:** GitHub Pages (static).
- **Fonts:** Google Fonts (Playfair Display, Inter, JetBrains Mono).
- **Run locally:** browsers block JavaScript modules on `file://`, so use a tiny server: `python3 -m http.server 8000` → `http://localhost:8000`.

```
Octee-airline/
├── index.html          Home: tagline rotator, destination search, flight finder, stats, reviews strip
├── destinations.html   Search (direct / stops / changes / Scraggy transfers), cards, route map
├── book.html           6-step booking form + SIA form + flight calendar + boarding passes
├── status.html         Today's FIA departures & arrivals (never ON TIME)
├── baggage.html        99% bag tracker
├── experience.html     One peanut
├── fia.html            Mount Fuji photo header, FIA map + tagline posters
├── joelmobile.html     "I'm a joel!"
├── oneunited.html      ONE UNITED: the OU airline, timetable, connections
├── reviews.html        4.9★* facade + real average + lost-with-baggage reviews
├── octmiles.html       Balance, tiers, rewards shop, "Have a code?"
├── login.html          Log in / Sign up
├── account.html        Profile + My Trips
├── about.html  contact.html  404.html
├── css/styles.css      All styles (brand tokens at the top)
├── js/
│   ├── config.js       Settings (time zones, Scraggy site URL, logo clicks for the FAG sign-in)
│   ├── main.js         Header, nav, account area, side clock, footer, 8-click logo
│   ├── store.js        Safe localStorage / sessionStorage
│   ├── dom.js          el() helper (textContent only), dates, toast
│   ├── crypto.js       SHA-256, PBKDF2, code hashing
│   ├── auth.js         Accounts in this browser
│   ├── miles.js        Octmiles, tiers, rewards, code redemption
│   ├── destinations.js Places, timetable, trip finder, simulated seats, search matching
│   ├── scraggy.js      Loads Scraggy's real data (live or snapshot)
│   ├── scraggy-data-snapshot.js  Copy of Scraggy's js/data.js
│   ├── calendar.js     Flight calendar
│   ├── book.js  booking-data.js   Booking form + boarding passes
│   ├── search.js  taglines.js  reviews-data.js  code-box.js  control-tower.js
│   └── home.js  destinations-page.js  status.js  baggage.js  experience.js  fia.js  oneunited.js
│       joelmobile.js  reviews.js  octmiles-page.js  login.js  account.js  contact.js
├── data/
│   ├── codes.json          Octmiles codes (hashes only)
│   ├── reviews.json        Published reviews
│   └── control-tower.json  Owner + admins (password hashes only)
├── assets/img/         octee-logo.svg, octee-logo.png, favicon.svg
├── README.md  DEVELOPMENT.md  LICENSE
```

### Tagline data (`js/taglines.js`)

```js
// Each line is a separate entry. `punch: true` = punchline styling; `size: "small"` = tiny text.
export const FIA_TAGLINES = [
  { id: "fly",     lines: [{ text: "FLY SOMEWHERE." }, { text: "EVENTUALLY", punch: true }] },
  { id: "lost",    lines: [{ text: "LOST? we will make you more lost", punch: true }] },
  { id: "bags",    lines: [{ text: "YOUR BAGS" }, { text: "our mystery", punch: true }] },
  { id: "takeoff", lines: [{ text: "\"are we taking off yet\"" }, { text: "Are the engines working?", punch: true }] },
  { id: "think",   lines: [{ text: "THINK" }, { text: "before you" }, { text: "say", punch: true }] },
  { id: "sophisticated", lines: [
      { text: "becoming sophisticated" }, { text: "is impossible" },
      { text: "at least on this flight", punch: true, size: "small" } ] },
  { id: "peanut",  lines: [{ text: "Peanut? Peanut?" }, { text: "ONE PEANUT", punch: true }] },
];
```

### Deploying to GitHub Pages

1. Commit everything and push to `main` on `github.com/zengyixin0205/Octee-airline`.
2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch **main**, folder **/ (root)**, **Save**.
3. After about a minute the site is at `https://zengyixin0205.github.io/Octee-airline/`. Every push redeploys it.
4. All links are relative, so the `/Octee-airline/` path works. `404.html` is used for missing pages.
5. Push the **Scraggy-airlines** changes too (FIA route + flight times) so its live `js/data.js` matches; until then Octee uses its saved copy.
6. **Publishing codes, reviews or admins later** = edit/replace the file in `data/`, commit, push.

---

## 9. Coding Conventions

- Semantic HTML (`<header>`, `<nav>`, `<main>`, `<section>`, `<footer>`); every page shares the header/footer built by `js/main.js`.
- CSS custom properties for all brand colours (top of `css/styles.css`).
- Mobile-first, works down to 360px wide with no sideways scrolling.
- Never `innerHTML` with user text; use `el()` / `textContent`.
- Every `localStorage` call goes through `js/store.js` (never throws).
- No secrets in the repo: only hashes. No tracking, no external data collection.
- Commit messages: `feat:`, `fix:`, `style:`, `docs:`.

---

## 10. Milestones

| # | Milestone | Status |
|---|---|---|
| M1 | Foundation: styles, header/nav, footer, logo, side clock | ✅ |
| M2 | Home: tagline rotator, search, flight finder, stats, review strip | ✅ |
| M3 | Flight Status board | ✅ |
| M4 | Baggage tracker | ✅ |
| M5 | In-Flight (one peanut) | ✅ |
| M6 | About + FIA (map, posters) | ✅ |
| M7 | Destinations + search + route map + Contact | ✅ |
| M8 | Accounts + Octmiles + rewards (browser-only) | ✅ |
| M9 | Book a Flight: calendar, options, 6 steps, SIA form, boarding passes | ✅ |
| M10 | JOELMOBILE | ✅ |
| M11 | Reviews | ✅ |
| M12 | Codes + FAG code administration (static files) | ✅ |
| M12b | Orange theme, one range calendar for both dates, One United (OU) airline | ✅ |
| M13 | Deploy to GitHub Pages; push Scraggy changes; Bo creates the FAG owner account | To do |

---

## 11. Acceptance Checklist

- [x] All 7 FIA taglines appear with the exact line breaks in §3; "at least on this flight" is small
- [x] FAG → FIA → Octee shown on About and in the footer
- [x] Every "facade" claim on Home has an undercutting footnote
- [x] Flight Status shows today's flights from the timetable and never says "ON TIME"
- [x] Bag tracker never finds the bag (stops at 99%)
- [x] Only ever one peanut
- [x] Logo matches §6
- [x] Side clock on every page: Your time, FIA time, SIA time
- [x] Octee flies OA 58 + OA 100–118 exactly as the timetable in §2, including flights with stops
- [x] Trips can change planes at any airport (45 min minimum, max 2 changes), including OA → SA at SIA
- [x] OA 58 from FIA and OA 101 from LIA both connect to the same SA103 at SIA (Tue/Fri)
- [x] Flights can only be booked through the 6-step form; dates only via the flight calendar (no-flight days greyed out)
- [x] Confirm stays disabled until every step (and every tick box) is done; going back and breaking a step locks it again
- [x] Trips with Scraggy flights need the SIA form too; its options come from Scraggy's real `data.js`
- [x] No card or payment fields anywhere
- [x] Guests can fill the form, log in, and come back to Confirm with their answers kept
- [x] Sign up / log in / log out work; passwords stored only as PBKDF2 hashes
- [x] Octmiles, tiers (lifetime), rewards, daily limit work
- [x] Reviews: 4.9★* facade **and** the real average; 1–3★ are in "lost with your baggage", not removed
- [x] "Have a code?" works with `data/codes.json` (hashes only), once per code per account, 10 wrong tries an hour
- [x] 8 quick clicks on the logo open the serious FAG (Fuji Airport Group) sign-in; a wrong password makes it vanish instantly; signed in, it makes codes/admins and downloads the files to commit
- [x] The whole site revolves around orange (buttons, banners, calendar)
- [x] One calendar picks the departure and arrival dates; the days between are shaded; Done saves
- [x] ONE UNITED section ("unitation is a dream, it's chaos.") with OU 1–OU 8; OU flights connect with OA and SA and can be booked on the FIA form
- [x] There is a way to and from MIA and Lujin's every day (via OU or OA + SA)
- [x] Works on phones (no sideways scroll) and with reduced motion
- [ ] Deployed to GitHub Pages

## FIA gate sign, smaller maps, picture headers

- `fia.html` has a "DEPARTURES · GATES" sign (rendered by `js/fia.js`) listing today's FIA departures with terminal and gate.
- `fiaGate(airline, flightNo)` in `js/destinations.js` is deterministic per flight number, so the sign and the booking confirmation always show the same gate. Scraggy Airlines flights use the gate from the Scraggy data.
- Both FIA maps are capped at 720px wide (`.fia-map` in `css/styles.css`).
- Book a Flight uses `assets/img/book.jpg`, Flight Status uses `assets/img/status.jpg` as `.hero.photo` headers.

## Maps in one row, background music

- `fia.html`: the Airport map and Inside Terminal 1 sit side by side (`.map-row`, stacked on screens under 900px). Clicking a map opens it enlarged (`js/fia.js`).
- `js/music.js` (loaded by `js/main.js`): a "♪ Music on/off" button bottom left of every page. Sound starts after the visitor's first click/tap/key press (browser rule); the choice is remembered in the browser (`octee.music`).
- The music is made up live with Web Audio (no audio files, no copyright; see "Music, no files" below).

## FIA guide text

- `fia.html` now has a written guide above the maps: "How to get to your gate" (9 steps) and an info grid (check-in, security, passports, SBB train, food, lounge, lost and found, JOELMOBILE, gate changes). The facts match the maps (desk numbers, piers, A8 annex walk, SBB route, Terminal 5 across the runway).
- The Airport map takes two thirds of the map row and Inside Terminal 1 one third (`.map-row` is `2fr 1fr`).

## Music carries on between pages

- `js/music.js` saves the MP3 position several times a second (`octee.music.state`) and the next page resumes from there, adding the time the page change took. The song plays to its end, then loops. A visitor returning after 60 seconds starts from the top. There is a short gap when a page changes, which a multi-page static site cannot avoid.
- The MP3 is `assets/audio/music.mp3`. Seeking needs a server that supports HTTP range requests (GitHub Pages does; `python -m http.server` does not, so locally the song restarts on each page).

## Music on entering the site

- Browsers do not allow sound on a brand new visit until the visitor clicks. `js/music.js` first tries to autoplay; if the browser blocks it, the first page shows a "Welcome aboard Octee Airlines" screen with a "Board (sound on)" button (one click enters and starts the music) and a "No music, thanks" link (turns the music off). It shows once per browser session (`octee.music.splash`). Escape = no music.
- Pages after the first normally play straight away (desktop Chrome allows it once the visitor has clicked on the site). On phones and Safari the music may wait for the first tap on each new page.

## Music playlist

- `js/music.js` plays `assets/audio/music.mp3`, then `music2.mp3`, `music3.mp3` ... (every file that exists, up to 20, stopping at the first missing number). When a song ends the next starts; after the last the list starts again. One file just repeats. To add a song, drop it in as the next number, e.g. `music3.mp3`.
- Position and song number are kept across pages (`octee.music.state`).

## Check-in, seat map, boarding pass and flight tracker

All three work on a booked flight (a "leg" of a trip) and are found with `?t=<trip creation time>&leg=<number>`.

- `checkin.html` (`js/checkin.js`, `js/seatmap.js`): pick a seat per passenger on a seat map. Octee: First rows 1-3 and Business 4-8 (2+2), Economy 9-32 (3+3), no row 13, and you can only sit in your own class's cabin. One United: one 3+3 cabin. Scraggy: a 2+2 cabin. About a third of the seats are taken and about 7% are "unavailable (spiritually)" with a funny reason; both are worked out from the flight number, date and seat, so they never change on reload. Saves `leg.seats` (one per passenger) and `leg.checkedIn` on the trip.
- `pass.html` (`js/pass.js`, `js/boardingpass.js`): one printable boarding pass per passenger with a made-up barcode (`js/tripkit.js`), gate, terminal, seat, group and "BOARDING CLOSES IN -3 MINUTES". The print stylesheet hides the header, footer, clock and music button.
- `track.html` (`js/track.js`): follows a booked flight. The status moves one step worse about every 7 seconds (and one step per 2 minutes you are away), the estimated departure slips, a plane on a line moves forwards and backwards, and an update log fills up. Progress is kept per flight in this browser (`octee.track.<trip>.<leg>`) so it never gets better. With "reduce motion" on, it only gets worse when you click.
- The booking confirmation and the account page show "Check in and pick a seat" or "Boarding pass" plus "Track flight" for each flight; the account page also shows the boarding passes of checked-in flights inside each trip. "Check-in" is in the main menu, and the Flight Status page links to the tracker.

## Delay certificate, complaint desk and JoelAI

- **Certificate of Delay** (`certificate.html`, `js/certificate.js`, `js/delays.js`): the tracker's delay table (`STAGES`, `NOTES`) now lives in `js/delays.js` so the tracker and the certificate agree. Once a tracked flight is late, the tracker shows "Get my delay certificate". The certificate names the passengers, flight, route, date, the delay ("2h 10m and counting" while the flight is still getting worse), the reason (current status), a certificate number (`CD-####`), a peanut signature (SVG peanut with monocle, moustache and bow tie, signed "P. Nut, Chief Delay Officer") and a red "VERY OFFICIAL" seal. Print uses landscape. If the flight is not delayed yet it says "NOT DELAYED YET".
- **Complaint Desk** (`complaint.html`, `js/complaint.js`): name, flight (from your trips), category, "how upset" slider and text. It gives a ticket `COMP-#####` and an automatic reply that says the complaint is "at the front of the queue" and that compensation is paid in peanuts (1 to 6, from the slider and length). Tickets are saved locally (`octee.complaints`, newest 20) and sync in a Cloud-linked account profile with a status that slowly gets sillier. Linked from the Contact page and the footer. Complaint text is always shown as plain text.
- **JoelAI** (`js/joelai.js`, `js/joelai-ui.js`, section `#joelai` on `joelmobile.html`): a chat box under the JOELMOBILE. It is NOT a real AI. It is a scripted rulebook that matches words in the question and answers from the site's own data: timetable (flight numbers, today's departures, places), FIA terminals and gates (`fiaGate`), Scraggy routes, tiers and rewards (`miles.js`), and, when logged in, your own Octmiles, Octeetokens, next flight and check-in. It has about 40 topic answers (security, passports, lounge, food, train, bags, wifi, check-in, tracker, certificate, complaints...), jokes, and chips for follow-ups. It refuses questions about the control tower, passwords, secrets and the code rule. History is kept per tab (`sessionStorage`, 40 messages) with a "Start again" button. To make it a real AI later you would need a backend with an API key (a key must never be put in static files).

## Apology letters, banner and the JoelAI button

- **Late from the first millisecond:** in `js/delays.js` stage 1 is now "1 MILLISECOND LATE (we are so sorry)" (no extra minutes). `isLate(stage)` is true from stage 1, and `fmtLate(stage)` says "1 millisecond" until real minutes are added. The tracker's certificate button, the apology and the delay certificate all use it, so the certificate now works for a 1 millisecond delay ("1 millisecond and counting").
- **Apology** (`js/apology.js`, `apology.html`, `js/apology-page.js`): when the tracker shows a late flight it calls `sendApology()`. That saves an apology in this browser (`octee.apologies`) and shows a banner on EVERY page ("New message from Octee Airlines: we are so, so sorry. Flight OA 58 is 1 millisecond late.") with "Read the apology" and "Dismiss". Dismiss hides the banner for the rest of the browser session only. Opening the letter marks it read. If the flight gets 4 steps worse (or departs), a further apology is sent ("Another apology…", "This is our apology number N"). The long letter (about 12 paragraphs) apologises over and over, changes with how late the flight is, and counts the number of times it said sorry. `apology.html` without a flight shows the list of all apologies. A flight only gets an apology once it has been opened in the tracker (that is where the delay state lives).
- **JoelAI button:** an "Ask JoelAI" button sits in the top row of every page next to "Have a code?" (and next to Log in when logged out). It opens JoelAI in a pop-up (`openJoelAI()` in `js/joelai-ui.js`). The chat on the JOELMOBILE page is still there; both use the same saved conversation. JoelAI also answers "sorry / apology / why is my flight late".

## Flights turn late by themselves (apology timing)

- `watchFlights()` in `js/apology.js` runs on every page (started from `js/main.js`) and checks every 3 seconds while a visitor is on the site. Each flight gets a due time the first time it is seen, kept in `octee.apology.sched`:
  - a flight the visitor already had turns late about 1 minute after they are on the site (45 to 75 seconds);
  - a flight booked in the last 3 minutes turns late within 2 minutes of booking (60 to 115 seconds). Booking fires `octee:account`, which makes the scan pick it up at once;
  - about 1 flight in 25 (`RARE`) never turns late by itself, so no banner comes. This is worked out from the flight, so it is the same every time. If the visitor opens the tracker for that flight it still gets worse after a few seconds, so the apology comes then.
- When due, the flight is moved to tracker stage 1 ("1 MILLISECOND LATE") in the saved tracker state and `sendApology()` is called, so the banner, the letter, the tracker and the certificate all agree. Flights that left more than a day ago are ignored. The timers only run while a page of the site is open.

## Peanuts, Lost and Found, Share card, Upgrade lottery, The Octee Times, Runway status

- **Peanut Wallet** (`js/peanuts.js`, `peanuts.html`, `js/peanuts-page.js`): peanuts live on the account (`u.peanuts`, `u.peanutLog`, `u.peanutItems`). A complaint pays its promised peanuts at once (1 to 6); each apology pays 1 (`apology.js`, delayed by a tick so it does not clash with the flight scan). The header has a 🥜 pill. The Peanut Shop sells six silly things. The JOELMOBILE form has a "Pay in peanuts instead (3)" box (`js/joelmobile.js`). Guests who complain get no peanuts (no wallet).
- **Lost and Found** (`lostfound.html`, `js/lostfound.js`): 20 fixed items (5 or so "Claimed by Joel"), search, "This is mine" (needs a description; +1 peanut when logged in), and a form to report something lost (ticket `LF-####`). Claims and reports are kept in this browser (`octee.lostfound`).
- **Share card** (`share.html`, `js/share.js`): draws a 1080 x 1350 picture on a canvas (route, how late, seat, booking number, peanut) with Save and, on phones, Share. Button "Share my trip" is on the tracker, the delay certificate and the apology page.
- **Seat Upgrade Lottery** (`upgrade.html`, `js/upgrade.js`): 10 Octeetokens a spin (`TOKEN_PRICES.spin` in `miles.js`) on an Octee flight. 16 segments: 1 First, 1 Business, the rest "better", "sorry", "window" and "peanut". Winning First or Business really changes `leg.travelClass` (and releases the seat and check-in, because the cabin changed). If you already have that class you get a peanut. Spins are logged in `u.spins`. The wheel uses `crypto.getRandomValues`.
- **The Octee Times** (`news.html`, `js/news.js`): a new front page each day (16 stories, shuffled by the date), a horoscope (always about delays, your sign is remembered), and a 5 x 5 crossword with Check and Reveal.
- **FIA Runway Status** (`runway.html`, `js/runway.js`, `js/weather.js`): weather and 3 runways that change every 2 minutes (worked out from the clock, so everyone sees the same). Late flights are listed with "Delayed by weather: ...". The tracker has a "Weather at FIA" line, and JoelAI links to it.
- The footer has a "More:" row with links to all of these.

## Faster apologies, Oliver and David, change password, smarter JoelAI

- **Timing (`js/apology.js`):** a flight booked just now turns "1 MILLISECOND LATE" exactly 8.88 seconds after booking (`FRESH_MS`); a flight you already had, 20 seconds after you are on the site (`EXISTING_MS`). The scan wakes up on a timer set for the next due flight. About 1 flight in 25 still never turns late by itself (`RARE`).
- **Ambient apology (`watchAmbient()`):** for EVERYONE (logged in or not, booked or not) a banner "we are so, so sorry. Everything is 1 millisecond late." appears every 20 seconds (`AMBIENT_MS`), stays 12 seconds, and Dismiss restarts the 20 seconds. It counts up ("Apology number 7"). It links to a general letter: `apology.html?general=N` (no login needed). A flight apology banner takes priority over it. The ambient apology gives no peanuts.
- **Accounts:** Oliver/Oliver and David/David are etched in `data/accounts.json` on both sites (Octee 150,000 PBKDF2 iterations, Scraggy 100,000).
- **Change password (`changePassword()` in `js/auth.js`, card on `account.html`/`js/account.js`):** needs the current password, new password (8+ characters) twice, new must differ. For an account etched in the code this changes the copy in THIS browser only; other devices still use the password in `data/accounts.json` until the account is etched again from the FAG panel. The Scraggy site has no change-password card.
- **JoelAI guides (`guide()` in `js/joelai.js`):** step-by-step answers with links for: check in, boarding pass, change password, book a flight, use a code, track a flight, delay certificate, complain, upgrade, get Octeetokens, and "how do I start / what can I do". When logged in with an upcoming flight, the first link goes straight to that flight (`checkin.html?t=..&leg=..`). Guides run before the secrets rule (they never reveal anything). Chat bubbles now keep line breaks (`white-space: pre-line`).

## Mute button and "Joel has run out of sorry"

- The 20-second banner has a **Mute apologies** button, and the footer has a switch "Apologies: on (mute them) / muted (turn them back on)". The choice is kept in `octee.apology.mute` (this browser). It only affects the 20-second general apology; apologies for your own flights still come.
- Joel says sorry **3 times** (`SORRY_LIMIT` in `js/apology.js`) per browser session ("Apology number 2 of 3"). From the 4th banner on, "Joel has run out of sorry" and apologises for something unrelated (7 of them in `UNRELATED`, rotating: the pigeon, a sandwich, Tuesday...). The count is in sessionStorage (`octee.apology.n`), so a new session starts with 3 real sorries again. `apology.html?general=N` shows a letter "from the cupboard" when N is above 3.

## Joel's cupboard, Meal pre-order, Delay bingo

- **Joel's cupboard** (`cupboard.html`, `js/cupboard.js`): has its own item in the main menu, right beside JOELMOBILE, but the door stays locked until Joel has run out of sorry. It opens only after Joel has run out of sorry: the 4th banner of a session sets `octee.cupboard` (`apology.js`), and reading the "from the cupboard" letter (`apology.html?general=4+`) sets it too and links to the page. Before that the page shows a locked door and how many sorries Joel has left (`sorryLeft()`). Inside: a sandwich you look at, touch and eat (then a new one), Joel on a mop bucket who talks, Joel's to-do list (checkboxes saved; finishing it gives 1 peanut), and a tiny "DO NOT DISTURB" sign that escalates when you press it. First visit gives 2 peanuts. State is in `octee.cupboard.state`. JoelAI says "There is no cupboard."
- **Meal pre-order** (`meal.html`, `js/meal.js`): pick a flight (or open from the tracker), then a dish for every passenger from 9 peanut dishes, plus special requests. The receipt shows "You ordered X, you will get A peanut" and a `MEAL-####` number. Saved on the leg as `leg.meals` `{ticket, at, note, orders[]}`; it can be changed later.
- **Delay bingo** (`bingo.html`, `js/bingo.js`): a 5 x 5 card per flight (stable, shuffled by flight, free square in the middle). 15 squares come from the tracker's stages and can be ticked only once your flight has reached that stage (`trackState`); 9 are on your honour. Five in a row (row, column or diagonal) shows a printable **Certificate of Bingo** (`BG-####`, peanut signature, seal) and gives 3 peanuts once per flight. State is in `octee.bingo.<trip>.<leg>`. The peanut and seal art moved to `js/peanutart.js` and is shared with the delay certificate.
- Links: the tracker has "Delay bingo" and "Pre-order a meal"; the footer "More:" row has Meal Pre-order and Delay Bingo; JoelAI answers meals and bingo.

## Joel is sorry every 10 seconds

- The general apology banner (`AMBIENT_MS` in `js/apology.js`) now comes every **10 seconds** (was 20) and stays 6 seconds unless dismissed. With Joel saying sorry 3 times a session, he runs out of sorry about 40 seconds after you arrive (the 4th banner), which opens the cupboard. Flight apologies are unchanged (8.88 seconds after booking, 20 seconds for flights you already had). Mute still works.

## Bag tracker and the Baggage Game

- **Bag Tracker** (`bagtrack.html`, `js/bagtrack.js`; "Bag Tracker" in the menu next to Baggage): type any bag tag (letters and numbers, 3 to 12; "make one up" button). The same tag always has the same journey (`journey()`): check-in, security, sorting room, carousel, then 8 wandering steps (trolley bay, a different gate, a flight to MIA, Scraggy House, back to the carousel...) and finally Lost and Found. The bag moves every 6 seconds on an airport map (dashed trail), plus one step per 90 seconds you are away, and the progress is kept per tag in this browser (`octee.bag.<TAG>`); recent tags are in `octee.bags`. A carousel ring shows bags (a tuba, a shoe, a sandwich...) going round; when the bag is at "Carousel 7" it appears on the belt with an orange ring and "YOUR BAG". Reduced motion: the bag only moves with the "Next update" button and the belt is still. `?tag=OA123456` links to a bag.
- **The Baggage Game** (`baggame.html`, `js/baggame.js`): a canvas game on a T-shaped belt. Bags arrive on the top bar from the left. PUSH (button or Space) fires the pusher: a bag within 26 px of the middle is pushed down the stem to the plane (+1); a bag 26 to 78 px away is knocked into Lost ("Too early" or "Too late"); a bag that goes past without a push, or a press with nothing near, loses nothing extra (a missed bag goes down the chute to Lost at the right end). Five lost bags ends the game. The belt speeds up and bags come faster. Best score is in `octee.baggame.best`. Every 5 bags loaded earns 1 peanut at game over (up to 3) for logged-in players. Reduced motion: the belt runs at about half speed.
- Both pages link to each other, JoelAI answers about them, and the game is in the footer "More:" row.

## Safety demonstration and Octee Radio

- **Safety demo** (`safety.html`, `js/safety.js`): six animated SVG cards (seatbelt with no buckle, oxygen mask that may not drop, peanut-shell life jacket, exits incl. "EXIT ?", brace position, flight mode is a mood). They auto-advance every 8 s (pause, back, next); with reduced motion the animations and auto-advance are off. The quiz is 5 questions with shuffled options; 4 of 5 passes and gives 1 peanut once per day (`user.safetyDay`) for logged-in users.
- **Octee Radio** (`radio.html`, `js/radio.js`): four stations (Delay FM, Joel's Sorry Station, Peanut Classics, Lounge FM), each with a tracklist. Spoken items use `speechSynthesis` (caption and a timer if unavailable or silent); songs are generated with Web Audio, seeded by title. Nothing plays until the play button is pressed. It dispatches `octee:radio` so `js/music.js` pauses the site music while it plays. A "Radio" link sits beside the Music button (`.radio-link`, hidden in print). Both pages are in the footer "More:" row and JoelAI answers about them.

## Duty Free and the printable safety card

- **Duty Free** (`dutyfree.html`, `js/dutyfree.js`): 9 items, 1 to 6 peanuts, none can be taken on board. Buying spends peanuts (`spendPeanuts`), shows a `DF-####` receipt and stores counts in `user.dutyfree`; "Your receipts" lists them. Guests can browse only.
- **Safety card** (`safetycard.html`, `js/safetycard.js`): the six demo cards laid out on one A4 landscape sheet with a dotted fold line and a Print button. Artwork and text live in `js/safetydata.js`, shared with `safety.js`; animations are off in the card.
- Footer "More:" has both; JoelAI answers about them.

## Lost property auction and Turbulence mode

- **Auction** (`auction.html`, `js/auction.js`): 8 lots, each closing 40 s after listing (bids in the last 3 s extend by 3 s). A simulated rival (Joel and friends) raises bids every few seconds. Winning spends peanuts (`spendPeanuts`), bids can't exceed your free peanuts across all leading bids, and lots close even while you are away (settled on next load). Won bags are `user.auctionBags`; "Open it" never works and gives escalating notes. State in `octee.auction`. Guests watch only.
- **Turbulence** (`js/turbulence.js`, loaded from `main.js` on every page): fixed bottom-right button; shakes `main`, header and footer for 9 s (class `turbulent`; off with reduced motion), shows a cabin announcement and an all-time coffee counter (`octee.turbulence`).

## Credit card, cockpit and Wi-Fi

- **Credit card** (`creditcard.html`, `js/creditcard.js`): a form (name, income in peanuts, why) that always approves after a short "checking" delay and shows a card with a 16-peanut number (seeded by name). It asks for no real card details. Every purchase attempt is declined with a random reason and a counter. State per account (or "guest") in `octee.card`; can be cancelled.
- **Cockpit** (`cockpit.html`, `js/cockpit.js`): six swaying dials (still with reduced motion) and twelve buttons that each add an announcement to a log; the red "Do not" button escalates.
- **Wi-Fi** (`wifi.html`, `js/wifi.js`): four networks; connecting runs a progress bar that stops at 99% with cycling messages; the speed test ticks randomly and ends negative with ping "yesterday". Nothing touches the real network.
- All three are in the footer "More:" row; JoelAI answers about them.

## In-flight magazine and Octee Insurance

- **Magazine** (`magazine.html`, `js/magazine.js`): six fake articles, four adverts linking to site pages, and a 9 x 9 sudoku that cannot be solved on purpose: the first row holds 1 to 9 except one square, and a 2 is placed in that square's column, so it has no candidate (checked with a solver; no given clashes with another). "Check my puzzle" says which square is impossible. A missing "Page 4" closes the issue.
- **Insurance** (`insurance.html`, `js/insurance.js`): insure an item (value in peanuts, nothing is charged) against ticked silly perils; the policy lists exclusions ("anything that actually happens"). Every claim is rejected with a rotating reason. Policies (max 20) are stored per account or "guest" in `octee.insurance`. No real policy or card details are requested.
- Both are in the footer "More:" row and JoelAI answers about them.

## All Pages hub

- `allpages.html` (`js/allpages.js`): a hub listing every extra page as its own card, in four groups. It is in the main menu ("All Pages") and the footer "More:" row. When a new page is added, add it to `GROUPS` here too.

## Menus and Search

- The main menu now has drop-down groups (Peanuts and Money, Airport, On Board, Reading, built from `GROUPS` in `js/main.js`), so every extra page is its own menu entry. The All Pages hub is no longer linked (`allpages.html` is left unlinked). Add a new page to `GROUPS`.
- **Search** (`search.html`, `js/sitesearch.js`; "Search" in the menu): the index lists every page with keywords; a query returns a page with **no** keyword match (picked by hashing the query, so it is stable), says how many matching pages were removed, and offers a "Did you mean" that you did not. `?q=` links work.

## 404 page

- `404.html` + `js/notfound.js`: the missing page's name is used as a search ("Results for X: 4 results found, 0 pages found"). The four results ("X (page not found)", "X: the sequel", "Where is X?", "Did you mean Xs?") are links to other pages that do not exist (`found-<slug>.html?q=...`), so clicking one lands on the 404 again with a new search. The search box on the 404 works the same way. Note: GitHub Pages serves 404.html for any path, so deep paths (`/a/b`) lose the relative CSS and JS; single-level missing pages work.

## Duty Free purchases and the Departures board

- **Duty Free** now has a "Pay with" selector: peanuts (price as listed) or Octeetokens (3 x the peanut price, `TOKEN_X`). Buy buttons say what is missing ("You need 4 more..."), guests are told to log in/sign up. Purchases go to "Your purchases" (`user.dutyfree`) with a **Use it** button per item; goods still may not be taken on board.
- **Departures board** (`departures.html`, `js/departures.js`; "Departures" in the menu): a split-flap board built from today's FIA departures (same data as Flight Status, up to 14 rows plus OA 404 to NOT FOUND). Every status is DELAYED. Letters flip through random characters before settling; the status flips again every ~9 s; Full screen button, optional tick sound (off by default, needs a click), "Flip again". Reduced motion: no flipping.

## Entertainment and the header search bar

- **Header search bar:** a search form in the header of every page (`main.js`, `.nav-search`) that opens `search.html?q=...`. The "Search" menu item is still there.
- **Entertainment** (`entertainment.html`, `js/entertainment.js`; in the menu): "You are delayed" banner, four games in tabs: **Paper Plane** (canvas flappy game, 5 towers = peanut), **Delay Clicker** (idle clicker, 5 s of delay = peanut), **Suitcase Match** (6 pairs, 14 moves or fewer = peanut), **The Waiting Game** (do nothing, 30 s = peanut). Best scores in `octee.games.best`; one peanut per game per day (`user.gameDay`). Below the games: links to the other games and pages (Baggage Game, Bingo, Safety quiz, crossword, sudoku, Cockpit, Radio, Departures).

## Five more games (Entertainment)

- **Security Line** (15 items, a rule such as "Metal must be STOPPED" that changes every 5 items; 12 right = peanut), **Delay Trivia** (6 questions about the site; 5 right), **Find the Bag** (find your OA tag in a growing grid in 60 s, wrong bag costs 3 s; 6 found), **Boarding Call** (reaction test, 5 tries, early tap counts 999 ms; average under 450 ms), **Runway Landing** (canvas; hold to slow the sink rate below 2.4 and land on the runway; streak of 3). Same reward rule as the others (one peanut per game per day), bests in `octee.games.best`.

## Whack-a-Joel

- Tab "Whack-a-Joel" in Entertainment (`whack()` in `js/entertainment.js`): 30 seconds, 3 x 3 cupboards. Joel pops up (saying sorry) for about 1 to 1.5 seconds; a peanut sometimes pops up instead (hit it for -2). Aim the hammer with the mouse, touch or arrow keys; **Space** (or the HIT button) swings, and it only scores if the crosshair is over the cupboard holding Joel when you press. Spawn rate speeds up. 12 Joels = peanut (one per day); best in `octee.games.best`.

## Destination search file renamed

- The Home/Destinations "Where to?" box now lives in `js/destsearch.js` (imported as `./destsearch.js?v=2` by `home.js` and `destinations-page.js`). `js/search.js` is only a re-export. This was done because a browser that had cached the wrong `search.js` (see the earlier mix-up with the site search page, which is `js/sitesearch.js`) could break the home page. A new file name plus `?v=` makes every browser fetch the right one. Bump the `?v=` when this file changes.

## Music, no files (copyright) and Whack-a-Joel page

- The copyrighted MP3s (`assets/audio/music.mp3`, `music2.mp3`) were deleted and `js/music.js` no longer looks for audio files (older notes above that mention MP3 support are out of date). It generates two original tunes with Web Audio: **Tune A** (122 bpm, E major, groove with soft kick and hats, chord pad, arpeggio and a seeded pentatonic lead; 16 bars) and **Tune B** (63 bpm, B-flat minor, slow pad and sparse lead; 8 bars), alternating forever, with the airport "ding dong dung" chime at each change. Tempo and key were chosen to feel like the removed tracks (estimated from them); the melodies are not copied. Old commits still contain the MP3s in git history.
- **Whack-a-Joel** now has its own page (`whackajoel.html`, `js/whackpage.js`, menu item "Whack-a-Joel") and is still a tab in Entertainment. The game lives in `js/whack.js` (`mountWhack(box)` returns a stop function); shared best-score and peanut helpers moved to `js/gamekit.js`.


## JoelAI v2 and Hangman: Destination Edition

- `js/joelbrain.js` is the pipeline (`converse()`): tidy typos/shorthand, split up to 3 questions, resolve follow-ups ("when does it leave?") from `octee.joelai.state` (sessionStorage), refuse secrets first (checked on the raw text too), then specific detectors (flights, gates, terminals, places, trips) go to the original rulebook in `js/joelai.js`, then the long topics in `js/joelkb.js`, then the rulebook again, then a fuzzy "Did you mean" list. Mood (calm, nervous, proud, sorry, warm) shows near the name and adds an aside every 4th turn.
- `js/joelkb.js` holds ~40 long, personalised topics (`{id, keys, re, sample, reply(ctx)}`), riddles, facts, stories and jokes. Add a topic here and give it a `sample` question so it shows in suggestions. Topics in `PRIORITY` (joelbrain.js) beat the specific detectors.
- It is still a rulebook, not a real AI. Anything with password/code/admin/owner/hack/secret goes straight to `joelai.js`, which refuses.
- Test: import `/js/joelbrain.js` in a page and call `converse()` for each sample question; check answers are non-empty and secrets are refused.
- `js/hangman.js` is the Hangman game (answer always FIA, 6 wrong guesses, win pays a peanut a day via `reward("hangman")`, best streak in `octee.games.best`). It is tab 11 in `js/entertainment.js`.


## Account backup code

- `js/backup.js`: `makeBackup(user)` writes `OCTEE1.<deflate-raw base64url>.<checksum>` (falls back to `OCTEE0` uncompressed if CompressionStream is missing); `restoreBackup(code)` validates, writes the account into `octee.users`, and logs in. History is trimmed to the last 30 entries.
- Account page: "Backup code" card (make, copy, download). Login page: "Backup code" tab (`login.html#restore`).
- The code contains the password hash, so it is as sensitive as a password. It is a snapshot: make a new one after earning more.


## Lost Joel

- `js/lostjoel.js` (tab 12 on Entertainment): five rounds (50, 80, 120, 170, 230 people), 25 s each. Joel is the only spanner emoji; later rounds add look-alike workers. Wrong clicks cost 2 s and say warmer/colder; Hint costs 5 s and shows a ring. 3 found pays a peanut a day (`reward("lostjoel")`).

## JoelAI: playful side (`js/joelfun.js`)

- Remembers a name ("my name is Bo", saved in `octee.joelai.name`; "forget my name" clears it). Generators: excuse, announcement, apology letter, haiku. Games with a pending state in `octee.joelai.state`: knock knock, would you rather, quiz (3 of 7 questions, stored as indices, never regexes, because sessionStorage is JSON). Also coin, dice, random number, "tea or coffee" choices, sums, countdown to your next flight, and small talk.
- `tidy()` only fixes a typo to a known word when the first letter matches (otherwise "night" became "right").

## JoelAI: site guide (`js/joelguide.js`, `js/siteindex.js`)

- `js/siteindex.js` now holds the page list (moved out of `sitesearch.js`; both Octee Search and JoelAI import it). Add new pages there.
- JoelAI can find a page ("take me to the auction"), knows which page it was opened from ("what is this page?", set by `setPage()` in the UI), lists games and pages, says where Joel is right now (by hour), picks a page for "surprise me", and has "tell me more" (`MORE` table keyed by topic id). Greetings follow the time of day.
- Chat window: words appear a few at a time (skipped with reduced motion), and "Save this chat" downloads a .txt.

## JoelAI outside FIA (`js/joelworld.js`, `js/joelweb.js`)

- `joelworld.js` is an offline real-world shelf: capitals (~75 countries), time in ~50 cities (via `Intl`, so it is real), distance and flight time between them (great-circle, 850 km/h + 30 min), airport codes (real cities only; none of the fictional FIA/SIA/LIA/MIA), unit conversions, sums/percentages, days until Christmas/New Year, and ~45 facts about space, nature and flying. Add facts to `FACTS` as `[regex, answer]`.
- `joelweb.js` is the ONLY thing in JoelAI that uses the network: for general questions with no rule (shape "who/what/where/why ..." with no site words, or a bare short topic), it asks the Wikipedia search API (`origin=*`, 6 s timeout) and shows the first 3 sentences with a link, labelled as online. Never sent: anything with my/mine/I am/I have, long digit strings, keyboard mash, and anything the secrets rule refuses (that check runs first). Visitors can say "stop looking things up online" (saved in `octee.joelai.online`). If you want it off for everyone, make `onlineOn()` return false.
- Order in `joelbrain.one()`: secrets > pending games > settings > guide/fun/world > priority topics > specific detectors > general-question lookup > topics > base rulebook > bare-topic lookup > "did you mean".
- Tested with the Wikipedia API mocked (the cloud sandbox cannot reach it). Check one real question after publishing.

## Floating JoelAI button

- `js/joelfab.js` (loaded by `main.js`) adds a round "J" button, bottom right above Turbulence, that opens the JoelAI pop-up on every page except `joelmobile.html` (chat is built in) and `pass.html`. Phones show only the "J". A speech bubble appears once per browser session after 5 s (`octee.fab.tip`). Hidden in print.


## Joel mode, Joel's Tabs, and the sandwich

- `js/joelmode.js` (loaded by `main.js`): a footer switch ("Joel mode") that every 18 to 48 s hides a random visible block inside `main` (cards, headings, paragraphs, lists, tables), puts a dashed "Joel closed this tab. Undo" note in its place, and shows a sorry bubble. Up to 6 stay closed, then all return. A "Joel, stop" pill shows while it is on. State: `octee.joelmode`. It cannot close real browser tabs (browsers forbid it), and it skips modals, the JoelAI box and anything with focus. JoelAI can switch it ("turn on Joel mode").
- `js/joeltabs.js` (tab 13 on Entertainment): pretend browser with 12 tabs. Joel marks one (shake + red), you click it to save it before the warning runs out (1.5 s down to 0.5 s). 30 s. Keep 6 tabs for a peanut. The tab bar is NOT rebuilt on the clock tick (that swallowed clicks).
- Cupboard (`js/cupboard.js`): eating the sandwich once ("you're getting fat"), a second time ("you are obese") makes the page fall (`body.cup-crush`) and shows the `U Crushed the page / ERROR 404` overlay with a "Put the page back" button (reload). The eat counter resets when it crushes. Reduced motion skips the fall.

## Backup code tab and JoelAI Pro (handbook)

- `js/backuptab.js`: a "Backup code" tab on the right edge of every page (loaded from `main.js`). It accepts the long `OCTEE1…` code (`restoreBackup`) or a short personal code of an etched account (`logInWithCode` in `auth.js`).
- Etched accounts in `data/accounts.json` carry `codeSalt` and `codeHash` (PBKDF2-SHA256, 150000 rounds, over the code upper-cased with spaces and dashes removed). Only the hash is public. To add or change a code, hash it the same way and set both fields. Five wrong tries lock the code desk for 5 minutes in that browser (a speed bump, not real security: a short code in a public file can be brute-forced offline, so use long random codes for anything that matters).
- JoelAI Pro unlock costs 100 Octeetokens (`JOEL_PRO_PRICE` in `miles.js`). The default model is **Joel-3.3** (`JOEL_MODEL_DEFAULT` in `js/joel-models.js`), used only where the model server answers; otherwise Handbook Pro (`js/joelpro.js`) answers: the rulebook answer plus a "more on this" paragraph, facts from the real timetable, a random page to explore and follow-up questions. `js/joelwallet.js` probes `GET /api/joelai` (states: ready, file, off, none) and the chat shows "Model unavailable here" with a "Use Handbook JoelAI" button. JoelTokens are counted by Octee Cloud (`/api/joel`, `/api/joel/unlock`, `/api/joel/buy`, `/api/joel/charge`; tables `joel_wallet`, `joel_ledger`); `api/joelai.js` checks the balance first and charges before it hands the answer over, using the shared secret `JOEL_LEDGER_SECRET`. A failed request charges nothing. The cloud also writes the wallet numbers into the saved profile, so a tampered browser copy is overwritten.

## Zhang Gullet Customer Service and the bigger Duty Free

- `customer-service.html` + `js/customer-service.js` + `js/gulletai.js`: GulletAI, a separate chat (own session keys `octee.gullet`). It has its own customer-service rules (refunds, hold, escalation, rating) and passes everything else to the JoelAI handbook (`converse`) in Gullet's voice. Secrets are always refused by the handbook. It is a rulebook, not a real AI.
- `js/dutyfree.js`: 32 items now, each with a `cat` and a `why` (the reason it is banned), a category filter, a search box, and the Security Scan (`SCAN` rules: type any item, the answer is always no, except peanuts).

## Zhang Gullet menu, profile page and Complaints Office

- The nav has its own "Zhang Gullet" menu (`GROUPS` in `main.js`): `zhang-gullet.html` (profile, `js/zhang-gullet.js`), `customer-service.html` (GulletAI) and `gullet-complaints.html` (`js/gullet-complaints.js`). It is no longer under Airport.
- The Complaints Office is separate from the automatic `complaint.html`. Tickets are `ZG-####`, saved in `octee.gullet.complaints` and synced in the Cloud-linked profile (last 20), with a letter signed by Mr Gullet, a status that changes with age, and a Withdraw button. It pays no peanuts, so it cannot be farmed.

## Zhang Gullet, round 3

- `gullet-hold.html` + `js/gullet-hold.js`: the Hold Line. Queue position is always 1, the "music" is a silent beat you can see, and Mr Gullet picks up only on Tuesdays 03:00 to 03:01 local time (`inWindow`, `nextWindow`).
- `js/gullettickets.js`: a ticket list in `octee.gullet.tickets`, synced in the Cloud-linked profile: GulletAI chats `GA-`, complaint letters `ZG-`, hold-line calls `HL-`. The status is worked out from the ticket's age (`statusOf`). The Account page shows them (`ticketCard` in `account.js`).
- `js/gulletai.js`: remembers the name (from "my name is ..." or the logged-in username) and one ticket per chat, asks "Have I resolved your issue?" after the second answer, and has rules for bags, seats, Octmiles, peanuts and Duty Free.
- `js/gulletdocs.js`: print the letter, save it as a .txt, and the Certificate of Having Been Heard. Printing copies the node into a hidden `.gc-print-root` and uses `body.gc-printing` in the print CSS.
- `js/zhang-gullet.js`: Mr Gullet's desk (30 phone answers, 5 moods by hour, a "heard N of 30" counter) and the staff list.
- Signatures: footer line (`main.js`), apology letters (`apology-page.js`), boarding pass (`boardingpass.js`), and "Zhang Gullet says" on the home page (`home.js`).
- Joel mode now has a visible button next to "Ask JoelAI" (`addVisibleButton` in `joelmode.js`), as well as the footer link.
- Fix: `auth.js` now exports `changePassword`. `account.js` imported it but it did not exist, so the Account page failed to load.

## TDA, MFIA and the Octee code

- **Tabletop Domestic Airport (TDA)**: Octee (OA 120 to 123) and One United (OU 11, 12, 15, 16) only. No Scraggy Airlines.
- **Mt Fuji International Airport (MFIA)**: a transit hub for SIA (Scraggy Airlines, SA109/SA110) and One United (OU 13, 14, 17 to 20). The only airline that flies between MFIA and FIA is Octee (OA 124 to 127). `MFIA_NOTE` in `destinations.js` holds the sentence. The trip finder enforces it for free, because no other airline has an MFIA to FIA leg; test: no non-OA leg joins MFIA and FIA on any day.
- Scraggy Airlines to MFIA is added in `scraggy.js` (only when the Scraggy site's own list has no `mfia` route), including `legPoints` and `flightTimes`.
- Octmiles rates for the new legs are in `RATES` (`destinations.js`). Places are in `PLACES`, `OA_PLACES`, the map (`SPOT` and `LAND` in `destinations-page.js`), `oneunited.js` and the cards in `destinations.html`.
- `Octee`'s backup code is now `Oct0205` (hash and salt only in `data/accounts.json`). Publish the file to use it. `Oct001` stops working at the same time.

## JoelAI + GulletAI upgrade
- `js/dutyscan.js`: the Duty Free Security Scan rules, shared by the Duty Free page and JoelAI ("can I take X on board").
- `js/gulletwindow.js`: Mr Gullet's Tuesday 03:00-03:01 window helpers, shared by the Hold Line and GulletAI.
- `js/joelroute.js`: JoelAI answers "how do I get from A to B", "next flight to X" (from the timetable) and "can I take X on board".
- `js/chatextras.js`: Copy / Read aloud / thumbs row under bot replies in both chats. Customer Service also has "Save this ticket" (.txt).
- GulletAI: ticket lookup (GA-/ZG-/HL-), "my tickets", "my flights", anger de-escalation, "when can I speak to Mr Gullet", plus check-in, Wi-Fi, meal, assistance, change-booking and lounge topics.
- JoelAI KB: "what is new on the site".

## FIA Safety section
`fia.html#safety`: two photos (`assets/img/fia-safety-1.jpg`, `fia-safety-2.jpg`) with "normal Thursday" captions; real airline logos on photo 2 (nose and the other plane's tail) are blurred out. JoelAI KB entry `fiasafety` answers "is it safe at FIA".

## Flight-Radar 25 ("better than 24")
`flight-radar.html` + `js/flight-radar.js`: an SVG radar map. Planes are placed from today's timetable (`ALL_FLIGHTS` plus the Scraggy routes) by FIA time; a Time machine slider, Busiest sky and Live buttons; click a plane for details. On Thursdays OA 014 circles FIA with a glow. Linked in the Airport menu, footer, All pages, site search and JoelAI (`flightradar` KB entry). Map positions are made up (`POS` in the JS).

## Backup code moved to the Account page
The floating "Backup code" tab on the right edge is gone (`js/backuptab.js` is now an empty stub, no longer loaded). `js/codeload.js` (`loadCode`, `codeMessage`) accepts the long OCTEE1 code or a short personal code. It is used by the Log in page (Backup code tab, now takes both kinds) and by a new "Load a backup code" form in the Account page's Backup code card.

## Normal Thursday log and TDA / MFIA terminal maps
- `normal-thursday.html` + `js/normal-thursday.js`: the incident log. Entry 1 is OA 014 (Thu 8 Oct 2026). Filters (Peanut faults, Weather, Gate, Yours), stat tiles, and a "File a normal Thursday" form (saved locally under `octee.normalthursday` and synced in the Cloud-linked account profile). Incidents are all text, fictional, no photos.
- `terminal-maps.html` + `js/terminal-maps.js`: SVG maps for TDA (a table with four legs) and MFIA (a mountain with a transit hall, a wall, and an Octee-only corridor to FIA). Gates (A=OA, U=OU, S=SA) and the flight table are built from the timetable, so they follow the data. `terminal-maps.html#mfia` opens the MFIA tab.
- Linked from the Airport menu, footer, All pages, site search, JoelAI (`terminalmaps`, `normalthursday` KB entries), the FIA Safety section and the Flight-Radar OA 014 panel.

## Header: "Use a backup code" when logged out
`renderAccount` in `js/main.js` shows a "Use a backup code" link (to `login.html?next=<page>#restore`) where "Hi, <user>" appears when someone is logged in. After loading a code you are sent back to the page you were on.

## Octee Cloud (cloud accounts)
- `cloud/`: the Cloudflare Worker (`index.js`), its tables (`schema.sql`) and a README. Deployed as `octee-cloud-api` with a D1 database `octee-cloud` on the owner's Cloudflare account. The older `octee-airlines` Worker and `octee-airlines-db` there are untouched.
- `js/cloud.js` (loaded from `main.js`): `cloudLogin`, `cloudCreate`, `cloudLinkCurrent`, `cloudLogout`, `push` (debounced 2 s after any account change) and `pull` (on page load). State is in `octee.cloud` (token, name, updatedAt). The password hash is NOT uploaded: a new device derives its own local hash from the typed password. Last write wins; a 409 conflict loads the newer cloud copy.
- Login page: "Cloud account" tab (log in, or create). Account page: "Cloud account" card (save now, log out of the cloud, or save this account). `auth.js` gained `profileOf`, `installProfile`, `localPasswordOk`, `localExists`, `isEtched`, `sessionKey`.
- Etched accounts cannot be put in the cloud (they already work everywhere). Local accounts, etched accounts and backup codes are unchanged.
- Tested by running the real Worker code against SQLite (`node:sqlite`) and routing the browser to it, because the build sandbox cannot reach `workers.dev`. Check the live Worker once from a normal browser.

## Cache-busting (run before every push)
GitHub Pages lets browsers keep js/css for about 10 minutes, so a fresh page could meet an old script (a new tab that did nothing). `node tools/stamp.mjs` fingerprints every `js/*.js` and `css/styles.css`, rewrites each page's `<script src>` and stylesheet link with `?v=<hash>`, and puts an import map (between `<!--stamp-->` markers) in every page so modules imported by other modules get the same treatment. It is safe to run again (it only changes pages whose files changed). Run it after editing any js or css, then `git add -A`. Browsers without import-map support still work, they just skip the busting for nested modules.


## Fujitech, fares, cargo and flight discounts
- Fujitech is stored as tenths (`fujitechTenths`) on the account profile. Exchange rate: 50 Octmiles for 5.5 Fujitech. Passenger fares apply to OA, OU and SA legs: 0.055 Fujitech per route mile, multiplied by Economy 1×, Business 1.5×, First 2×, Scraggy Class 2.5×; Platinum Wing pays the Economy rate. Discount codes can reduce fares up to 100%.
- `cargo.html` and `js/cargo.js` provide Octee Airline Cargo. Parcel entries, origin/destination and weight determine the quote; shipment costs are charged in Fujitech and saved in `cargoShipments` on the account profile. Route mileage uses shortest paths through airport distances.
- The Control Tower's Flight discounts tab creates hashed codes and downloads `data/flight-discounts.json` for publication. The code can target a destination and cabin, expire, and provide any percentage up to 100%.
- Cloud-linked profiles synchronize complaint desk records, Gullet complaints/tickets, Normal Thursday entries, cargo shipments and Fujitech. Local-only accounts remain browser-local.
- Cloud Control Tower authorization is implemented by `/api/admin/*` in the Worker. Configure `CONTROL_TOWER_OWNER_USERNAME`, apply `cloud/schema.sql` to D1, then deploy the Worker. The owner can list Cloud accounts and assign/remove Cloud admins. The eight-logo-click shortcut is only a doorway; the Worker validates the role.

- JoelAI models (current): `js/joel-models.js` lists Joel-3.0 (regular, default), Joel-2.2 / 2.4 (server models with `maxOut`/`reserve`), Joel-3.3 Pro (handbook, flat 150) and Joel-4.3 NEO (TinyLlama in the browser, flat 400). Flat prices are charged by the cloud at `POST /api/joel/spend` (`FLAT` in `cloud/index.js`) after the answer works; accounts in the published `perks` `freeModels` list (default Octee and Joel) pay nothing, and `freePro` lists accounts whose JoelAI Pro / GulletAI Pro unlock is free. Accounts not in the cloud are charged locally by `chargeJoelFlat` in `js/miles.js`.

- Cloud-owned balances: `balances` table + `applyWallet()`/`getBalances()` in `cloud/index.js` (checked on every `PUT /api/profile`; reply `corrected:true` + `profile` makes `js/cloud.js` take the cloud's copy and show a notice). `profileOf()` in `js/auth.js` now sends the NEWEST 60 history lines (the cloud diffs them to find new changes). Tests: a new account is seeded with the welcome bonus; a saved profile seeds its own balances; etched accounts seed from `accounts.json`.
