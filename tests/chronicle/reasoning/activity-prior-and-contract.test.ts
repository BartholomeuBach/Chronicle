import { describe, expect, it } from "vitest";
import { createElapsedTime } from "../../../src/chronicle/calendar/index.js";
import {
  createActivityPrior,
  type TemporalReasoner,
  type TemporalReasonerInput
} from "../../../src/chronicle/reasoning/index.js";
import { initializeChronicleState } from "../../../src/chronicle/state/index.js";

describe("ActivityPrior", () => {
  it("normalizes its duration but remains optional fallback data", () => {
    const prior = createActivityPrior({
      activity: "  travel on foot  ",
      suggestedElapsedTime: { days: 0, hours: 1, minutes: 90, seconds: 0 }
    });

    expect(prior).toEqual({
      activity: "travel on foot",
      suggestedElapsedTime: { days: 0, hours: 2, minutes: 30, seconds: 0 }
    });
    expect(Object.isFrozen(prior)).toBe(true);
  });

  it("rejects a blank activity", () => {
    expect(() =>
      createActivityPrior({ activity: "  ", suggestedElapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 } })
    ).toThrow("activity must contain non-whitespace text");
  });
});

describe("TemporalReasoner contract", () => {
  it("allows a replaceable implementation to receive context and return only a delta decision", () => {
    const input: TemporalReasonerInput = {
      currentState: initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }),
      playerAction: "I walk to the inn.",
      completedNarrative: "After a short walk, you reach the inn.",
      activityPriors: []
    };
    const reasoner: TemporalReasoner = {
      decide: () => ({
        elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 15, seconds: 0 }),
        mode: "scene-progression",
        rationale: "The completed narrative states a short walk."
      })
    };

    expect(reasoner.decide(input).elapsedTime.minutes).toBe(15);
  });
});
