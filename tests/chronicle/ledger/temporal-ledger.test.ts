import { describe, expect, it } from "vitest";
import { createElapsedTime } from "../../../src/chronicle/calendar/index.js";
import {
  appendTemporalLedger,
  createTemporalLedger,
  createTemporalLedgerRecord,
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
});
