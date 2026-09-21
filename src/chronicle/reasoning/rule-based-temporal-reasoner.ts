import { createElapsedTime, type ElapsedTime } from "../calendar/elapsed-time.js";
import type { TemporalReasoner, TemporalReasonerDecision, TemporalReasonerInput } from "./temporal-reasoner.js";

/** Conservative D0 reasoner for explicit and common narrative temporal evidence. */
export const ruleBasedTemporalReasoner: TemporalReasoner = Object.freeze({ decide });

function decide(input: TemporalReasonerInput): TemporalReasonerDecision {
  const narrative = input.completedNarrative.toLowerCase();
  if (hasNonCurrentTemporalFrame(narrative)) {
    return decision(createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }), "conservative-fallback", "Temporal language belongs to a descriptive, remembered, hypothetical, or quoted frame.", "low");
  }
  const explicit = findExplicitDuration(narrative);
  if (explicit !== undefined) return decision(explicit, "explicit-duration", "Explicit elapsed duration in completed narrative.", "high", true);

  const transitionHour = findTransitionHour(narrative);
  if (transitionHour !== undefined) {
    const secondsToTarget = secondsUntilHour(input.currentState.currentDateTime, transitionHour);
    // A named transition is only credited when the target is a plausible next step. Past the
    // cap the phrase is descriptive ("You woke up", "Night fell over the harbor") and falls
    // through to the remaining rules instead of skipping most of a day.
    if (secondsToTarget <= MAX_TRANSITION_SECONDS) {
      return decision(createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: secondsToTarget }), "explicit-transition", "Completed narrative establishes a named time-of-day transition.", "medium");
    }
  }
  if (/(durante a noite|throughout the night|passou a noite|overnight)/.test(narrative)) {
    return decision(createElapsedTime({ days: 0, hours: 8, minutes: 0, seconds: 0 }), "summary-or-time-skip", "Completed narrative summarizes an overnight passage.", "medium");
  }
  if (/(mais tarde|later|depois de um tempo|after a while)/.test(narrative)) {
    return decision(createElapsedTime({ days: 0, hours: 0, minutes: 5, seconds: 0 }), "conservative-fallback", "Narrative gives a vague later-time expression.", "low");
  }
  if (isClockOrScreenObservation(narrative)) {
    return decision(createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }), "conservative-fallback", "A clock or screen observation establishes current time but no elapsed duration.", "low");
  }
  const prior = input.activityPriors.find((candidate) => candidate.requiresContext !== true && matchesActivity(narrative, candidate.activity));
  if (prior !== undefined) return decision(prior.suggestedElapsedTime, "scene-progression", "Activity prior used only because stronger temporal evidence is absent.", "low");
  if (/\b(?:correu|walked|ran|atravessando|travelling|traveled)\b/.test(narrative)) {
    return decision(createElapsedTime({ days: 0, hours: 0, minutes: 1, seconds: 0 }), "scene-progression", "Completed narrative shows a continuing physical scene, not completed travel.", "low");
  }
  return decision(createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }), "conservative-fallback", "No defensible elapsed-time evidence in the completed narrative.", "low");
}

/** A glance at a display is an observation, not a completed time-consuming activity. */
function isClockOrScreenObservation(text: string): boolean {
  return /\b(?:glances?|looks?|checks?|reads?|inspects?|watches?|studies?)\b/.test(text) &&
    /\b(?:clock|time|watch|screen|display|monitor|phone|laptop|calendar|date)\b/.test(text);
}

/**
 * Conservative guard for temporal language that does not describe the current
 * narrative beat. It deliberately favors no advancement over an invented one.
 * Exported so the hybrid Reasoner (D-026) can cross-check a model-reported
 * signal against the same guard, instead of trusting it unconditionally — it
 * is now that tier's *only* remaining independent safety net (Cenário 1
 * removed the magnitude cap), so an over-broad trigger word here silently
 * discards a valid, well-reasoned AI signal more often than it should.
 *
 * "will" and "hopes"/"espera" were removed as bare triggers: verified
 * (2026-09-15) to false-positive on ordinary current-scene narration
 * ("The door will not budge.", "The guards will notice.", "She hopes to
 * find shelter before nightfall.") far more often than they ever caught a
 * genuine non-current frame. "might" is kept as a bare trigger — it is
 * load-bearing in the local regression corpus.
 *
 * "would"/"could" were narrowed the same day: bare, they false-positived on
 * ~100% of a sampled set of ordinary current-scene sentences ("You could see
 * the village from up here.", "It would take hours to cross this ravine.").
 * Only the perfect-conditional form ("would/could have" + past participle)
 * is now a trigger, since that construction is reliably counterfactual
 * ("...would have escaped", "...could have survived"). "would/could have
 * to" is explicitly excluded — that is present-tense obligation ("You would
 * have to fight through the guards"), not a counterfactual. Verified against
 * a paired 16-case sample: 9/10 current-scene sentences no longer trigger
 * (the one residual case, "He could have been a soldier, judging by his
 * stance," is a genuinely ambiguous present-tense hedge even for a human
 * reader) and all 6 genuine-hypothetical cases still do.
 *
 * Portuguese "poderia"/"seria" were removed outright (2026-09-15), rather
 * than narrowed like their English counterparts: the target narrative is
 * confirmed fully English, so there is no live fixture (or live use) to
 * validate a Portuguese-specific refinement against, and keeping a stale,
 * unrefined Portuguese trigger would just reintroduce the same false-positive
 * class this pass fixed in English, for a language the mod does not target.
 * The remaining Portuguese in this guard (memory/dream/intent verbs, the
 * `se` sentence-start check, and the quoted-dialogue verbs) is left as-is —
 * only the two over-broad modal words were in scope for this removal.
 *
 * A pluperfect trigger ("had" + past participle, e.g. "had spent", "had
 * already left") was added the same day: a flashback/retrospective frame
 * described without any of the words above (no "remembers", no quotes) was
 * otherwise able to slip through and have its own temporal language (a
 * stated duration, a named transition) wrongly credited as current-scene
 * evidence. Only a closed list of common temporal adverbs ("already",
 * "never", "just", ...) may intervene between "had" and the participle — a
 * generic "any word" gap wrongly matched an article + an unrelated -ed
 * *adjective* ("had a pointed sword", "had a wounded arm" both describe
 * current possession, not a flashback). Verified against a paired 21-case
 * sample: 12/12 current-scene "had" sentences (including that adjective
 * trap) do not trigger, and 9/9 genuine flashback sentences do.
 *
 * A dissociative-transition trigger was added 2026-09-16: a flashback can be
 * narrated entirely in the *present tense* for vividness ("You're twelve
 * again, standing barefoot beside the river...") — no "remembers", no
 * pluperfect "had", present tense throughout. Verified by direct
 * reproduction: such a beat is invisible to every trigger above, so a
 * model-signaled directive riding along it was accepted with no cross-check
 * objection at all. There is no safe general regex for "present-tense
 * flashback body" (grammatically identical to ordinary current-scene
 * narration), but the common transition *into* one is: a hedged, subjective
 * "seems/appears to disappear/fade/blur/dissolve" — grammatically a
 * perception, not an objective current-scene event (contrast "the room
 * disappears into shadow as the torch goes out", which states the same verb
 * as plain fact). Verified against a paired 10-case sample: 5/5 literal
 * current-scene uses of the same verbs do not trigger; 5/5 genuine
 * dissociative transitions do. This only catches a beat that narrates the
 * transition sentence — one that cuts directly into the memory with no
 * transition at all is still uncaught locally; the injected AI-signal
 * instruction (D-026) was extended the same day with an explicit
 * present-tense-flashback example specifically because this regex ceiling
 * cannot be fully closed with a fixed word list.
 *
 * Progressive (-ing) forms of the memory/imagination/intent verbs were added
 * 2026-09-16: "remembers?/remembered", "imagines?/imagined", "dreams?/
 * dreamed", "plans?/planned", "intends?/intended" never matched "is
 * remembering", "is dreaming", "keeps imagining", etc. — verified by direct
 * reproduction that these fell through to the generic no-evidence fallback
 * only by luck (nothing else happened to match either), not because the
 * guard recognized them. Same risk class as the pluperfect/dissociative
 * gaps: a stated duration co-occurring with an unrecognized -ing memory verb
 * would have been wrongly credited. "planning"/"intending" are regular
 * suffix forms; "planned" is a doubled-consonant irregular already listed
 * separately (D0's own documented inflection-matching limitation).
 *
 * Unquoted reported speech ("told you that...") was added 2026-09-16: the
 * quoted-dialogue check below only fires on a literal quote mark, so both
 * `findExplicitDuration` and a model-signaled directive riding on indirect
 * discourse without quotes ("The old man told you that after 2 hours, the
 * wound finally began to heal.") had no cross-check objection at all.
 * Applied here at whole-beat scope like every other trigger in this guard
 * — deliberately coarse, so a "told...that" anywhere in the beat also
 * discards real evidence in an earlier, unrelated sentence; accepted per
 * D-017 ("a missed advancement is safer than an invented one") rather than
 * complicating the top-level guard with per-sentence scoping.
 *
 * A parallel bare-"would"/"will" trigger (forward-looking foreshadowing,
 * e.g. "After 3 days, the storm would finally arrive.") was tried and
 * reverted the same day: bare "will"/"would" is also common in ordinary
 * current-scene narration ("the door will finally give way", "it would
 * take hours to cross this ravine") and rejecting on it broke genuine
 * evidence — confirmed by the two existing regression tests above for
 * exactly that failure mode. Pure foreshadowing with no reported-speech
 * marker is left to the AI-signal layer per D-029 (AI-first priority)
 * rather than a blunt deterministic trigger.
 */
const HAD_INTERVENING_ADVERBS = "already|never|just|finally|once|recently|previously|always|barely|hardly|long";
const HAD_IRREGULAR_PARTICIPLES = "been|gone|done|seen|known|come|left|taken|given|found|told|said|held|felt|thought|" +
  "brought|caught|taught|fought|sought|written|spoken|broken|chosen|stolen|frozen|grown|blown|drawn|worn|torn|born|" +
  "spent|built|sent|meant|kept|slept|swept|dealt|lost|made|met|paid|read|run|shown|stood|won|begun|risen|fallen|" +
  "forgotten|hidden|ridden|sworn";
// Reported/indirect speech ("told you that...") without requiring quotes —
// the quoted-dialogue check below only fires with a literal quote mark.
const REPORTED_SPEECH_PATTERN = /\b(?:told|tells|said|says|explained|explains|mentioned|mentions|claimed|claims|reported|reports|recalled|recalls)\s+(?:you|him|her|them|me|us)?\s*that\b/;

export function hasNonCurrentTemporalFrame(text: string): boolean {
  return /\b(?:painting|portrait|mural|photograph|photo)\b/.test(text) ||
    /\b(?:remembers?|remembered|remembering|recalled|recalling|imagines?|imagined|imagining|dreams?|dreamed|dreaming|nightmare|plans?|planned|planning|intends?|intended|intending|might)\b/.test(text) ||
    /\b(?:would|could)\s+have\b(?!\s+to\b)/.test(text) ||
    new RegExp(`\\bhad\\s+(?:(?:${HAD_INTERVENING_ADVERBS})\\s+)?(?:${HAD_IRREGULAR_PARTICIPLES}|\\w+ed)\\b`).test(text) ||
    /\b(?:seems?|seemed|appears?|appeared)\s+to\s+(?:disappear|fade|blur|dissolve|melt away)\b|\b(?:the world|everything)\s+(?:fades?|blurs?|dissolves?)\s+away\b/.test(text) ||
    /\b(?:lembra|lembrou|imagina|imaginou|sonha|sonhou|pesadelo|planeja|planejou|pretende)\b/.test(text) ||
    /^\s*(?:if|se)\b/.test(text) ||
    /\b(?:says|said|tells|told|replies|replied|whispers|whispered|reads|diz|disse|conta|responde|sussurra)\b[^.\n]*["“”]/.test(text) ||
    REPORTED_SPEECH_PATTERN.test(text);
}

/**
 * Word-boundary match of a catalog activity name against already-lowercased
 * text. Exported so the player-action corroboration wrapper (Opção A) can
 * check the same activity against both the player's stated intent and the
 * narrator's completed output, using one tested matcher instead of a second,
 * looser comparison.
 */
export function matchesActivity(text: string, activity: string): boolean {
  const escaped = activity.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}(?:s|es|ed|ing)?\\b`).test(text);
}

function findExplicitDuration(text: string): ElapsedTime | undefined {
  const halfHour = /(?:(?:after|for|during|over|within)\s+(?:exactly\s+)?half an hour|half an hour\s+later)/.test(text);
  if (halfHour) return createElapsedTime({ days: 0, hours: 0, minutes: 30, seconds: 0 });

  const number = "(?:\\d+|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\\s]+(?:one|two|three|four|five|six|seven|eight|nine))?";
  const unit = "(?:segundos?|seconds?|minutos?|minutes?|horas?|hours?|dias?|days?)";
  const match = new RegExp(`(?:(?:after|for|during|over|within)\\s+(?:exactly\\s+|about\\s+|approximately\\s+)?(${number})\\s*(${unit})|(?:depois de|após|durante|por)\\s+(\\d+)\\s*(${unit})|(${number})\\s*(${unit})\\s*(?:later|passed|passaram))`).exec(text);
  if (match === null) return undefined;
  const value = parseNarrativeNumber(match[1] ?? match[3] ?? match[5]);
  const durationUnit = match[2] ?? match[4] ?? match[6];
  if (value === undefined || durationUnit === undefined) return undefined;
  if (/^(segundos?|seconds?)$/.test(durationUnit)) return createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: value });
  if (/^(minutos?|minutes?)$/.test(durationUnit)) return createElapsedTime({ days: 0, hours: 0, minutes: value, seconds: 0 });
  if (/^(horas?|hours?)$/.test(durationUnit)) return createElapsedTime({ days: 0, hours: value, minutes: 0, seconds: 0 });
  return createElapsedTime({ days: value, hours: 0, minutes: 0, seconds: 0 });
}

function parseNarrativeNumber(value: string): number | undefined {
  if (/^\d+$/.test(value)) return Number(value);
  const parts = value.toLowerCase().split(/[\s-]+/);
  const values: Readonly<Record<string, number>> = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90
  };
  if (parts.length === 1) return values[parts[0]];
  if (parts.length === 2 && values[parts[0]] !== undefined && values[parts[0]] >= 20 && values[parts[1]] !== undefined && values[parts[1]] < 10) {
    return values[parts[0]] + values[parts[1]];
  }
  return undefined;
}

function findTransitionHour(text: string): number | undefined {
  if (/(ao amanhecer|raios de sol|despertou|at sunrise|by sunrise|woke up|morning came)/.test(text)) return 6;
  if (/(at noon|by noon|meio-dia|midday arrived)/.test(text)) return 12;
  if (/(at sunset|by sunset|ao entardecer|sunset (?:came|fell|arrived))/.test(text)) return 18;
  if (/(at nightfall|night fell|ao anoitecer|nightfall came)/.test(text)) return 21;
  return undefined;
}

/**
 * Longest jump a single named time-of-day phrase may cause. Verified against
 * the built scripts (2026-09-20): without a cap, descriptive uses of the same
 * phrases moved the clock by up to a day ("You woke up" from a 14:00 nap went
 * to 06:00 the next day, "Night fell over the harbor" at 21:30 added 23.5h).
 * The genuine case these phrases exist for is waking after a night's sleep
 * (23:00 to 06:00 is 7h), which fits well inside 12h. The value is a judgment,
 * not a measurement.
 */
const MAX_TRANSITION_SECONDS = 12 * 3_600;

/**
 * Seconds remaining until targetHour. Uses `<=`, not `<`: when the current
 * time already exactly equals the target hour, this must resolve to 0, not
 * wrap forward a full 24h to "the next occurrence" (a confirmed bug, fixed
 * 2026-09-15 — "You woke up." at exactly 06:00:00 previously advanced to
 * the next day instead of staying put). Any wrapped result is still subject
 * to MAX_TRANSITION_SECONDS at the call site.
 */
function secondsUntilHour(dateTime: TemporalReasonerInput["currentState"]["currentDateTime"], targetHour: number): number {
  const now = dateTime.hour * 3_600 + dateTime.minute * 60 + dateTime.second;
  const target = targetHour * 3_600;
  return now <= target ? target - now : 86_400 - now + target;
}

function decision(elapsedTime: ElapsedTime, mode: TemporalReasonerDecision["mode"], rationale: string, confidence: "high" | "medium" | "low", hasTemporalEvidence = elapsedTime.days !== 0 || elapsedTime.hours !== 0 || elapsedTime.minutes !== 0 || elapsedTime.seconds !== 0): TemporalReasonerDecision {
  return Object.freeze({ elapsedTime, mode, rationale, confidence, hasTemporalEvidence });
}
