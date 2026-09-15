import type { ChronicleDateTimeInput } from "../../chronicle/state/chronicle-state.js";
import type { AiDungeonStoryCard } from "./chronicle-story-card.js";

export const CHRONICLE_CONFIGURATION_KEY = "chronicle-configuration";
export const CHRONICLE_CONFIGURATION_NOTES_TEMPLATE = `# Chronicle configuration
# IMPORTANT: do not change initialization fields during an active story.
# Existing Chronicle state intentionally remains unchanged. Start a new adventure
# or use a future explicit reset workflow when you need a new timeline.
Chronicle Enabled: true
Initialization Mode: Automatic
# Manual fields are optional; blank fields use the current New York time.
# Start Year:
# Start Month:
# Start Day:
# Start Hour:
# Start Minute:
# Start Second:
# Set true only to explicitly remove duplicate Chronicle temporal-state cards.
Repair Chronicle Card: false`;
export type ChronicleInitializationMode = "automatic" | "manual";
export interface ChronicleConfiguration { readonly enabled: boolean; readonly mode: ChronicleInitializationMode; readonly initialDateTime?: ChronicleDateTimeInput; readonly repairChronicleCard: boolean; readonly error?: string; }

/** Reads the user-facing setup card. A missing card deliberately means disabled. */
export function readChronicleConfiguration(cards: readonly AiDungeonStoryCard[], currentDateTime?: ChronicleDateTimeInput): ChronicleConfiguration {
  const card = cards.find((candidate) => candidate.keys.split(",").map((key) => key.trim()).includes(CHRONICLE_CONFIGURATION_KEY));
  if (card === undefined) return Object.freeze({ enabled: false, mode: "automatic", repairChronicleCard: false });
  const values = parseLines(card.description ?? "");
  const enabled = (values["chronicle enabled"] ?? "true").toLowerCase() === "true";
  const mode = (values["initialization mode"] ?? "automatic").toLowerCase() === "manual" ? "manual" : "automatic";
  const repairChronicleCard = (values["repair chronicle card"] ?? "false").toLowerCase() === "true";
  const manual = mode === "manual" ? readManualDateTime(values, currentDateTime ?? runtimeDateTime()) : undefined;
  return Object.freeze({ enabled, mode, initialDateTime: manual?.initialDateTime, repairChronicleCard, error: manual?.error });
}

/** Uses the America/New_York civil time only for first-run convenience defaults. */
export function runtimeDateTime(now: Date = new Date()): ChronicleDateTimeInput {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function parseLines(notes: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of notes.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) values[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  return values;
}
function readManualDateTime(values: Record<string, string>, currentDateTime: ChronicleDateTimeInput): Pick<ChronicleConfiguration, "initialDateTime" | "error"> {
  const fields = [
    ["start year", "year"], ["start month", "month"], ["start day", "day"],
    ["start hour", "hour"], ["start minute", "minute"], ["start second", "second"]
  ] as const;
  const input: ChronicleDateTimeInput = { ...currentDateTime };
  for (const [field, component] of fields) {
    const raw = values[field];
    if (raw === undefined || raw === "") continue;
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed)) {
      return Object.freeze({ error: `Manual Chronicle configuration has an invalid ${field} value.` });
    }
    input[component] = parsed;
  }
  return Object.freeze({ initialDateTime: Object.freeze(input) });
}
