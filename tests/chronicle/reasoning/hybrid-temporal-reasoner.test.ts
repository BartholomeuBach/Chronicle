import { describe, expect, it } from "vitest";
import { createHybridTemporalReasoner, type TemporalReasoner } from "../../../src/chronicle/reasoning/index.js";
import { initializeChronicleState } from "../../../src/chronicle/state/index.js";

const currentState = initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 });

const fallback: TemporalReasoner = {
  decide: () => ({
    elapsedTime: { days: 0, hours: 0, minutes: 1, seconds: 0 },
    mode: "scene-progression",
    rationale: "Fallback rule-based decision.",
    confidence: "low"
  })
};

const decide = (completedNarrative: string) =>
  createHybridTemporalReasoner(fallback).decide({
    currentState,
    playerAction: undefined,
    completedNarrative,
    activityPriors: []
  });

describe("Hybrid Temporal Reasoner (D-026, Cenário 1)", () => {
  it("trusts a valid, uncontradicted model signal, carrying the narrator's own confidence", () => {
    expect(decide("You sleep soundly until dawn. <<chronicle:PT9H15M,high>>")).toMatchObject({
      elapsedTime: { days: 0, hours: 9, minutes: 15, seconds: 0 },
      mode: "model-signaled",
      confidence: "high",
      hasTemporalEvidence: true,
      signalStatus: "accepted"
    });
  });

  it("still trusts a low-confidence estimate rather than falling back (Cenário 1: reject only on the structural cases)", () => {
    expect(decide("A shadow slips across the room. <<chronicle:PT1M,low>>")).toMatchObject({
      elapsedTime: { days: 0, hours: 0, minutes: 1, seconds: 0 },
      mode: "model-signaled",
      confidence: "low",
      hasTemporalEvidence: true,
      signalStatus: "accepted"
    });
  });

  it("defaults to medium confidence when the narrator omits it", () => {
    expect(decide("You test the handle. <<chronicle:none>>")).toMatchObject({
      elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      mode: "model-signaled",
      confidence: "medium",
      hasTemporalEvidence: true,
      signalStatus: "accepted"
    });
  });

  it("accepts a large magnitude signal without a cap: a legitimate fantasy time skip", () => {
    expect(decide("Years pass in the hermitage. <<chronicle:P3650D,high>>")).toMatchObject({
      elapsedTime: { days: 3650, hours: 0, minutes: 0, seconds: 0 },
      mode: "model-signaled",
      confidence: "high",
      signalStatus: "accepted"
    });
  });

  it("withholds a heuristic scene advance when the requested signal is absent", () => {
    expect(decide("You walk to the market.")).toMatchObject({
      elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      mode: "conservative-fallback",
      signalStatus: "absent"
    });
  });

  it("falls through to the fallback, with an audit note and status, when the signal is malformed", () => {
    const result = decide("Something happens. <<chronicle:soon>>");
    expect(result.mode).toBe("scene-progression");
    expect(result.elapsedTime).toEqual({ days: 0, hours: 0, minutes: 1, seconds: 0 });
    expect(result.rationale).toContain("Model signal rejected (malformed)");
    expect(result.signalStatus).toBe("rejected-malformed");
  });

  it("trusts the last of several directives as the narrator's final intent, instead of rejecting outright", () => {
    expect(decide("First guess... <<chronicle:PT1H>> ... actually, <<chronicle:PT2H,high>>")).toMatchObject({
      elapsedTime: { hours: 2 },
      mode: "model-signaled",
      confidence: "high",
      signalStatus: "accepted"
    });
  });

  it("distrusts a signal that contradicts the non-current-frame guard, even if well-formed and high confidence", () => {
    const result = decide("You remember your childhood home. <<chronicle:PT3H,high>>");
    expect(result.mode).toBe("scene-progression");
    expect(result.rationale).toContain("Model signal rejected (contradicts non-current narrative frame)");
    expect(result.signalStatus).toBe("rejected-contradicted");
  });

  it("distrusts a signal riding along a pluperfect flashback, even if well-formed and high confidence", () => {
    const result = decide("She had spent two hours there once, haggling over spices. <<chronicle:PT2H,high>>");
    expect(result.mode).toBe("scene-progression");
    expect(result.rationale).toContain("Model signal rejected (contradicts non-current narrative frame)");
    expect(result.signalStatus).toBe("rejected-contradicted");
  });

  it("distrusts a signal riding along a present-tense flashback with a dissociative transition (regression, 2026-09-16)", () => {
    const result = decide(
      "For a moment, the room seems to disappear. You're twelve again, standing barefoot beside the river. <<chronicle:PT15M,medium>>"
    );
    expect(result.mode).toBe("scene-progression");
    expect(result.rationale).toContain("Model signal rejected (contradicts non-current narrative frame)");
    expect(result.signalStatus).toBe("rejected-contradicted");
  });

  it("distrusts a signal riding along unquoted reported speech, even if well-formed and high confidence (regression, 2026-09-16)", () => {
    const result = decide(
      "The old man told you that after 2 hours, the wound finally began to heal. <<chronicle:PT2H,high>>"
    );
    expect(result.mode).toBe("scene-progression");
    expect(result.rationale).toContain("Model signal rejected (contradicts non-current narrative frame)");
    expect(result.signalStatus).toBe("rejected-contradicted");
  });

  it("never lets a rejection note push the rationale past the Ledger's 280-character bound", () => {
    const longFallback: TemporalReasoner = { decide: () => ({ elapsedTime: { days: 0, hours: 0, minutes: 1, seconds: 0 }, mode: "scene-progression", rationale: "x".repeat(279) }) };
    const result = createHybridTemporalReasoner(longFallback).decide({ currentState, playerAction: undefined, completedNarrative: "<<chronicle:soon>>", activityPriors: [] });
    expect(result.rationale.length).toBeLessThanOrEqual(280);
    expect(result.rationale.trim().length).toBeGreaterThan(0);
  });
});
