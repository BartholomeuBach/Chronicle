import { describe, expect, it } from "vitest";
import {
  formatChronicleDateTime,
  initializeChronicleState,
  type ChronicleDateTimeInput
} from "../../../src/chronicle/state/index.js";

const input = (overrides: Partial<ChronicleDateTimeInput> = {}): ChronicleDateTimeInput => ({
  year: 2026,
  month: 4,
  day: 13,
  hour: 19,
  minute: 32,
  second: 0,
  ...overrides
});

describe("initializeChronicleState", () => {
  it("creates an immutable state and renders the agreed display format", () => {
    const state = initializeChronicleState(input({ second: 7 }));

    expect(state.currentDateTime).toEqual(input({ second: 7 }));
    expect(formatChronicleDateTime(state.currentDateTime)).toBe("2026/04/13 19:32:07");
    expect(Object.isFrozen(state)).toBe(true);
    expect(Object.isFrozen(state.currentDateTime)).toBe(true);
  });

  it("accepts a valid leap day", () => {
    const state = initializeChronicleState(input({ year: 2024, month: 2, day: 29 }));

    expect(formatChronicleDateTime(state.currentDateTime)).toBe("2024/02/29 19:32:00");
  });

  it("carries invalid Gregorian days into the following month", () => {
    const state = initializeChronicleState(input({ year: 2026, month: 2, day: 30, hour: 0, minute: 0 }));

    expect(formatChronicleDateTime(state.currentDateTime)).toBe("2026/03/02 00:00:00");
  });

  it("carries month and time overflow across calendar boundaries", () => {
    const state = initializeChronicleState(input({ year: 2026, month: 13, day: 1, hour: 25, minute: 0 }));

    expect(formatChronicleDateTime(state.currentDateTime)).toBe("2027/01/02 01:00:00");
  });

  it("carries negative seconds into the previous day", () => {
    const state = initializeChronicleState(input({ year: 2026, month: 1, day: 1, hour: 0, minute: 0, second: -1 }));

    expect(formatChronicleDateTime(state.currentDateTime)).toBe("2025/12/31 23:59:59");
  });

  it("rejects non-integer components", () => {
    expect(() => initializeChronicleState(input({ day: Number.NaN }))).toThrow("day must be a finite safe integer");
    expect(() => initializeChronicleState(input({ hour: 1.5 }))).toThrow("hour must be a finite safe integer");
    expect(() => initializeChronicleState(input({ minute: Number.POSITIVE_INFINITY }))).toThrow(
      "minute must be a finite safe integer"
    );
  });

  it("rejects normalized dates outside the D0 year range", () => {
    expect(() => initializeChronicleState(input({ year: 9_999, month: 13, day: 1 }))).toThrow(
      "Normalized year must be between 1 and 9999"
    );
    expect(() => initializeChronicleState(input({ year: 1, month: 0, day: 1 }))).toThrow(
      "Normalized year must be between 1 and 9999"
    );
  });
});
