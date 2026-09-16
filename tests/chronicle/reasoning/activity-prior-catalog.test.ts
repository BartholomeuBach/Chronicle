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

  it("was expanded 2026-09-16 to roughly 200 common, narratively useful entries, organized by category", () => {
    // Close to (up to) 200 by design, per the project owner's explicit scoped
    // request -- not an exact target, but this pins the order of magnitude so
    // a future accidental mass-deletion or duplication is caught.
    expect(ACTIVITY_PRIOR_CATALOG.length).toBeGreaterThanOrEqual(180);
    expect(ACTIVITY_PRIOR_CATALOG.length).toBeLessThanOrEqual(220);

    const categories = new Set(ACTIVITY_PRIOR_CATALOG.map((entry) => entry.category));
    expect(categories.size).toBeGreaterThanOrEqual(15);
  });

  it("never lists the same activity phrase twice", () => {
    const names = ACTIVITY_PRIOR_CATALOG.map((entry) => entry.activity);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps genuinely variable-duration activities (hunting, fishing) out of the default baseline, same as the original set", () => {
    expect(DEFAULT_ACTIVITY_PRIORS.some((prior) => prior.activity === "hunt")).toBe(false);
    expect(DEFAULT_ACTIVITY_PRIORS.some((prior) => prior.activity === "fish")).toBe(false);
    expect(ACTIVITY_PRIOR_CATALOG.some((entry) => entry.activity === "hunt" && entry.requiresContext === true)).toBe(true);
    expect(ACTIVITY_PRIOR_CATALOG.some((entry) => entry.activity === "fish" && entry.requiresContext === true)).toBe(true);
  });

  it("still lets explicit narrative evidence override a newly added prior, same hierarchy as the original set", () => {
    const input = { currentState: initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 12, minute: 0, second: 0 }), playerAction: "I haggle with the merchant.", completedNarrative: "She haggles with the merchant.", activityPriors: DEFAULT_ACTIVITY_PRIORS };
    expect(ruleBasedTemporalReasoner.decide(input)).toMatchObject({ elapsedTime: { minutes: 5 }, mode: "scene-progression" });
    expect(ruleBasedTemporalReasoner.decide({ ...input, completedNarrative: "After 2 hours, she finally finishes haggling with the merchant." })).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
  });
});
