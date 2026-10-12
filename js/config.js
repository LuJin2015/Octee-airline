// Octee Airlines site settings.
// The site is 100% static (GitHub Pages): there is NO server and NO database.
// Accounts, Octmiles, trips and reviews are saved in each visitor's own browser (localStorage).
export const CONFIG = {
  // Usernames: 3–20 letters, numbers or underscores
  PASSWORD_MIN: 8,

  // Octee Cloud: accounts that work on any device (a small Cloudflare Worker with a database).
  CLOUD_URL: "https://octee-cloud-api.octee.workers.dev",

  // JoelAI Pro model server (api/joelai.js on Vercel). "" = the same site as this page (works when the site is served by
  // Vercel, or by `vercel dev`). To use the model from GitHub Pages, put the Vercel address here, e.g. "https://octee.vercel.app".
  JOELAI_API_URL: "",

  // GulletAI Smart mode (js/gullet-smart.js): TinyLlama running in the visitor's browser, opt-in. Leave GULLET_LIB empty to use the
  // pinned transformers.js on jsDelivr; the model files come from Hugging Face.
  GULLET_MODEL: "Xenova/TinyLlama-1.1B-Chat-v1.0",
  GULLET_LIB: "",

  // Side clock
  FIA_TIMEZONE: "Asia/Singapore",   // Fuji International Airport
  SIA_TIMEZONE: "Asia/Singapore",   // Scraggy International Airport (same as the Scraggy project)

  // The live Scraggy Airlines site. Octee loads its js/data.js so SA flights always match.
  // If it can't load (offline, or the live site is older), js/scraggy-data-snapshot.js is used.
  SCRAGGY_SITE_URL: "https://zengyixin0205.github.io/Scraggy-airlines/",

  // How many clicks on the logo open the Control Tower, and how fast (ms)
  TOWER_CLICKS: 8,
  TOWER_WINDOW_MS: 4000
};
