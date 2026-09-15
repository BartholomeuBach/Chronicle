import { describe, expect, it } from "vitest";
import { createActivityPrior, ruleBasedTemporalReasoner, type ActivityPrior } from "../../../src/chronicle/reasoning/index.js";
import { initializeChronicleState } from "../../../src/chronicle/state/index.js";

const decide = (narrative: string, action?: string, priors: readonly ActivityPrior[] = []) => ruleBasedTemporalReasoner.decide({ currentState: initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 22, minute: 30, second: 0 }), playerAction: action, completedNarrative: narrative, activityPriors: priors });

describe("ruleBasedTemporalReasoner", () => {
  it("gives explicit durations highest priority", () => {
    expect(decide("Depois de 2 horas, ele chega.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration", confidence: "high" });
  });
  it("recognizes a completed sleep-to-morning transition", () => {
    expect(decide("Ele dormiu e despertou com os raios de sol.", "Vou dormir agora")).toMatchObject({ elapsedTime: { hours: 7, minutes: 30 }, mode: "explicit-transition" });
  });
  it("does not double-count player intent and uses prior only without stronger evidence", () => {
    const prior = createActivityPrior({ activity: "correr", suggestedElapsedTime: { days: 0, hours: 0, minutes: 10, seconds: 0 } });
    expect(decide("Ele corre em direção à mata atravessando galhos.", "Eu saí correndo.", [prior])).toMatchObject({ elapsedTime: { minutes: 1 }, mode: "scene-progression" });
    expect(decide("Após 40 minutos, ele alcança a mata.", "Eu saí correndo.", [prior])).toMatchObject({ elapsedTime: { minutes: 40 }, mode: "explicit-duration" });
  });
  it("handles vague and unmapped narrative conservatively", () => {
    expect(decide("Mais tarde, a porta abre.")).toMatchObject({ elapsedTime: { minutes: 5 }, confidence: "low" });
    expect(decide("Ele pensa em seu passado.")).toMatchObject({ elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 }, mode: "conservative-fallback" });
  });

  it("handles named day transitions and does not treat intention as completion", () => {
    expect(decide("By sunset, the road finally ends.")).toMatchObject({ elapsedTime: { hours: 19, minutes: 30 }, mode: "explicit-transition" });
    expect(decide("He lies down, but cannot sleep.", "I am going to sleep now")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });

  it("does not invent a full duration for ambiguous travel or combat", () => {
    expect(decide("They begin their journey through the mountains.", "I travel north")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("The battle rages on.", "I attack")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });
});
