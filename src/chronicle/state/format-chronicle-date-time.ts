import type { ChronicleDateTime } from "./chronicle-state.js";

/** Renders the single D0 user- and narrator-facing datetime format. */
export function formatChronicleDateTime(dateTime: ChronicleDateTime): string {
  return [pad(dateTime.year, 4), pad(dateTime.month), pad(dateTime.day)].join("/") +
    ` ${pad(dateTime.hour)}:${pad(dateTime.minute)}:${pad(dateTime.second)}`;
}

function pad(value: number, width = 2): string {
  return value.toString().padStart(width, "0");
}
