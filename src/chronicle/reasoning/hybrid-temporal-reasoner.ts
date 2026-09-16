import { hasNonCurrentTemporalFrame } from "./rule-based-temporal-reasoner.js";
import { readModelTemporalSignal } from "./model-temporal-signal.js";
import type { TemporalReasoner, TemporalReasonerDecision, TemporalReasonerInput } from "./temporal-reasoner.js";
import type { TemporalSignalStatus } from "./temporal-signal-status.js";

const MAX_RATIONALE_LENGTH = 280;

/**
 * Wraps a fallback TemporalReasoner (canonically the deterministic
 * Rule-Based Temporal Reasoner) with an optional, higher-priority evidence
 * tier (D-026): a validated directive the AI Dungeon narrator itself may
 * emit for the completed beat, carrying its own self-reported confidence.
 *
 * D-026 Cenário 1: a signal is trusted, at whatever confidence the narrator
 * itself reports (high/medium/low), as long as it does not contradict the
 * same non-current-frame guard the deterministic reasoner already relies
 * on — two independent readings of the narrative must agree on *whether*
 * this is current-scene evidence at all, but Chronicle no longer
 * second-guesses *how much* the narrator judged elapsed (there is
 * deliberately no magnitude cap) nor treats more than one directive in the
 * same beat as a hard error (the last one is taken as final intent). Any
 * absent, malformed, or contradicted signal falls through to the fallback
 * reasoner completely unmodified, so this tier can never make Chronicle's
 * existing deterministic behavior worse.
 */
export function createHybridTemporalReasoner(fallback: TemporalReasoner): TemporalReasoner {
  return Object.freeze({
    decide(input: TemporalReasonerInput): TemporalReasonerDecision {
      const signal = readModelTemporalSignal(input.completedNarrative);

      if (signal.status === "accepted") {
        if (hasNonCurrentTemporalFrame(input.completedNarrative.toLowerCase())) {
          return withRejectionNote(fallback.decide(input), "rejected-contradicted", "contradicts non-current narrative frame");
        }
        return Object.freeze({
          elapsedTime: signal.elapsedTime,
          mode: "model-signaled",
          rationale: `Model-reported elapsed time via injected directive (self-rated ${signal.confidence} confidence); consistent with local guard.`,
          confidence: signal.confidence,
          hasTemporalEvidence: true,
          signalStatus: "accepted"
        });
      }

      if (signal.reason === "absent") return Object.freeze({ ...fallback.decide(input), signalStatus: "absent" });
      return withRejectionNote(fallback.decide(input), "rejected-malformed", signal.reason);
    }
  });
}

/** Notes a rejected/contradicted signal in the audit trail, and its status, without changing the fallback's own elapsed time or mode. */
function withRejectionNote(decision: TemporalReasonerDecision, status: TemporalSignalStatus, reason: string): TemporalReasonerDecision {
  const rationale = `Model signal rejected (${reason}); ${decision.rationale}`.slice(0, MAX_RATIONALE_LENGTH).trim();
  return Object.freeze({ ...decision, rationale: rationale.length > 0 ? rationale : decision.rationale, signalStatus: status });
}
