import type { TemporalReasonerDecision } from "../reasoning/temporal-reasoner.js";
import { applyTemporalDecision } from "../state/apply-temporal-decision.js";
import type { ChronicleState } from "../state/chronicle-state.js";
import {
  appendTemporalLedger,
  createTemporalLedgerRecord,
  type TemporalConfidence,
  type TemporalLedger,
  type TemporalLedgerRecord
} from "./temporal-ledger.js";

export interface RecordTemporalDecisionInput {
  readonly state: ChronicleState;
  readonly ledger: TemporalLedger;
  readonly beatId: string;
  readonly decision: TemporalReasonerDecision;
  readonly actionInterpretation: string;
  readonly confidence: TemporalConfidence;
}

export interface RecordedTemporalDecision {
  readonly state: ChronicleState;
  readonly ledger: TemporalLedger;
  readonly record: TemporalLedgerRecord | undefined;
  readonly applied: boolean;
}

/** Applies a new decision and its audit record atomically at the domain boundary. */
export function recordTemporalDecision(input: RecordTemporalDecisionInput): RecordedTemporalDecision {
  const application = applyTemporalDecision(input.state, input.beatId, input.decision);
  if (!application.applied) {
    return Object.freeze({ state: input.state, ledger: input.ledger, record: undefined, applied: false });
  }

  const record = createTemporalLedgerRecord({
    beatId: input.beatId,
    previousState: input.state,
    actionInterpretation: input.actionInterpretation,
    elapsedTime: input.decision.elapsedTime,
    mode: input.decision.mode,
    reasoning: input.decision.rationale,
    confidence: input.confidence,
    resultingState: application.state
  });

  return Object.freeze({
    state: application.state,
    ledger: appendTemporalLedger(input.ledger, record),
    record,
    applied: true
  });
}
