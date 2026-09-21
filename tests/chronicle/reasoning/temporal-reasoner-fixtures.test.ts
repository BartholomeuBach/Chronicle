import { describe, expect, it } from "vitest";
import { ruleBasedTemporalReasoner } from "../../../src/chronicle/reasoning/index.js";
import { initializeChronicleState } from "../../../src/chronicle/state/index.js";

const decide = (completedNarrative: string) => ruleBasedTemporalReasoner.decide({
  currentState: initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 22, minute: 30, second: 0 }),
  playerAction: undefined,
  completedNarrative,
  activityPriors: []
});

describe("Temporal Reasoner narrative regression corpus", () => {
  const nonCurrentOrFigurativeCases = [
    "A painting depicts a sunset over the town.",
    "A mural shows the party arriving by sunset.",
    "Her portrait catches the morning light.",
    "He reads a 2 hours old letter.",
    "She plans to leave after 2 hours.",
    "If they travel for 3 days, they will reach the coast.",
    "They might reach the town by sunset.",
    "He remembers that after 3 days they reached the coast.",
    "In her dream, morning came after 2 hours.",
    "The guard says, \"At nightfall, the gate will close.\"",
    "The diary reads: \"After 3 days, we arrived.\"",
    "An eternity passed in his eyes.",
    "Time stood still in the silent hall.",
    "A sunset-colored tapestry hangs above the fireplace.",
    "Ele imagina que ao amanhecer tudo estará resolvido.",
    "A carta diz: \"Após 2 horas, a carruagem chegou.\""
  ] as const;

  it.each(nonCurrentOrFigurativeCases)("does not advance for a non-current or figurative frame: %s", (completedNarrative) => {
    expect(decide(completedNarrative)).toMatchObject({
      elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      mode: "conservative-fallback",
      hasTemporalEvidence: false
    });
  });

  const currentNarrativeCases = [
    ["After 2 hours, they reach the town.", { elapsedTime: { hours: 2 }, mode: "explicit-duration" }],
    ["For 15 minutes, they wait beside the road.", { elapsedTime: { minutes: 15 }, mode: "explicit-duration" }],
    ["3 days later, the ship reaches the harbor.", { elapsedTime: { days: 3 }, mode: "explicit-duration" }],
    ["Após 40 minutos, ele alcança a mata.", { elapsedTime: { minutes: 40 }, mode: "explicit-duration" }],
    ["Por 30 minutos, eles caminham em silêncio.", { elapsedTime: { minutes: 30 }, mode: "explicit-duration" }],
    ["At sunrise, the camp awakens.", { elapsedTime: { hours: 7, minutes: 30 }, mode: "explicit-transition" }],
    ["Throughout the night, rain batters the roof.", { elapsedTime: { hours: 8 }, mode: "summary-or-time-skip" }],
    ["Later, the inn door opens.", { elapsedTime: { minutes: 5 }, mode: "conservative-fallback" }],
    ["They walked through the crowded market.", { elapsedTime: { minutes: 1 }, mode: "scene-progression" }],
    ["He ran through branches toward the forest.", { elapsedTime: { minutes: 1 }, mode: "scene-progression" }],
    ["After 0 minutes, he arrives.", { elapsedTime: { minutes: 0 }, mode: "explicit-duration", hasTemporalEvidence: true }]
  ] as const;

  it.each(currentNarrativeCases)("advances for current narrative evidence: %s", (completedNarrative, expected) => {
    expect(decide(completedNarrative)).toMatchObject(expected);
  });

  // The default clock here is 22:30, so these targets are 19h30 and 22h30 away: too far to be the next
  // step of the scene. Both used to advance the clock by that much on a single descriptive phrase.
  it.each(["By sunset, the road finally ends.", "Night fell over the valley."])("does not skip most of a day for a distant named transition: %s", (completedNarrative) => {
    expect(decide(completedNarrative)).toMatchObject({ elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 }, mode: "conservative-fallback", hasTemporalEvidence: false });
  });
});
