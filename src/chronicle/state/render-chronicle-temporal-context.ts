import type { ChronicleDateTime } from "./chronicle-state.js";
import { formatChronicleDateTime } from "./format-chronicle-date-time.js";
import { formatChronicleTimeOfDay } from "./format-chronicle-time-of-day.js";

/** The one compact current-time projection shared by Story Card and Context. */
export function renderChronicleTemporalContext(dateTime: ChronicleDateTime): string {
  return `[Chronicle]\nCurrent story time: ${formatChronicleDateTime(dateTime)}.\nTime of day: ${formatChronicleTimeOfDay(dateTime)}.`;
}
