import { describe, expect, it } from "vitest";
import {
  createPlayerActionCorroboratedReasoner,
  ruleBasedTemporalReasoner,
  DEFAULT_ACTIVITY_PRIORS
} from "../../../src/chronicle/reasoning/index.js";
import { initializeChronicleState } from "../../../src/chronicle/state/index.js";

const currentState = initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 });
const reasoner = createPlayerActionCorroboratedReasoner(ruleBasedTemporalReasoner);

const decide = (completedNarrative: string, playerAction: string | undefined) =>
  reasoner.decide({ currentState, playerAction, completedNarrative, activityPriors: DEFAULT_ACTIVITY_PRIORS });

describe("Player action corroboration (D-026 follow-up, Opção A)", () => {
  it("boosts confidence to medium when the player's action and the narrative name the same activity", () => {
    const result = decide("You talk to the merchant for a while.", "I go talk to the merchant.");
    expect(result).toMatchObject({ mode: "scene-progression", confidence: "medium" });
    expect(result.rationale).toContain("player action names the same activity");
  });

  it("never changes elapsedTime or mode, only confidence and rationale", () => {
    const uncorroborated = decide("You search the room carefully.", undefined);
    const corroborated = decide("You search the room carefully.", "I search the room.");
    expect(corroborated.elapsedTime).toEqual(uncorroborated.elapsedTime);
    expect(corroborated.mode).toBe(uncorroborated.mode);
  });

  it("does not boost when the narrative never confirms the player's stated intent (no crediting a mere start)", () => {
    // Player wants to rest; the narrative only shows a continuing scene with no
    // matching catalog activity at all in this text — stays at the reasoner's
    // own low-confidence scene-progression fallback, unboosted.
    const result = decide("He ran through branches toward the forest.", "I decide to rest.");
    expect(result).toMatchObject({ mode: "scene-progression", confidence: "low" });
  });

  it("does not boost when the player's activity and the narrative's activity are two different ones", () => {
    // Player asks to rest; the narrative independently shows a different
    // catalog activity (search) instead — no single activity agrees on both
    // sides, so this must not be treated as corroboration.
    const result = decide("You search the shelves for supplies.", "I decide to rest.");
    expect(result).toMatchObject({ mode: "scene-progression", confidence: "low" });
  });

  it("degrades safely with no fresh player action, e.g. a Continue turn", () => {
    const withoutAction = decide("You talk to the merchant for a while.", undefined);
    expect(withoutAction).toMatchObject({ mode: "scene-progression", confidence: "low" });
  });

  it("degrades safely with a blank player action", () => {
    const result = decide("You talk to the merchant for a while.", "   ");
    expect(result).toMatchObject({ mode: "scene-progression", confidence: "low" });
  });

  it("leaves non scene-progression decisions completely untouched", () => {
    const explicit = decide("After 2 hours, they reach the town.", "I go talk to the merchant.");
    expect(explicit).toMatchObject({ mode: "explicit-duration", confidence: "high" });
    const fallback = decide("A painting depicts a sunset over the town.", "I go talk to the merchant.");
    expect(fallback).toMatchObject({ mode: "conservative-fallback", confidence: "low" });
  });
});
