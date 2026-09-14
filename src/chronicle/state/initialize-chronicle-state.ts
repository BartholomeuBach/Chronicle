import { normalizeGregorianDateTime } from "../calendar/normalize-gregorian-date-time.js";
import type { ChronicleDateTimeInput, ChronicleState } from "./chronicle-state.js";

/** Creates the first canonical, immutable Chronicle state from supplied components. */
export function initializeChronicleState(input: ChronicleDateTimeInput): ChronicleState {
  return Object.freeze({
    currentDateTime: normalizeGregorianDateTime(input),
    processedBeatIds: Object.freeze([])
  });
}
