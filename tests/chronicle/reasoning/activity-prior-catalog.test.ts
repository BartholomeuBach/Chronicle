import { describe, expect, it } from "vitest";
import { ACTIVITY_PRIOR_CATALOG, DEFAULT_ACTIVITY_PRIORS, ruleBasedTemporalReasoner } from "../../../src/chronicle/reasoning/index.js";
import { initializeChronicleState } from "../../../src/chronicle/state/index.js";

describe("default activity-prior catalog", () => {
  it("provides a broad English baseline while excluding context-required actions", () => {
    expect(ACTIVITY_PRIOR_CATALOG.length).toBeGreaterThanOrEqual(50);
    expect(DEFAULT_ACTIVITY_PRIORS.some((prior) => prior.activity === "walk")).toBe(true);
    expect(DEFAULT_ACTIVITY_PRIORS.some((prior) => prior.activity === "sleep")).toBe(false);
  });

  it("uses an active prior only after stronger narrative evidence is absent", () => {
    const input = { currentState: initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 12, minute: 0, second: 0 }), playerAction: "I clean the room.", completedNarrative: "She cleans the room.", activityPriors: DEFAULT_ACTIVITY_PRIORS };
    expect(ruleBasedTemporalReasoner.decide(input)).toMatchObject({ elapsedTime: { minutes: 10 }, mode: "scene-progression" });
    expect(ruleBasedTemporalReasoner.decide({ ...input, completedNarrative: "After 30 minutes, she cleans the room." })).toMatchObject({ elapsedTime: { minutes: 30 }, mode: "explicit-duration" });
  });

  it("does not use a prior when only the player intended the activity", () => {
    const input = { currentState: initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 12, minute: 0, second: 0 }), playerAction: "I clean the room.", completedNarrative: "A guard stops her before she begins.", activityPriors: DEFAULT_ACTIVITY_PRIORS };
    expect(ruleBasedTemporalReasoner.decide(input)).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });
});
