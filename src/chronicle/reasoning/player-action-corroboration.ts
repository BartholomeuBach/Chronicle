import { matchesActivity } from "./rule-based-temporal-reasoner.js";
import type { ActivityPrior } from "./activity-prior.js";
import type { TemporalReasoner, TemporalReasonerDecision, TemporalReasonerInput } from "./temporal-reasoner.js";

const MAX_RATIONALE_LENGTH = 280;
const CORROBORATION_NOTE = "player action names the same activity";

/**
 * Opção A (playerAction correlation, first step): wraps a fallback
 * TemporalReasoner and boosts a `scene-progression`/`low`-confidence
 * decision to `medium` when the captured player action and the completed
 * narrative both name the same catalog activity — using the same
 * word-boundary matcher already trusted for activity priors, not a looser
 * free-text comparison.
 *
 * This deliberately never changes `elapsedTime` or `mode`: it only makes
 * the recorded confidence more honest when two independent texts agree.
 * A genuinely context-required activity (`sleep`, `travel`, `fight`, ...)
 * is not unlocked by this — that remains Opção B, a separate, stricter
 * follow-up once this corroboration signal has been observed to behave
 * well (see 07_open_questions.md).
 *
 * Degrades safely with no fresh player action (e.g. a Continue turn):
 * an absent or blank `playerAction` simply leaves the decision unchanged.
 */
export function createPlayerActionCorroboratedReasoner(reasoner: TemporalReasoner): TemporalReasoner {
  return Object.freeze({
    decide(input: TemporalReasonerInput): TemporalReasonerDecision {
      const decision = reasoner.decide(input);
      if (decision.mode !== "scene-progression" || decision.confidence !== "low") return decision;
      if (!agreesOnActivity(input.playerAction, input.completedNarrative, input.activityPriors)) return decision;

      const rationale = `${decision.rationale} (${CORROBORATION_NOTE})`.slice(0, MAX_RATIONALE_LENGTH).trim();
      return Object.freeze({ ...decision, confidence: "medium", rationale: rationale.length > 0 ? rationale : decision.rationale });
    }
  });
}

function agreesOnActivity(
  playerAction: string | undefined,
  completedNarrative: string,
  activityPriors: readonly ActivityPrior[]
): boolean {
  if (playerAction === undefined || playerAction.trim().length === 0) return false;
  const action = playerAction.toLowerCase();
  const narrative = completedNarrative.toLowerCase();
  return activityPriors.some((prior) => matchesActivity(action, prior.activity) && matchesActivity(narrative, prior.activity));
}
