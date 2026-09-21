import { describe, expect, it } from "vitest";
import { readModelTemporalSignal, stripModelTemporalSignal } from "../../../src/chronicle/reasoning/index.js";

describe("Model temporal signal (D-026, Cenário 1)", () => {
  it("reports absent when the narrator emits no directive", () => {
    expect(readModelTemporalSignal("The door creaks open.")).toEqual({ status: "rejected", reason: "absent" });
  });

  it("accepts an explicit none as recorded zero evidence, defaulting to medium confidence", () => {
    expect(readModelTemporalSignal("You test the handle. <<chronicle:none>>")).toEqual({
      status: "accepted",
      elapsedTime: { days: 0, hours: 0, minutes: 0, seconds: 0 },
      confidence: "medium"
    });
  });

  it("parses a duration directive with no upper bound on magnitude", () => {
    expect(readModelTemporalSignal("You sleep soundly. <<chronicle:PT9H15M>>")).toEqual({
      status: "accepted",
      elapsedTime: { days: 0, hours: 9, minutes: 15, seconds: 0 },
      confidence: "medium"
    });
    expect(readModelTemporalSignal("A training montage unfolds. <<chronicle:P365D>>")).toEqual({
      status: "accepted",
      elapsedTime: { days: 365, hours: 0, minutes: 0, seconds: 0 },
      confidence: "medium"
    });
  });

  it("carries the narrator's self-reported confidence through", () => {
    expect(readModelTemporalSignal("<<chronicle:PT2H,high>>")).toMatchObject({ status: "accepted", confidence: "high" });
    expect(readModelTemporalSignal("<<chronicle:PT2H,low>>")).toMatchObject({ status: "accepted", confidence: "low" });
    expect(readModelTemporalSignal("<<chronicle:none,low>>")).toMatchObject({ status: "accepted", confidence: "low" });
  });

  it("tolerates a space after the confidence comma", () => {
    expect(readModelTemporalSignal("<<chronicle:PT2H, high>>")).toMatchObject({ status: "accepted", confidence: "high" });
  });

  it("rejects a malformed directive value", () => {
    expect(readModelTemporalSignal("<<chronicle:soon>>")).toEqual({ status: "rejected", reason: "malformed" });
    expect(readModelTemporalSignal("<<chronicle:P>>")).toEqual({ status: "rejected", reason: "malformed" });
    expect(readModelTemporalSignal("<<chronicle:PT>>")).toEqual({ status: "rejected", reason: "malformed" });
  });

  it("rejects a well-formed duration paired with an unrecognized confidence token", () => {
    expect(readModelTemporalSignal("<<chronicle:PT2H,extremely-sure>>")).toEqual({ status: "rejected", reason: "malformed" });
  });

  it("takes the last directive as final intent when the narrator emits more than one", () => {
    expect(readModelTemporalSignal("<<chronicle:PT1H>> ... <<chronicle:PT2H,high>>")).toEqual({
      status: "accepted",
      elapsedTime: { days: 0, hours: 2, minutes: 0, seconds: 0 },
      confidence: "high"
    });
  });

  it("accepts weeks as a natural unit for a narrative time skip", () => {
    expect(readModelTemporalSignal("A long journey follows. <<chronicle:P2W,medium>>")).toEqual({
      status: "accepted",
      elapsedTime: { days: 14, hours: 0, minutes: 0, seconds: 0 },
      confidence: "medium"
    });
  });

  it("leniently accepts a duration missing the ISO P/T markers, e.g. '2h30m'", () => {
    expect(readModelTemporalSignal("<<chronicle:2h30m,medium>>")).toEqual({
      status: "accepted",
      elapsedTime: { days: 0, hours: 2, minutes: 30, seconds: 0 },
      confidence: "medium"
    });
    expect(readModelTemporalSignal("<<chronicle:3d,high>>")).toEqual({
      status: "accepted",
      elapsedTime: { days: 3, hours: 0, minutes: 0, seconds: 0 },
      confidence: "high"
    });
  });

  it("accepts a large magnitude directive without a cap (D-026 Cenário 1: fantasy time skips are legitimate)", () => {
    expect(readModelTemporalSignal("Years pass in the hermitage. <<chronicle:P3650D,high>>")).toEqual({
      status: "accepted",
      elapsedTime: { days: 3650, hours: 0, minutes: 0, seconds: 0 },
      confidence: "high"
    });
  });

  it("strips only the reserved directive, never ordinary parenthetical prose", () => {
    expect(stripModelTemporalSignal("He sighed (clearly exhausted) and sat down. <<chronicle:PT2H,high>>")).toBe(
      "He sighed (clearly exhausted) and sat down."
    );
  });

  it("strips a malformed or ambiguous directive too, so it never leaks to the player", () => {
    expect(stripModelTemporalSignal("Something happened. <<chronicle:soon>>")).toBe("Something happened.");
    expect(stripModelTemporalSignal("<<chronicle:PT1H>> and <<chronicle:PT2H>>")).toBe("and");
  });

  it("also strips near-miss control markers, without ever reading them as evidence", () => {
    expect(stripModelTemporalSignal("<<Chronicle:PT30M,high>>\nThey talk.")).toBe("They talk.");
    expect(stripModelTemporalSignal("<chronicle:PT30M,high>\nThey talk.")).toBe("They talk.");
    expect(stripModelTemporalSignal("<<chronicle:PT30M,high>\nThey talk.")).toBe("They talk.");
    expect(stripModelTemporalSignal("They talk. <<chronicle:PT30")).toBe("They talk.");
    expect(stripModelTemporalSignal("<<chronicle:start:14:3")).toBe("");
    expect(readModelTemporalSignal("<chronicle:PT30M,high>\nThey talk.")).toMatchObject({ status: "rejected", reason: "absent" });
    // Ordinary prose that only resembles the marker is preserved.
    expect(stripModelTemporalSignal("He read the chronicle: a long tale.")).toBe("He read the chronicle: a long tale.");
  });

  it("leaves text without any directive unchanged", () => {
    expect(stripModelTemporalSignal("The door creaks open.")).toBe("The door creaks open.");
  });
});
