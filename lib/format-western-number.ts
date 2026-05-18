/** أرقام غربية (0–9) مع فواصل آلاف: 3,000,000 */
export function formatWesternGroupedInteger(n: number, grouping = true): string {
  const v = Math.max(0, Number.isFinite(n) ? n : 0);
  const whole = Math.floor(v);
  return whole.toLocaleString("en-US", { useGrouping: grouping });
}

/** مبلغ عشري بالدولار: 1,234.56 */
export function formatWesternUsdAmount(n: number): string {
  const v = Math.max(0, Number.isFinite(n) ? n : 0);
  return v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
