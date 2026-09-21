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

  it.each([
    ["At the stroke of midnight, the vault door opens.", 0, 0],
    ["The witching hour settles over the village.", 2, 0],
    ["The world is still asleep before daybreak.", 4, 30],
    ["First light spills over the mountains.", 6, 0],
    ["The rooster crows as the sun crests the ridge.", 6, 0],
    ["Morning mist clings to the empty road.", 7, 0],
    ["The shops are just opening for the day.", 7, 0],
    ["After breakfast, morning light filters through the blinds.", 9, 30],
    ["It is nearing noon; the morning is nearly over.", 10, 30],
    ["The sun is directly overhead at high noon.", 12, 0],
    ["Lunch is over and the heat of the afternoon presses down.", 13, 30],
    ["The workday is still in session in mid-afternoon.", 15, 0],
    ["Long shadows creep across the street as the afternoon wanes.", 17, 30],
    ["The sky blushes pink and daylight fades.", 18, 30],
    ["Streetlights flicker on in the blue hour.", 19, 30],
    ["It is dinner time; windows glow warmly in the evening.", 20, 0],
    ["Moonlight fills the deserted streets.", 22, 0],
    ["The bars are closing in the late night.", 23, 0]
  ])("infers a representative conventional or figurative cue: %s", (context, hour, minute) => {
    expect(inferInitialClockFromContext(context, automatic)).toMatchObject({
      source: "scenario-context-rule", hour, minute
    });
  });

  it("accepts explicit clock displays even when narration also has a broad cue", () => {
    expect(inferInitialClockFromContext("At dusk, the computer display reads 03:17.", automatic)).toMatchObject({
      source: "scenario-context-rule", hour: 3, minute: 17
    });
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
    expect(readInitialClockSignal("02:15,high>>\nStory.")).toMatchObject({ source: "model-signal", hour: 2, minute: 15 });
    expect(stripInitialClockSignal("02:15,high>>\nStory.")).toBe("Story.");
    expect(inspectInitialClockSignal("Story only.")).toMatchObject({ status: "absent" });
    expect(inspectInitialClockSignal("<<chronicle:start:25:00>>")).toMatchObject({ status: "malformed" });
  });

  it("strips the 'none' completion the bootstrap prompt itself asks for when uncertain", () => {
    for (const control of ["none,high>>", "none>>", "None, medium >>", "22:15,low>>", "9:05>>", "12:00,unsure>>"]) {
      expect(stripInitialClockSignal(`${control}\nThe alley smells of rain.`)).toBe("The alley smells of rain.");
    }
    // Only a leading control line is removed; prose that merely mentions such text is untouched.
    expect(stripInitialClockSignal("The sign said none,high>> in chalk.")).toBe("The sign said none,high>> in chalk.");
    expect(stripInitialClockSignal("None of them moved.")).toBe("None of them moved.");
    expect(inspectInitialClockSignal("none,high>>\nStory.")).toMatchObject({ status: "absent" });
  });

  it("changes only the time of the automatic date", () => {
    const calibration = readInitialClockSignal("<<chronicle:start:02:15,high>>")!;
    expect(applyInitialClockCalibration(automatic, calibration)).toEqual({ year: 2026, month: 9, day: 19, hour: 2, minute: 15, second: 0 });
  });
});
