import { describe, expect, it } from "vitest";
import { createChronicleRuntime, initializeChronicleRuntime, nonEmptyText } from "../src/aidungeon/runtime.js";
import { initializeChronicleState } from "../src/chronicle/state/index.js";

describe("Phase 0 AI Dungeon runtime boundary", () => {
  it("preserves ordinary narrative text", () => {
    expect(createChronicleRuntime().onOutput("The door opens.", { state: {} })).toBe("The door opens.");
  });

  it("prevents an empty hook result", () => {
    expect(nonEmptyText("")).toBe("\u200B");
  });

  it("captures input and injects only current temporal state into Context", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    const runtime = createChronicleRuntime();
    expect(runtime.onInput("I walk.", { state })).toBe("I walk.");
    expect(runtime.onContext("Base context.", { state })).toBe("Chronicle temporal state: 2026/04/13 19:32:00\nBase context.");
    expect(JSON.stringify(state)).toContain("I walk.");
  });
});
