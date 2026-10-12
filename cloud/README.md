# Octee Cloud (the Worker behind "Cloud account")

A small Cloudflare Worker + D1 database. It stores a login and ONE saved JSON profile per user.

- Live at `https://octee-cloud-api.octee.workers.dev` (set as `CLOUD_URL` in `js/config.js`).
- API: `POST /api/register`, `POST /api/login`, `POST /api/claim` (etched accounts join the cloud), `GET|PUT /api/profile` (Bearer token), `POST /api/logout`, `GET /api/me`, `GET /api/reviews` (public), `PUT|DELETE /api/review` (one review per user).
- `index.js` is the Worker, `schema.sql` creates the tables (`users`, `sessions`, `profiles`, `attempts`, `reviews`).
- CORS only allows https://zengyixin0205.github.io (and localhost:8765 for testing). Change `ORIGINS` in `index.js` to add another site.
- Passwords: PBKDF2-SHA256 (100,000 rounds). Session tokens are stored hashed. 5 wrong logins locks that name+IP for 5 minutes; at most 5 new accounts per IP, then a 5 minute wait.
- PUT /api/profile: `{ profile, baseUpdatedAt }`. If someone else saved first the answer is 409 with the newer copy (the site then loads it).
- To redeploy with wrangler: create the D1 database, put its id in `wrangler.toml`, run `wrangler d1 execute octee-cloud --file schema.sql --remote`, then `wrangler deploy`.
- The profile is trusted from the browser, as everywhere else on Octee. Do not reuse real passwords.

## JoelAI Pro ledger

- `GET /api/joel` (wallet and last 20 ledger rows), `POST /api/joel/unlock`, `POST /api/joel/buy {count}` (Bearer token), `POST /api/joel/charge` (only the model server: needs the `x-ledger-secret` header equal to the Worker secret `JOEL_LEDGER_SECRET`).
- Tables `joel_wallet` (Pro flag, bought JoelTokens, this month's use) and `joel_ledger` (every unlock, top-up and charge).
- Unlock and top-ups take Octeetokens from the saved profile with a compare-and-set on `updated_at`, so two devices cannot spend the same Octeetokens twice. Honest limit: Octeetokens are earned by the browser (miles, codes), so someone who edits their own profile can still give themselves Octeetokens. JoelTokens and Pro cannot be edited this way: the server overwrites those fields in the profile on every save and read.
- Set the secret with `wrangler secret put JOEL_LEDGER_SECRET` (or as a Worker secret binding) and use the same value as `JOEL_LEDGER_SECRET` on Vercel.


## Control Tower and cloud profile records

- Complaints (both desks), Gullet tickets, Normal Thursday entries and cargo shipments are included in cloud-linked account profiles and therefore sync on the existing profile save/pull cycle. Local-only accounts continue to save in the browser.
- Cloud-backed Control Tower access requires a valid Cloud session and a Worker role. Set the non-secret Worker variable `CONTROL_TOWER_OWNER_USERNAME` to the existing Cloud account that owns administration. Add `cloud_admins` using the updated `schema.sql`, for example by rerunning `wrangler d1 execute octee-cloud --file schema.sql --remote`, then deploy the updated Worker.
- After that owner signs into Octee Cloud, the Control Tower's Cloud accounts tab can list accounts and grant/revoke admin roles. The Worker checks the role for every `/api/admin/*` request; the hidden logo gesture only opens the interface. Admins need a Cloud account and must be granted a role by the owner.
- Flight discount codes are created in the static Control Tower and downloaded as `data/flight-discounts.json`; commit/push that file to publish. The file contains hashes, not the redeemable plain codes. Each code may specify percent off, destination, cabin and expiry.
- Passenger fare rules in this prototype: base 0.055 Fujitech per route mile, multiplied by cabin (Economy 1×, Business 1.5×, First 2×, Scraggy Class 2.5×); Platinum Wing uses 1×. Cargo uses 2.0 Fujitech handling plus 5.5 Fujitech per 50 route-miles per 10 kg. Exchange batches are 50 Octmiles → 5.5 Fujitech.
- The browser-side profile remains the source of balances; this Worker admin feature secures role checks, but fare balances are not server-ledgered. Do not treat Fujitech as real money.

## Control Tower saves to the cloud

- Table `published` holds the files the Control Tower used to download: `codes`, `accounts`, `permissions`, `control-tower` (the crew) and `flight-discounts`. `GET /api/data/<name>` is public; `PUT` needs a cloud login that is the Control Tower owner or an admin (the same role check as `/api/admin/*`).
- The site reads the cloud copy first and falls back to the file in `data/` (`js/published.js`), and the Worker's etched-account list does the same. Every Tower panel keeps a "Manual download" button for when the cloud has a problem.
- Run the new `published` table from `schema.sql`, then redeploy the Worker.
