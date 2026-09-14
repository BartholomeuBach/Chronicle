import type { ChronicleDateTime } from "../state/chronicle-state.js";
import { createElapsedTime, type ElapsedTime } from "./elapsed-time.js";
import { normalizeGregorianDateTime } from "./normalize-gregorian-date-time.js";

/**
 * Returns a new fictional datetime after applying a normalized forward delta.
 * Calendar carry and supported-year validation remain centralized in the
 * Gregorian normalizer.
 */
export function advanceChronicleDateTime(dateTime: ChronicleDateTime, elapsedTime: ElapsedTime): ChronicleDateTime {
  const normalizedElapsedTime = createElapsedTime(elapsedTime);

  return normalizeGregorianDateTime({
    year: dateTime.year,
    month: dateTime.month,
    day: safeAdd(dateTime.day, normalizedElapsedTime.days, "day"),
    hour: safeAdd(dateTime.hour, normalizedElapsedTime.hours, "hour"),
    minute: safeAdd(dateTime.minute, normalizedElapsedTime.minutes, "minute"),
    second: safeAdd(dateTime.second, normalizedElapsedTime.seconds, "second")
  });
}

function safeAdd(left: number, right: number, component: string): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new RangeError(`${component} advance cannot be represented safely.`);
  }
  return result;
}
