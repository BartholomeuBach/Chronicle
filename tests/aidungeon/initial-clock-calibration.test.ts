import { describe, expect, it } from "vitest";
import {
  applyInitialClockCalibration,
  inferInitialClockFromContext,
  inspectInitialClockSignal,
  readInitialClockSignal,
  stripInitialClockSignal
} from "../../src/aidungeon/initial-clock-calibration.js";

const automatic = { year: 2026, month: 9, day: 19, hour: 15, minute: 42, second: 31 } as const;

describe("initial clock calibration", () => {
  it("prioritizes explicit clocks over broad narrative cues", () => {
    expect(inferInitialClockFromContext("It was a dark morning, at 9:15 PM.", automatic)).toMatchObject({
      source: "scenario-context-rule", hour: 21, minute: 15
    });
  });

  it("covers direct and figurative opening-time language conservatively", () => {
    expect(inferInitialClockFromContext("It was deep in the night.", automatic)).toMatchObject({ hour: 2, minute: 0 });
    expect(inferInitialClockFromContext("It was a dark morning.", automatic)).toMatchObject({ hour: 7, minute: 0 });
    expect(inferInitialClockFromContext("Lengthening shadows crossed the ruined street.", automatic)).toMatchObject({ hour: 17, minute: 30 });
    expect(inferInitialClockFromContext("The streets glow with neon.", automatic)).toMatchObject({ hour: 20, minute: 0 });
  });

  it("keeps the automatic clock when the kickstart gives no defensible cue", () => {
    expect(inferInitialClockFromContext("A locked crate rests beside the door.", automatic)).toMatchObject({
      source: "automatic-clock", hour: 15, minute: 42
    });
  });

  it("accepts and strips only a valid last bootstrap tag", () => {
    expect(readInitialClockSignal("<<chronicle:start:02:15,high>>\nStory.")).toMatchObject({ source: "model-signal", hour: 2, minute: 15 });
    expect(readInitialClockSignal("<<chronicle:start:none>>\nStory.")).toBeUndefined();
    expect(readInitialClockSignal("<<chronicle:start:31:99>>\nStory.")).toBeUndefined();
    expect(stripInitialClockSignal("<<chronicle:start:02:15,high>>\nStory.")).toBe("Story.");
    expect(inspectInitialClockSignal("Story only.")).toMatchObject({ status: "absent" });
    expect(inspectInitialClockSignal("<<chronicle:start:25:00>>")).toMatchObject({ status: "malformed" });
  });

  it("changes only the time of the automatic date", () => {
    const calibration = readInitialClockSignal("<<chronicle:start:02:15,high>>")!;
    expect(applyInitialClockCalibration(automatic, calibration)).toEqual({ year: 2026, month: 9, day: 19, hour: 2, minute: 15, second: 0 });
  });
});
