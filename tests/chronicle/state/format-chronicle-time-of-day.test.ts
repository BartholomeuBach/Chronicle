import { describe, expect, it } from "vitest";
import { formatChronicleTimeOfDay, initializeChronicleState, renderChronicleTemporalContext } from "../../../src/chronicle/state/index.js";

const dateTimeAt = (hour: number) => initializeChronicleState({ year: 1434, month: 9, day: 18, hour, minute: 15, second: 0 }).currentDateTime;

describe("Chronicle narrator temporal context", () => {
  it.each([
    [0, "late night"], [4, "late night"], [5, "early morning"], [8, "early morning"],
    [9, "morning"], [11, "morning"], [12, "afternoon"], [17, "afternoon"],
    [18, "evening"], [20, "evening"], [21, "night"], [23, "night"]
  ])("derives %s:00 as %s", (hour, expected) => {
    expect(formatChronicleTimeOfDay(dateTimeAt(hour))).toBe(expected);
  });

  it("renders only canonical current time and its derived period", () => {
    expect(renderChronicleTemporalContext(dateTimeAt(6))).toBe(
      "[Chronicle]\nCurrent story time: 1434/09/18 06:15:00.\nTime of day: early morning."
    );
  });
});
