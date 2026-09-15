import { formatChronicleDateTime } from "../chronicle/state/format-chronicle-date-time.js";
import { formatChronicleTimeOfDay } from "../chronicle/state/format-chronicle-time-of-day.js";
import type { ChronicleDateTime } from "../chronicle/state/chronicle-state.js";

/** A private state marker used to clear only Chronicle's own transient message. */
export const CHRONICLE_NOTIFICATION_STATE_KEY = "chronicleNotificationMessage";

/**
 * Produces a player-facing, transient notice only when the fictional clock
 * crosses a display period boundary. It is intentionally not narrator context.
 */
export function renderChronicleTimeNotification(previous: ChronicleDateTime, next: ChronicleDateTime): string | undefined {
  const nextPeriod = formatChronicleTimeOfDay(next);
  if (formatChronicleTimeOfDay(previous) === nextPeriod) return undefined;
  const presentation = periodPresentation(nextPeriod);
  return `${presentation.icon} Chronicle — ${presentation.label}\nStory time: ${formatChronicleDateTime(next)}.`;
}

function periodPresentation(period: string): { readonly icon: string; readonly label: string } {
  switch (period) {
    case "late night": return { icon: "🌙", label: "Late night" };
    case "early morning": return { icon: "🌅", label: "Dawn" };
    case "morning": return { icon: "☀️", label: "Morning" };
    case "afternoon": return { icon: "🌤️", label: "Afternoon" };
    case "evening": return { icon: "🌆", label: "Evening" };
    case "night": return { icon: "🌙", label: "Nightfall" };
    default: return { icon: "⌛", label: "Time passes" };
  }
}
