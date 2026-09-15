import type { ChronicleDateTime } from "./chronicle-state.js";

/**
 * Derives a narrator-friendly period from canonical fictional clock time.
 * This is a display projection, not separately persisted Chronicle state.
 */
export function formatChronicleTimeOfDay(dateTime: ChronicleDateTime): string {
  if (dateTime.hour < 5) return "late night";
  if (dateTime.hour < 9) return "early morning";
  if (dateTime.hour < 12) return "morning";
  if (dateTime.hour < 18) return "afternoon";
  if (dateTime.hour < 21) return "evening";
  return "night";
}
