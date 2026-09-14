/**
 * Describes the kind of narrative evidence behind a selected temporal delta.
 * The mode records the decision category; it does not perform inference.
 */
export const TEMPORAL_MODES = [
  "explicit-duration",
  "explicit-transition",
  "scene-progression",
  "summary-or-time-skip",
  "conservative-fallback"
] as const;

export type TemporalMode = (typeof TEMPORAL_MODES)[number];

/** Narrows an unknown runtime value to a supported D0 temporal mode. */
export function isTemporalMode(value: unknown): value is TemporalMode {
  return typeof value === "string" && (TEMPORAL_MODES as readonly string[]).includes(value);
}

/** Validates a runtime temporal mode before it is persisted or rendered. */
export function assertTemporalMode(value: unknown): asserts value is TemporalMode {
  if (!isTemporalMode(value)) {
    throw new RangeError(`Unsupported temporal mode: ${String(value)}.`);
  }
}
