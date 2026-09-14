import { describe, expect, it } from "vitest";
import {
  advanceChronicleDateTime,
  createElapsedTime,
  type ElapsedTimeInput
} from "../../../src/chronicle/calendar/index.js";
import {
  formatChronicleDateTime,
  initializeChronicleState
} from "../../../src/chronicle/state/index.js";

const elapsed = (overrides: Partial<ElapsedTimeInput> = {}): ElapsedTimeInput => ({
  days: 0,
  hours: 0,
  minutes: 0,
  seconds: 0,
  ...overrides
});

const dateTime = (overrides = {}) =>
  initializeChronicleState({
    year: 2026,
    month: 4,
    day: 13,
    hour: 19,
    minute: 32,
    second: 0,
    ...overrides
  }).currentDateTime;

describe("createElapsedTime", () => {
  it("normalizes duration components into days, hours, minutes, and seconds", () => {
    const duration = createElapsedTime(elapsed({ hours: 25, minutes: 61, seconds: 61 }));

    expect(duration).toEqual({ days: 1, hours: 2, minutes: 2, seconds: 1 });
    expect(Object.isFrozen(duration)).toBe(true);
  });

  it("rejects negative, fractional, and non-finite duration components", () => {
    expect(() => createElapsedTime(elapsed({ seconds: -1 }))).toThrow("seconds must be a non-negative safe integer");
    expect(() => createElapsedTime(elapsed({ minutes: 1.5 }))).toThrow("minutes must be a non-negative safe integer");
    expect(() => createElapsedTime(elapsed({ hours: Number.POSITIVE_INFINITY }))).toThrow(
      "hours must be a non-negative safe integer"
    );
  });
});

describe("advanceChronicleDateTime", () => {
  it("does not mutate the input datetime and returns a new immutable datetime", () => {
    const original = dateTime();
    const result = advanceChronicleDateTime(original, createElapsedTime(elapsed({ minutes: 28 })));

    expect(formatChronicleDateTime(original)).toBe("2026/04/13 19:32:00");
    expect(formatChronicleDateTime(result)).toBe("2026/04/13 20:00:00");
    expect(result).not.toBe(original);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("crosses day, month, and year boundaries", () => {
    const result = advanceChronicleDateTime(
      dateTime({ year: 2026, month: 12, day: 31, hour: 23, minute: 30 }),
      createElapsedTime(elapsed({ hours: 2 }))
    );

    expect(formatChronicleDateTime(result)).toBe("2027/01/01 01:30:00");
  });

  it("uses Gregorian leap-year arithmetic when crossing February", () => {
    const leapYearResult = advanceChronicleDateTime(
      dateTime({ year: 2024, month: 2, day: 28, hour: 23, minute: 0, second: 0 }),
      createElapsedTime(elapsed({ hours: 26 }))
    );
    const commonYearResult = advanceChronicleDateTime(
      dateTime({ year: 2026, month: 2, day: 28, hour: 23, minute: 0, second: 0 }),
      createElapsedTime(elapsed({ hours: 26 }))
    );

    expect(formatChronicleDateTime(leapYearResult)).toBe("2024/03/01 01:00:00");
    expect(formatChronicleDateTime(commonYearResult)).toBe("2026/03/02 01:00:00");
  });

  it("rejects an advance beyond the supported D0 calendar range", () => {
    expect(() =>
      advanceChronicleDateTime(
        dateTime({ year: 9_999, month: 12, day: 31, hour: 23, minute: 59, second: 59 }),
        createElapsedTime(elapsed({ seconds: 1 }))
      )
    ).toThrow("Normalized year must be between 1 and 9999");
  });
});
