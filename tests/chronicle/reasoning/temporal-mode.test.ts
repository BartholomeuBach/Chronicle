import { describe, expect, it } from "vitest";
import {
  assertTemporalMode,
  isTemporalMode,
  TEMPORAL_MODES,
  type TemporalMode
} from "../../../src/chronicle/reasoning/index.js";

describe("TemporalMode", () => {
  it("defines the complete D0 decision categories", () => {
    const modes: readonly TemporalMode[] = TEMPORAL_MODES;

    expect(modes).toEqual([
      "explicit-duration",
      "explicit-transition",
      "scene-progression",
      "summary-or-time-skip",
      "conservative-fallback"
    ]);
  });

  it("accepts only known temporal modes", () => {
    expect(isTemporalMode("scene-progression")).toBe(true);
    expect(isTemporalMode("activity-prior")).toBe(false);
    expect(isTemporalMode(42)).toBe(false);
  });

  it("rejects unsupported values before persistence", () => {
    expect(() => assertTemporalMode("unknown")).toThrow("Unsupported temporal mode: unknown.");
  });
});
