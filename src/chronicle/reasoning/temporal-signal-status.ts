/**
 * Traceability for the optional model-signaled evidence tier (D-026): what
 * happened to the narrator's directive for one decision, distinct from the
 * decision's own TemporalMode. "absent" means the completed narrative had
 * no directive at all; the field being unset entirely (not this "absent"
 * value) means the AI-signal tier did not participate in the decision at
 * all — for example it was disabled, or a non-hybrid Reasoner was used.
 */
export const TEMPORAL_SIGNAL_STATUSES = [
  "accepted",
  "absent",
  "rejected-malformed",
  "rejected-contradicted"
] as const;

export type TemporalSignalStatus = (typeof TEMPORAL_SIGNAL_STATUSES)[number];

/** Narrows an unknown runtime value to a supported model-signal status. */
export function isTemporalSignalStatus(value: unknown): value is TemporalSignalStatus {
  return typeof value === "string" && (TEMPORAL_SIGNAL_STATUSES as readonly string[]).includes(value);
}

/** Validates a runtime signal status before it is persisted or rendered. */
export function assertTemporalSignalStatus(value: unknown): asserts value is TemporalSignalStatus {
  if (!isTemporalSignalStatus(value)) {
    throw new RangeError(`Unsupported temporal signal status: ${String(value)}.`);
  }
}
