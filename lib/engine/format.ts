import { BANDS, type Bands } from "./constants";

/** en-IN number formatting with the prototype's adaptive precision. */
export function fmt(n: number | null | undefined, dp?: number): string {
  if (n === undefined || n === null || Number.isNaN(n)) return "—";
  if (dp === undefined) dp = Math.abs(n) >= 100 ? 0 : Math.abs(n) >= 10 ? 1 : 2;
  return Number(n).toLocaleString("en-IN", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}

export function bandOf(score: number, bands: Bands): string {
  let nm = "Below the ranked bands";
  for (const b of BANDS) if (score >= bands[b.k]) nm = b.nm;
  return nm;
}
