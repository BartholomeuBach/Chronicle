import { describe, expect, it } from "vitest";
import { nonEmptyText, passthroughRuntime } from "../src/aidungeon/runtime.js";

describe("Phase 0 AI Dungeon runtime boundary", () => {
  it("preserves ordinary narrative text", () => {
    expect(passthroughRuntime.onOutput("The door opens.")).toBe("The door opens.");
  });

  it("prevents an empty hook result", () => {
    expect(nonEmptyText("")).toBe("\u200B");
  });
});
