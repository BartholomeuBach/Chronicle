import { describe, expect, it } from "vitest";
import { createElapsedTime } from "../../../src/chronicle/calendar/index.js";
import {
  applyTemporalDecision,
  formatChronicleDateTime,
  initializeChronicleState,
  MAX_PROCESSED_BEAT_IDS
} from "../../../src/chronicle/state/index.js";
import type { TemporalReasonerDecision } from "../../../src/chronicle/reasoning/index.js";

const decision = (minutes: number): TemporalReasonerDecision => ({
  elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes, seconds: 0 }),
  mode: "scene-progression",
  rationale: "Test fixture."
});

const initialState = () =>
  initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 });

describe("applyTemporalDecision", () => {
  it("applies a selected incremental delta and records its beat ID", () => {
    const result = applyTemporalDecision(initialState(), " output-001 ", decision(15));

    expect(result.applied).toBe(true);
    expect(formatChronicleDateTime(result.state.currentDateTime)).toBe("2026/04/13 19:47:00");
    expect(result.state.processedBeatIds).toEqual(["output-001"]);
    expect(Object.isFrozen(result.state)).toBe(true);
    expect(Object.isFrozen(result.state.processedBeatIds)).toBe(true);
  });

  it("does not advance time again when the same completed beat is retried", () => {
    const first = applyTemporalDecision(initialState(), "output-001", decision(15));
    const retry = applyTemporalDecision(first.state, "output-001", decision(15));

    expect(retry.applied).toBe(false);
    expect(retry.state).toBe(first.state);
    expect(formatChronicleDateTime(retry.state.currentDateTime)).toBe("2026/04/13 19:47:00");
  });

  it("retains only a bounded recent idempotency window", () => {
    let state = initialState();
    for (let index = 0; index <= MAX_PROCESSED_BEAT_IDS; index += 1) {
      state = applyTemporalDecision(state, `output-${index}`, decision(0)).state;
    }

    expect(state.processedBeatIds).toHaveLength(MAX_PROCESSED_BEAT_IDS);
    expect(state.processedBeatIds[0]).toBe("output-1");
    expect(state.processedBeatIds[state.processedBeatIds.length - 1]).toBe(`output-${MAX_PROCESSED_BEAT_IDS}`);
  });

  it("rejects an empty beat identifier", () => {
    expect(() => applyTemporalDecision(initialState(), " ", decision(0))).toThrow(
      "beatId must contain non-whitespace text"
    );
  });
});
