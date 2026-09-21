import { describe, expect, it } from "vitest";
import { createActivityPrior, ruleBasedTemporalReasoner, type ActivityPrior } from "../../../src/chronicle/reasoning/index.js";
import { initializeChronicleState } from "../../../src/chronicle/state/index.js";

const decide = (narrative: string, action?: string, priors: readonly ActivityPrior[] = []) => ruleBasedTemporalReasoner.decide({ currentState: initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 22, minute: 30, second: 0 }), playerAction: action, completedNarrative: narrative, activityPriors: priors });

const decideAt = (hour: number, minute: number, narrative: string) => ruleBasedTemporalReasoner.decide({ currentState: initializeChronicleState({ year: 2026, month: 4, day: 13, hour, minute, second: 0 }), playerAction: undefined, completedNarrative: narrative, activityPriors: [] });
const NO_TIME = { elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 }, hasTemporalEvidence: false };

describe("ruleBasedTemporalReasoner", () => {
  describe("named time-of-day transitions are capped at 12h", () => {
    // Evidence (2026-09-20, run against the built scripts): the same phrases used descriptively moved the
    // clock by up to a day. The genuine case (waking after a night's sleep) is well inside the cap.
    it.each([
      [23, 0, "You woke up, stiff and cold.", { hours: 7 }],
      [21, 30, "You woke up to grey light at the window.", { hours: 8, minutes: 30 }],
      [8, 0, "By noon, the market is full.", { hours: 4 }],
      [15, 0, "At sunset, the ferry leaves.", { hours: 3 }],
      [18, 0, "You woke up.", { hours: 12 }]
    ])("credits a plausible next step at %i:%i: %s", (hour, minute, narrative, elapsed) => {
      expect(decideAt(hour, minute, narrative)).toMatchObject({ elapsedTime: elapsed, mode: "explicit-transition" });
    });

    it.each([
      [14, 0, "You woke up with a start, heart pounding."],
      [7, 0, "Morning came softly over the hills."],
      [21, 30, "Night fell over the harbor as the guards changed shifts."],
      [14, 0, "The note read: meet me at noon by the fountain."],
      [17, 59, "You woke up."]
    ])("does not skip toward the next day at %i:%i: %s", (hour, minute, narrative) => {
      expect(decideAt(hour, minute, narrative)).toMatchObject({ ...NO_TIME, mode: "conservative-fallback" });
    });
  });

  it("gives explicit durations highest priority", () => {
    expect(decide("Depois de 2 horas, ele chega.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration", confidence: "high" });
    expect(decide("After 0 minutes, he arrives.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "explicit-duration", hasTemporalEvidence: true });
  });
  it("recognizes English number words and precise natural-language durations", () => {
    expect(decide("For exactly twenty minutes, you watch the creature.")).toMatchObject({ elapsedTime: { minutes: 20 }, mode: "explicit-duration" });
    expect(decide("Twenty minutes later, the store falls silent.")).toMatchObject({ elapsedTime: { minutes: 20 }, mode: "explicit-duration" });
    expect(decide("After half an hour, the rain stops.")).toMatchObject({ elapsedTime: { minutes: 30 }, mode: "explicit-duration" });
    expect(decide("Forty-five minutes later, the train arrives.")).toMatchObject({ elapsedTime: { minutes: 45 }, mode: "explicit-duration" });
  });
  it("recognizes a completed sleep-to-morning transition", () => {
    expect(decide("Ele dormiu e despertou com os raios de sol.", "Vou dormir agora")).toMatchObject({ elapsedTime: { hours: 7, minutes: 30 }, mode: "explicit-transition" });
  });

  it("resolves a named transition to zero, not a 24h wraparound, when already exactly at the target hour", () => {
    // Regression (confirmed 2026-09-15): "now < target" fell into the "next
    // day" branch when now === target, wrongly advancing a full 24h instead
    // of staying put.
    const decision = ruleBasedTemporalReasoner.decide({
      currentState: initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 6, minute: 0, second: 0 }),
      playerAction: undefined,
      completedNarrative: "You woke up.",
      activityPriors: []
    });
    expect(decision).toMatchObject({ elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 }, mode: "explicit-transition" });
  });
  it("does not double-count player intent and uses prior only without stronger evidence", () => {
    const prior = createActivityPrior({ activity: "correr", suggestedElapsedTime: { days: 0, hours: 0, minutes: 10, seconds: 0 } });
    expect(decide("Ele corre em direção à mata atravessando galhos.", "Eu saí correndo.", [prior])).toMatchObject({ elapsedTime: { minutes: 1 }, mode: "scene-progression" });
    expect(decide("Após 40 minutos, ele alcança a mata.", "Eu saí correndo.", [prior])).toMatchObject({ elapsedTime: { minutes: 40 }, mode: "explicit-duration" });
  });
  it("handles vague and unmapped narrative conservatively", () => {
    expect(decide("Mais tarde, a porta abre.")).toMatchObject({ elapsedTime: { minutes: 5 }, confidence: "low" });
    expect(decide("Ele pensa em seu passado.")).toMatchObject({ elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 }, mode: "conservative-fallback", hasTemporalEvidence: false });
  });

  it("handles named day transitions and does not treat intention as completion", () => {
    expect(decide("By sunset, the road finally ends.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" }); // 19h30 away from 22:30: too far to credit
    expect(decideAt(15, 0, "By sunset, the road finally ends.")).toMatchObject({ elapsedTime: { hours: 3 }, mode: "explicit-transition" });
    expect(decide("He lies down, but cannot sleep.", "I am going to sleep now")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });

  it("does not treat descriptive mentions as a passage of narrative time", () => {
    expect(decide("A painting depicts a sunset over the town.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("He reads a 2 hours old letter.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });

  it("does not advance time for a clock or screen observation merely because an activity prior matches", () => {
    const prior = createActivityPrior({ activity: "read", suggestedElapsedTime: { days: 0, hours: 0, minutes: 15, seconds: 0 } });
    expect(decide("You glance at the clock in the corner of your laptop screen and read the current time.", undefined, [prior])).toMatchObject({
      elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      mode: "conservative-fallback"
    });
  });

  it("does not invent a full duration for ambiguous travel or combat", () => {
    expect(decide("They begin their journey through the mountains.", "I travel north")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("The battle rages on.", "I attack")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });

  it("does not let common 'will'/'hopes' phrasing block genuine current-scene evidence", () => {
    // Before the fix, bare "will"/"hopes" tripped the non-current-frame guard on
    // ordinary declarative narration, discarding real evidence right next to them.
    expect(decide("After 2 hours, the door will finally give way.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
    expect(decide("She hopes to find shelter, and after 2 hours she does.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
  });

  it("does not let bare 'would'/'could' (current-scene ability, risk, or estimate) block genuine current-scene evidence", () => {
    // Before the fix, bare "would"/"could" false-positived on ~100% of a
    // sampled set of ordinary current-scene sentences (verified 2026-09-15).
    expect(decide("After 2 hours, you could see the village from up here.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
    expect(decide("After 2 hours, it would take hours to cross this ravine.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
    expect(decide("After 2 hours, you would have to fight through the guards.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
  });

  it("no longer blocks evidence next to Portuguese 'poderia'/'seria' (removed outright: the target narrative is fully English)", () => {
    expect(decide("Depois de 2 horas, ele poderia finalmente descansar.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
    expect(decide("Depois de 2 horas, seria hora de partir.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
  });

  it("still blocks a genuine counterfactual 'would/could have' hypothetical", () => {
    expect(decide("If they had left earlier, they would have escaped.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("He wonders if the treasure could have survived the fire.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("Anyone else would have died from that fall.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });

  it("does not let a pluperfect flashback slip through unguarded and have its own temporal language wrongly credited", () => {
    // Before this trigger existed, a flashback without "remembers"/quotes/etc.
    // could have its own duration/transition language wrongly credited.
    expect(decide("She had spent two hours there once, haggling over spices.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("They had already left by the time the guards arrived.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("He had just arrived when the news broke, weeks earlier.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });

  it("does not let the pluperfect trigger false-positive on an -ed adjective describing current possession", () => {
    // "had a pointed sword" / "had a wounded arm" are current-scene
    // descriptions (article + adjective), not a flashback (had + participle).
    expect(decide("After 2 hours, he had a pointed sword strapped to his belt.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
    expect(decide("After 2 hours, she had a wounded arm from the earlier fight.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
    expect(decide("After 2 hours, the beast had a scaled hide and glowing eyes.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
  });

  it("catches a hedged dissociative transition into a present-tense flashback (regression, 2026-09-16)", () => {
    // Confirmed by reproduction: a flashback narrated entirely in present
    // tense for vividness ("You're twelve again...") uses none of the other
    // guard words at all and was previously invisible to every trigger.
    expect(decide(
      "For a moment, the room seems to disappear. You're twelve again, standing barefoot beside the river while your brother throws stones across the water."
    )).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });

  it("does not let the dissociative-transition trigger false-positive on a literal current-scene event using the same verbs", () => {
    expect(decide("After 2 hours, the room disappears into shadow as the torch goes out.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
    expect(decide("After 2 hours, the trail fades into the dense forest ahead.")).toMatchObject({ elapsedTime: { hours: 2 }, mode: "explicit-duration" });
  });

  it("does not match the continuing-motion fallback on a substring inside an unrelated word", () => {
    // "esbarrando" contains "ran" as a bare substring; without a word boundary
    // this previously false-positived into the continuing-motion fallback.
    expect(decide("Player então corre pela floresta esbarrando em galhos e troncos de árvores.")).toMatchObject({
      elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      mode: "conservative-fallback"
    });
    expect(decide("He ran through the branches.")).toMatchObject({ elapsedTime: { minutes: 1 }, mode: "scene-progression" });
  });

  it("rejects an explicit duration inside unquoted reported speech (regression, 2026-09-16)", () => {
    // Confirmed by reproduction: someone else's story, told without quotes,
    // credited its own stated duration as if it were the player's elapsed
    // time — the whole-beat guard never fires because there's no quote mark.
    expect(decide(
      "The old man told you that after 2 hours, the wound finally began to heal."
    )).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide(
      "She explained that after 3 days, the flowers would bloom."
    )).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });

  it("also blocks the whole beat, like every other guard trigger, when reported speech appears in a later sentence", () => {
    // Deliberate, safe-direction coarseness consistent with every other
    // trigger in hasNonCurrentTemporalFrame (pluperfect, dissociative-
    // transition, memory verbs, ...): the whole-beat guard runs first in
    // decide() and is not sentence-scoped, so real evidence earlier in the
    // same beat is lost too when a later sentence reports someone else's
    // speech. Accepted per D-017 ("a missed advancement is safer than an
    // invented one") rather than adding per-sentence scoping to the
    // top-level guard itself.
    expect(decide(
      "After 2 hours, you finally reach the town. The guard told you that the gate closes at dusk."
    )).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });

  it("recognizes progressive (-ing) forms of memory/imagination/intent verbs (regression, 2026-09-16)", () => {
    // Confirmed by reproduction: "remembering", "imagining", "dreaming",
    // "planning", "intending" never matched the guard's word list, so a
    // stated duration sharing the beat with one of these would have been
    // wrongly credited as real elapsed time.
    expect(decide("After 2 hours, you keep remembering the day the war started.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("After 2 hours, you are imagining how the battle might have gone.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("After 2 hours, she is dreaming of a life far from here.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("After 2 hours, he is planning his next move.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
    expect(decide("After 2 hours, you are intending to leave at dawn.")).toMatchObject({ elapsedTime: { minutes: 0 }, mode: "conservative-fallback" });
  });
});
