import type { ChronicleDateTimeInput } from "../../chronicle/state/chronicle-state.js";
import type { AiDungeonStoryCard } from "./chronicle-story-card.js";

export const CHRONICLE_CONFIGURATION_KEY = "chronicle-configuration";
export type ChronicleInitializationMode = "automatic" | "manual";
export interface ChronicleConfiguration { readonly enabled: boolean; readonly mode: ChronicleInitializationMode; readonly initialDateTime?: ChronicleDateTimeInput; }

/** Reads the user-facing setup card. A missing card deliberately means disabled. */
export function readChronicleConfiguration(cards: readonly AiDungeonStoryCard[]): ChronicleConfiguration {
  const card = cards.find((candidate) => candidate.keys.split(",").map((key) => key.trim()).includes(CHRONICLE_CONFIGURATION_KEY));
  if (card === undefined) return Object.freeze({ enabled: false, mode: "automatic" });
  const values = parseLines(card.description ?? "");
  const enabled = (values["chronicle enabled"] ?? "true").toLowerCase() === "true";
  const mode = (values["initialization mode"] ?? "automatic").toLowerCase() === "manual" ? "manual" : "automatic";
  const initialDateTime = mode === "manual" ? readManualDateTime(values) : undefined;
  return Object.freeze({ enabled, mode, initialDateTime });
}

export function runtimeDateTime(now: Date = new Date()): ChronicleDateTimeInput {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate(), hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() };
}

function parseLines(notes: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of notes.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) values[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  return values;
}
function readManualDateTime(values: Record<string, string>): ChronicleDateTimeInput | undefined {
  const names = ["start year", "start month", "start day"] as const;
  if (names.some((name) => values[name] === undefined)) return undefined;
  const number = (name: string, fallback = 0) => values[name] === undefined ? fallback : Number(values[name]);
  const input = { year: number("start year"), month: number("start month"), day: number("start day"), hour: number("start hour"), minute: number("start minute"), second: number("start second") };
  return Object.values(input).every(Number.isSafeInteger) ? input : undefined;
}
