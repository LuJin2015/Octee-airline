# Octee Airlines

**FLY SOMEWHERE. EVENTUALLY.** A parody airline website: Octee pretends everything is fine. It isn't.

Plain HTML, CSS and JavaScript, with an optional Cloudflare Worker and D1 database for cloud accounts. The public site is static; account profiles sync to Cloud only when users link a Cloud account. See [`DEVELOPMENT.md`](DEVELOPMENT.md) for the full plan.

## Run it locally

Browsers block JavaScript modules on `file://`, so use a tiny local server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## JoelAI Pro (handbook and model)

- **Handbook JoelAI** works everywhere, including GitHub Pages and a plain local server. Pro handbook answers add the real timetable, gates and terminals.
- **JoelAI models**: Joel-3.0 (regular, free, the default), Joel-3.3 Pro (Pro handbook, 150 JoelTokens an answer), Joel-4.3 NEO (TinyLlama in the browser, 400 JoelTokens an answer) and the server models Joel-2.2 and Joel-2.4 (smaller number = fewer tokens; they need the model server `api/joelai.js`, so the site must run on Vercel). Octee and Joel use 3.3 Pro and 4.3 NEO free (Control Tower, Accounts tab: Account perks).
- **Prices** live in `js/miles.js` and are copied by the cloud (`cloud/index.js`): Pro unlock **100 Octeetokens**, **2,500 JoelTokens per Octeetoken**, **10,000 JoelTokens free each month**. The Octmiles page reads the same numbers.
- **JoelTokens are counted by the cloud**, not the browser. Unlock, top-ups and charges are recorded in the Octee Cloud database (`joel_wallet`, `joel_ledger`), so a balance cannot be edited in the browser and follows a cloud account to every device. Model answers need a cloud account. Octeetokens themselves are still earned and stored in the saved profile (see `cloud/README.md`).
- Vercel settings: `JOELAI_ENABLED=true`, `AI_GATEWAY_API_KEY` (or OIDC), and `JOEL_LEDGER_SECRET` (the same secret as the Worker). Optional: `JOEL_CLOUD_URL`, `JOELAI_ALLOWED_ORIGINS`.

## Deploy on GitHub Pages

1. Push this repo to GitHub (branch `main`).
2. **Settings → Pages → Build and deployment → Source: Deploy from a branch**, choose **main** and **/ (root)**, **Save**.
3. After about a minute the site is live at `https://zengyixin0205.github.io/Octee-airline/`. Every push to `main` redeploys it.

## What is saved where

Local accounts stay in that browser. Cloud-linked accounts sync their profile, including balances, complaints, Normal Thursday entries, cargo shipments and bookings, through the Cloudflare Worker described in `cloud/README.md`.

Things everyone sees live in `data/` and change when you commit:

| File | What |
|---|---|
| `data/codes.json` | Octmiles codes, stored only as hashes |
| `data/flight-discounts.json` | Flight discount codes, stored only as hashes |
| `data/reviews.json` | Published reviews |
| `data/control-tower.json` | Who can sign in to the FAG code administration (password hashes only) |
| `data/accounts.json` | Accounts etched in the code: they can log in on any device (password hashes, balances, trips) |

## FAG code administration (making codes)

1. Click the Octee logo **8 times quickly** on any page. A serious **FAG — Fuji Airport Group** sign-in appears.
2. First time: create the owner account (strong password). It downloads `control-tower.json`. Put it in `data/`, commit, push.
3. Sign in, create Octmiles or flight discount codes, then download the matching JSON file into `data/`, commit and push. Flight discounts support route, cabin, expiry and percent off (including 100% free flights).

A wrong name or password makes the pop-up vanish instantly, with no message. Only people who can push to this repo can actually publish anything. The welcome code `OCTEE500` (500 Octmiles) is included.

## Scraggy Airlines

Transfers use the real Scraggy Airlines flights, loaded from `https://zengyixin0205.github.io/Scraggy-airlines/js/data.js`. If that can't load (or is older), `js/scraggy-data-snapshot.js` is used. Refresh the snapshot when Scraggy's flights change.

## Fujitech and cargo

Octee Airline Cargo has its own page at `cargo.html`. Cargo and passenger fares use Fujitech, with an exchange rate of 50 Octmiles for 5.5 Fujitech. Passenger cabin prices vary by class; Platinum Wing pays the Economy rate. Cargo fares vary by shortest route distance and parcel weight.

## GulletAI Smart mode (optional)

JoelAI Pro also has a "Joel-TinyLlama" choice: the same in-browser model with Joel's voice, free (no JoelTokens), and the handbook answer shown under each reply. It shares one download with GulletAI Smart mode.

Smart mode is GulletAI Pro (a one-time unlock of 100 Octeetokens, free for accounts the Control Tower lists under "Octee: JoelAI Pro and GulletAI Pro free"; the Worker also makes JoelAI Pro free for them). On the Customer Service page, "Turn on Smart mode" downloads TinyLlama-1.1B-Chat (`Xenova/TinyLlama-1.1B-Chat-v1.0`, via transformers.js from jsDelivr and Hugging Face) and runs it inside the visitor's browser. Nothing is sent to a server. The rulebook still handles tickets, refunds and holds; the model only answers open-ended questions, using the handbook's answer as its facts (shown under the smart answer), and any failure falls back to the rulebook. Settings: `GULLET_MODEL` and `GULLET_LIB` in `js/config.js`. Not verified against the real model from the build environment (Hugging Face was not reachable there).
