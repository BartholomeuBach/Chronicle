import type { ElapsedTime } from "../calendar/elapsed-time.js";
import type { ChronicleState } from "../state/chronicle-state.js";
import type { ActivityPrior } from "./activity-prior.js";
import type { TemporalMode } from "./temporal-mode.js";

/** The minimal completed-story information given to a replaceable reasoner. */
export interface TemporalReasonerInput {
  readonly currentState: ChronicleState;
  readonly playerAction: string | undefined;
  readonly completedNarrative: string;
  readonly activityPriors: readonly ActivityPrior[];
}

/**
 * A reasoner's selected incremental delta and a concise auditable category.
 * It must describe only newly elapsed time, never a whole scene re-counted.
 */
export interface TemporalReasonerDecision {
  readonly elapsedTime: ElapsedTime;
  readonly mode: TemporalMode;
  readonly rationale: string;
  readonly confidence?: "high" | "medium" | "low";
  /**
   * Allows an auditable zero-delta decision only when the completed narrative
   * itself contains temporal evidence. Omit or set false for a neutral beat.
   */
  readonly hasTemporalEvidence?: boolean;
}

/**
 * Stable boundary for future narrative implementations. Domain callers depend
 * on this contract, not on a particular parsing or AI-assisted strategy.
 */
export interface TemporalReasoner {
  decide(input: TemporalReasonerInput): TemporalReasonerDecision;
}
