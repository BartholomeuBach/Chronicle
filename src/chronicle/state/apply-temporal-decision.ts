import { advanceChronicleDateTime } from "../calendar/advance-chronicle-date-time.js";
import type { TemporalReasonerDecision } from "../reasoning/temporal-reasoner.js";
import type { ChronicleState } from "./chronicle-state.js";

/**
 * D0 retains a short idempotency window. It guards normal hook retries while
 * keeping serialized runtime state bounded; ledger retention is a later phase.
 */
export const MAX_PROCESSED_BEAT_IDS = 64;

/** Why a decision was not applied, distinct from an ordinary idempotent retry. */
export type TemporalDecisionRejectionReason = "duplicate-beat" | "unsupported-range";

export interface TemporalDecisionApplication {
  readonly state: ChronicleState;
  readonly applied: boolean;
  readonly rejectionReason?: TemporalDecisionRejectionReason;
}

/**
 * Advances canonical time at most once for a supplied completed-narrative ID.
 * A repeated ID returns the existing immutable state without re-counting time.
 *
 * Also refuses (rather than throws) a decision whose elapsed time would move
 * the calendar outside the supported year range (1-9999): confirmed
 * 2026-09-15 that an out-of-range delta previously threw an uncaught
 * RangeError all the way out of the AI Dungeon Output hook. That risk grew
 * materially once D-026 Cenário 1 removed the model-signaled tier's
 * magnitude cap. State is left completely unchanged on rejection, exactly
 * like an idempotent retry — the caller distinguishes the two via
 * `rejectionReason` to decide whether a diagnostic is warranted.
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
    return Object.freeze({ state, applied: false, rejectionReason: "duplicate-beat" });
  }

  let advancedDateTime: ChronicleState["currentDateTime"];
  try {
    advancedDateTime = advanceChronicleDateTime(state.currentDateTime, decision.elapsedTime);
  } catch {
    return Object.freeze({ state, applied: false, rejectionReason: "unsupported-range" });
  }

  const processedBeatIds = Object.freeze(
    [...state.processedBeatIds, normalizedBeatId].slice(-MAX_PROCESSED_BEAT_IDS)
  );
  const nextState = Object.freeze({
    currentDateTime: advancedDateTime,
    processedBeatIds
  });

  return Object.freeze({ state: nextState, applied: true });
}
