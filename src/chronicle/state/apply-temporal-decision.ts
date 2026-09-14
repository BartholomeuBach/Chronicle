import { advanceChronicleDateTime } from "../calendar/advance-chronicle-date-time.js";
import type { TemporalReasonerDecision } from "../reasoning/temporal-reasoner.js";
import type { ChronicleState } from "./chronicle-state.js";

/**
 * D0 retains a short idempotency window. It guards normal hook retries while
 * keeping serialized runtime state bounded; ledger retention is a later phase.
 */
export const MAX_PROCESSED_BEAT_IDS = 64;

export interface TemporalDecisionApplication {
  readonly state: ChronicleState;
  readonly applied: boolean;
}

/**
 * Advances canonical time at most once for a supplied completed-narrative ID.
 * A repeated ID returns the existing immutable state without re-counting time.
 */
export function applyTemporalDecision(
  state: ChronicleState,
  beatId: string,
  decision: TemporalReasonerDecision
): TemporalDecisionApplication {
  const normalizedBeatId = beatId.trim();
  if (normalizedBeatId.length === 0) {
    throw new RangeError("beatId must contain non-whitespace text.");
  }

  if (state.processedBeatIds.includes(normalizedBeatId)) {
    return Object.freeze({ state, applied: false });
  }

  const processedBeatIds = Object.freeze(
    [...state.processedBeatIds, normalizedBeatId].slice(-MAX_PROCESSED_BEAT_IDS)
  );
  const nextState = Object.freeze({
    currentDateTime: advanceChronicleDateTime(state.currentDateTime, decision.elapsedTime),
    processedBeatIds
  });

  return Object.freeze({ state: nextState, applied: true });
}
