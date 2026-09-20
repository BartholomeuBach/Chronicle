import type { TemporalSignalStatus } from "../chronicle/reasoning/temporal-signal-status.js";

/** Private runtime key whose compact projection makes signal delivery auditable in Story Card Notes. */
export const CHRONICLE_SIGNAL_DIAGNOSTIC_STATE_KEY = "chronicleSignalDiagnostic";

export type ChronicleSignalProtocolStatus = "appended" | "already-present" | "omitted-context-limit" | "not-observed";

/**
 * Operational evidence only. It deliberately contains neither the hidden
 * instruction text nor the narrator's prose, both of which already belong to
 * their respective AI Dungeon surfaces.
 */
export interface ChronicleSignalDiagnostic {
  readonly protocolStatus: ChronicleSignalProtocolStatus;
  readonly reminderIncluded: boolean;
  readonly outputSignalStatus?: TemporalSignalStatus;
}

export function isChronicleSignalDiagnostic(value: unknown): value is ChronicleSignalDiagnostic {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<ChronicleSignalDiagnostic>;
  return isProtocolStatus(candidate.protocolStatus) && typeof candidate.reminderIncluded === "boolean" &&
    (candidate.outputSignalStatus === undefined || isSignalStatus(candidate.outputSignalStatus));
}

function isProtocolStatus(value: unknown): value is ChronicleSignalProtocolStatus {
  return value === "appended" || value === "already-present" || value === "omitted-context-limit" || value === "not-observed";
}

function isSignalStatus(value: unknown): value is TemporalSignalStatus {
  return value === "accepted" || value === "absent" || value === "rejected-malformed" || value === "rejected-contradicted";
}
