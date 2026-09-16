import { describe, expect, it } from "vitest";
import { createElapsedTime } from "../../../src/chronicle/calendar/index.js";
import {
  appendTemporalLedger,
  createTemporalLedger,
  createTemporalLedgerRecord,
  isTemporalLedger,
  MAX_TEMPORAL_LEDGER_RECORDS,
  recordTemporalDecision
} from "../../../src/chronicle/ledger/index.js";
import { applyTemporalDecision, initializeChronicleState } from "../../../src/chronicle/state/index.js";
import type { TemporalReasonerDecision } from "../../../src/chronicle/reasoning/index.js";

const decision: TemporalReasonerDecision = {
  elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 15, seconds: 0 }),
  mode: "explicit-duration",
  rationale: "The narrative explicitly states fifteen minutes."
};

const before = () =>
  initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 });

const recordFor = (beatId = "output-001") => {
  const previousState = before();
  const resultingState = applyTemporalDecision(previousState, beatId, decision).state;
  return createTemporalLedgerRecord({
    beatId,
    previousState,
    actionInterpretation: "The party walks to the inn.",
    elapsedTime: decision.elapsedTime,
    mode: decision.mode,
    reasoning: decision.rationale,
    confidence: "high",
    resultingState
  });
};

describe("Temporal Ledger", () => {
  it("records a compact, immutable, internally consistent accepted update", () => {
    const record = recordFor();

    expect(record).toMatchObject({
      schemaVersion: 1,
      beatId: "output-001",
      actionInterpretation: "The party walks to the inn.",
      elapsedTime: { days: 0, hours: 0, minutes: 15, seconds: 0 },
      mode: "explicit-duration",
      confidence: "high",
      previousState: { currentDateTime: { hour: 19, minute: 32 } },
      resultingState: { currentDateTime: { hour: 19, minute: 47 } }
    });
    expect(Object.isFrozen(record)).toBe(true);
    expect(Object.isFrozen(record.previousState.currentDateTime)).toBe(true);
  });

  it("rejects a record whose resulting time does not match the applied delta", () => {
    const previousState = before();
    expect(() =>
      createTemporalLedgerRecord({
        beatId: "output-001",
        previousState,
        actionInterpretation: "Walk.",
        elapsedTime: decision.elapsedTime,
        mode: decision.mode,
        reasoning: decision.rationale,
        confidence: "high",
        resultingState: previousState
      })
    ).toThrow("resultingState must equal previousState plus elapsedTime");
  });

  it("does not duplicate a beat and bounds retained history", () => {
    let ledger = createTemporalLedger();
    const first = recordFor();
    ledger = appendTemporalLedger(ledger, first);
    expect(appendTemporalLedger(ledger, first)).toBe(ledger);

    for (let index = 1; index <= MAX_TEMPORAL_LEDGER_RECORDS; index += 1) {
      ledger = appendTemporalLedger(ledger, recordFor(`output-${index}`));
    }
    expect(ledger.records).toHaveLength(MAX_TEMPORAL_LEDGER_RECORDS);
    expect(ledger.records[0].beatId).toBe("output-1");
  });

  it("rejects blank or overlong compact text", () => {
    const previousState = before();
    const resultingState = applyTemporalDecision(previousState, "output-001", decision).state;
    expect(() =>
      createTemporalLedgerRecord({
        beatId: "output-001",
        previousState,
        actionInterpretation: " ",
        elapsedTime: decision.elapsedTime,
        mode: decision.mode,
        reasoning: decision.rationale,
        confidence: "high",
        resultingState
      })
    ).toThrow("actionInterpretation must contain 1 to 280 characters");
  });

  it("records a decision once with the same idempotency boundary as state advancement", () => {
    const initialState = before();
    const initialLedger = createTemporalLedger();
    const first = recordTemporalDecision({
      state: initialState,
      ledger: initialLedger,
      beatId: "output-001",
      decision,
      actionInterpretation: "The party walks to the inn.",
      confidence: "high"
    });
    const retry = recordTemporalDecision({
      state: first.state,
      ledger: first.ledger,
      beatId: "output-001",
      decision,
      actionInterpretation: "The party walks to the inn.",
      confidence: "high"
    });

    expect(first.applied).toBe(true);
    expect(first.ledger.records).toHaveLength(1);
    expect(retry).toMatchObject({ applied: false, state: first.state, ledger: first.ledger, record: undefined });
  });

  it("keeps a neutral zero-delta beat out of the Ledger while retaining idempotency", () => {
    const zeroDecision: TemporalReasonerDecision = {
      elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }),
      mode: "conservative-fallback",
      rationale: "No temporal evidence in the completed narrative."
    };
    const first = recordTemporalDecision({
      state: before(), ledger: createTemporalLedger(), beatId: "output-neutral", decision: zeroDecision,
      actionInterpretation: zeroDecision.rationale, confidence: "low"
    });
    const retry = recordTemporalDecision({
      state: first.state, ledger: first.ledger, beatId: "output-neutral", decision,
      actionInterpretation: decision.rationale, confidence: "high"
    });

    expect(first).toMatchObject({ applied: true, record: undefined, ledger: { records: [] } });
    expect(first.state.processedBeatIds).toContain("output-neutral");
    expect(retry).toMatchObject({ applied: false, ledger: first.ledger });
  });

  it("records a zero delta when the reasoner identifies explicit temporal evidence", () => {
    const zeroEvidenceDecision: TemporalReasonerDecision = {
      elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }),
      mode: "explicit-duration",
      rationale: "The narrative explicitly states that zero minutes passed.",
      hasTemporalEvidence: true
    };
    const recorded = recordTemporalDecision({
      state: before(), ledger: createTemporalLedger(), beatId: "output-zero-evidence", decision: zeroEvidenceDecision,
      actionInterpretation: zeroEvidenceDecision.rationale, confidence: "high"
    });

    expect(recorded.record).toMatchObject({ beatId: "output-zero-evidence", elapsedTime: { minutes: 0 } });
    expect(recorded.ledger.records).toHaveLength(1);
  });

  it("carries the model-signaled evidence tier's traceability (D-026) when the decision provides it", () => {
    const signaledDecision: TemporalReasonerDecision = {
      elapsedTime: createElapsedTime({ days: 0, hours: 9, minutes: 15, seconds: 0 }),
      mode: "model-signaled",
      rationale: "Model-reported elapsed time via injected directive; consistent with local guard.",
      confidence: "high",
      hasTemporalEvidence: true,
      signalStatus: "accepted"
    };
    const recorded = recordTemporalDecision({
      state: before(), ledger: createTemporalLedger(), beatId: "output-signaled", decision: signaledDecision,
      actionInterpretation: signaledDecision.rationale, confidence: "high"
    });

    expect(recorded.record).toMatchObject({ mode: "model-signaled", signalStatus: "accepted" });
  });

  it("leaves signalStatus undefined for a decision that never evaluated the AI-signal tier", () => {
    expect(recordFor().signalStatus).toBeUndefined();
    expect(JSON.stringify(recordFor())).not.toContain("signalStatus");
  });

  it("rejects an unsupported signalStatus value", () => {
    const previousState = before();
    const resultingState = applyTemporalDecision(previousState, "output-001", decision).state;
    expect(() =>
      createTemporalLedgerRecord({
        beatId: "output-001",
        previousState,
        actionInterpretation: "Walk.",
        elapsedTime: decision.elapsedTime,
        mode: decision.mode,
        reasoning: decision.rationale,
        confidence: "high",
        resultingState,
        signalStatus: "made-up-status" as never
      })
    ).toThrow("Unsupported temporal signal status");
  });

  it("still validates a persisted Ledger that carries signalStatus on its records", () => {
    const record = createTemporalLedgerRecord({
      beatId: "output-001",
      previousState: before(),
      actionInterpretation: "The party walks to the inn.",
      elapsedTime: decision.elapsedTime,
      mode: decision.mode,
      reasoning: decision.rationale,
      confidence: "high",
      resultingState: applyTemporalDecision(before(), "output-001", decision).state,
      signalStatus: "absent"
    });
    expect(isTemporalLedger({ records: [record] })).toBe(true);
    expect(isTemporalLedger({ records: [{ ...record, signalStatus: "not-a-real-status" }] })).toBe(false);
  });
});
