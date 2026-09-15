import { createElapsedTime, type ElapsedTime } from "../calendar/elapsed-time.js";
import type { TemporalReasoner, TemporalReasonerDecision, TemporalReasonerInput } from "./temporal-reasoner.js";

/** Conservative D0 reasoner for explicit and common narrative temporal evidence. */
export const ruleBasedTemporalReasoner: TemporalReasoner = Object.freeze({ decide });

function decide(input: TemporalReasonerInput): TemporalReasonerDecision {
  const narrative = input.completedNarrative.toLowerCase();
  const explicit = findExplicitDuration(narrative);
  if (explicit !== undefined) return decision(explicit, "explicit-duration", "Explicit elapsed duration in completed narrative.", "high");

  const transitionHour = findTransitionHour(narrative);
  if (transitionHour !== undefined) {
    return decision(untilHour(input.currentState.currentDateTime, transitionHour), "explicit-transition", "Completed narrative establishes a named time-of-day transition.", "medium");
  }
  if (/(durante a noite|throughout the night|passou a noite|overnight)/.test(narrative)) {
    return decision(createElapsedTime({ days: 0, hours: 8, minutes: 0, seconds: 0 }), "summary-or-time-skip", "Completed narrative summarizes an overnight passage.", "medium");
  }
  if (/(mais tarde|later|depois de um tempo|after a while)/.test(narrative)) {
    return decision(createElapsedTime({ days: 0, hours: 0, minutes: 5, seconds: 0 }), "conservative-fallback", "Narrative gives a vague later-time expression.", "low");
  }
  const prior = input.activityPriors.find((candidate) => candidate.requiresContext !== true && matchesActivity(narrative, candidate.activity));
  if (prior !== undefined) return decision(prior.suggestedElapsedTime, "scene-progression", "Activity prior used only because stronger temporal evidence is absent.", "low");
  if (/(correu|walked|ran|atravessando|travelling|traveled)/.test(narrative)) {
    return decision(createElapsedTime({ days: 0, hours: 0, minutes: 1, seconds: 0 }), "scene-progression", "Completed narrative shows a continuing physical scene, not completed travel.", "low");
  }
  return decision(createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }), "conservative-fallback", "No defensible elapsed-time evidence in the completed narrative.", "low");
}

function matchesActivity(text: string, activity: string): boolean {
  const escaped = activity.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(text);
}

function findExplicitDuration(text: string): ElapsedTime | undefined {
  const match = /(\d+)\s*(segundos?|seconds?|minutos?|minutes?|horas?|hours?|dias?|days?)/.exec(text);
  if (match === null) return undefined;
  const value = Number(match[1]);
  const unit = match[2];
  if (/^(segundos?|seconds?)$/.test(unit)) return createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: value });
  if (/^(minutos?|minutes?)$/.test(unit)) return createElapsedTime({ days: 0, hours: 0, minutes: value, seconds: 0 });
  if (/^(horas?|hours?)$/.test(unit)) return createElapsedTime({ days: 0, hours: value, minutes: 0, seconds: 0 });
  return createElapsedTime({ days: value, hours: 0, minutes: 0, seconds: 0 });
}

function findTransitionHour(text: string): number | undefined {
  if (/(ao amanhecer|raios de sol|despertou|morning|sunrise|woke up)/.test(text)) return 6;
  if (/(at noon|by noon|meio-dia|midday)/.test(text)) return 12;
  if (/(at sunset|by sunset|entardecer|sunset)/.test(text)) return 18;
  if (/(at nightfall|night fell|anoitecer|nightfall)/.test(text)) return 21;
  return undefined;
}

function untilHour(dateTime: TemporalReasonerInput["currentState"]["currentDateTime"], targetHour: number): ElapsedTime {
  const now = dateTime.hour * 3_600 + dateTime.minute * 60 + dateTime.second;
  const target = targetHour * 3_600;
  const remaining = now < target ? target - now : 86_400 - now + target;
  return createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: remaining });
}

function decision(elapsedTime: ElapsedTime, mode: TemporalReasonerDecision["mode"], rationale: string, confidence: "high" | "medium" | "low"): TemporalReasonerDecision {
  return Object.freeze({ elapsedTime, mode, rationale, confidence });
}
