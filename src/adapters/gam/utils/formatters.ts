/**
 * Format helpers for GAM money amounts and dates.
 */

const MICRO_MULTIPLIER = 1_000_000;
const DEFAULT_TIMEZONE = "America/New_York";

/** Convert a dollar amount to GAM micro-amounts (× 1 000 000). */
export function formatMicroAmount(amount: number): number {
  return Math.round(amount * MICRO_MULTIPLIER);
}

/** Convert GAM micro-amounts back to dollars. */
export function parseMicroAmount(micros: number): number {
  return micros / MICRO_MULTIPLIER;
}

interface GamDateTime {
  date: { year: number; month: number; day: number };
  hour: number;
  minute: number;
  second: number;
  timeZoneId: string;
}

/** Format a JS Date into a GAM DateTime object. */
export function formatGamDate(
  date: Date,
  timeZoneId: string = DEFAULT_TIMEZONE
): GamDateTime {
  return {
    date: {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    },
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    timeZoneId,
  };
}
