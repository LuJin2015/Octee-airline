// Fujitech is Octee's pretend booking and cargo currency. Amounts are kept in tenths
// so the 50 Octmiles = 5.5 Fujitech exchange stays exact without float drift.
import { updateUser } from "./auth.js";
import { fujitechUnlimited } from "./perks.js";

export const FUJITECH_MILES_PER_EXCHANGE = 50;
export const FUJITECH_TENTHS_PER_EXCHANGE = 55;
export const fujitechTenthsOf = (u) => Math.max(0, Math.floor(Number(u?.fujitechTenths) || 0));
export const fmtFujitech = (tenths) => {
  tenths = Math.max(0, Math.floor(Number(tenths) || 0));
  return `${(tenths / 10).toLocaleString("en-GB", { minimumFractionDigits: tenths % 10 ? 1 : 0, maximumFractionDigits: 1 })} Fujitech`;
};

export function exchangeOctmilesForFujitech(batches = 1) {
  batches = Math.floor(Number(batches));
  if (!Number.isSafeInteger(batches) || batches < 1) throw new Error("Choose at least 50 Octmiles to exchange.");
  return updateUser((u) => {
    const miles = batches * FUJITECH_MILES_PER_EXCHANGE;
    if ((u.octmiles || 0) < miles) throw new Error(`You need ${miles - (u.octmiles || 0)} more Octmiles.`);
    u.octmiles -= miles;
    const gained = batches * FUJITECH_TENTHS_PER_EXCHANGE;
    u.fujitechTenths = fujitechTenthsOf(u) + gained;
    u.history.unshift({ at: new Date().toISOString(), text: "Exchanged Octmiles for Fujitech", amount: -miles, fujitechTenths: gained });
    return gained;
  });
}

// What is still missing for this price. Always 0 when the Control Tower has switched unlimited Fujitech on for this account.
export const fujitechShortOf = (u, tenths) => (fujitechUnlimited(u) ? 0 : Math.max(0, Math.ceil(Number(tenths) || 0) - fujitechTenthsOf(u)));

export function spendFujitech(u, tenths, text) {
  tenths = Math.max(0, Math.ceil(Number(tenths) || 0));
  if (fujitechUnlimited(u)) {   // unlimited: the earned balance is left exactly as it is
    if (tenths) u.history.unshift({ at: new Date().toISOString(), text: `${text} (unlimited Fujitech: nothing deducted)`, fujitechTenths: 0 });
    return;
  }
  const balance = fujitechTenthsOf(u);
  if (balance < tenths) throw new Error(`You need ${fmtFujitech(tenths - balance)} more. Exchange Octmiles on the Octmiles page.`);
  u.fujitechTenths = balance - tenths;
  if (tenths) u.history.unshift({ at: new Date().toISOString(), text, fujitechTenths: -tenths });
}

const MULTIPLIER = { economy: 100, united: 100, business: 150, semi: 150, first: 200, chaos: 200, scraggy: 250 };
export function passengerFareTenths(routeMiles, classId, platinum = false, passengers = 1) {
  const base = Math.max(0, Number(routeMiles) || 0) * 0.55; // 0.055 Fujitech per route mile
  const multiplier = platinum ? 100 : (MULTIPLIER[classId] || 100);
  return Math.ceil(base * multiplier / 100 * Math.max(1, Number(passengers) || 1));
}


export function cargoFareTenths(routeMiles, weightKg) {
  const miles = Math.max(0, Number(routeMiles) || 0);
  const kg = Math.max(0.1, Number(weightKg) || 0.1);
  return Math.ceil(20 + (miles / 50) * (kg / 10) * 55); // 2.0 handling + route/weight rate, in tenths
}
