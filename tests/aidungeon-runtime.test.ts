import { describe, expect, it } from "vitest";
import { createChronicleRuntime, initializeChronicleRuntime, nonEmptyText } from "../src/aidungeon/runtime.js";
import { initializeChronicleState } from "../src/chronicle/state/index.js";
import { createElapsedTime } from "../src/chronicle/calendar/index.js";
import type { TemporalReasoner } from "../src/chronicle/reasoning/index.js";
import type { AiDungeonStoryCard, StoryCardRuntime } from "../src/aidungeon/story-cards/index.js";

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

  it("processes an Output through the configured Reasoner and refreshes the Story Card", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    const cards: AiDungeonStoryCard[] = [];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };
    const reasoner: TemporalReasoner = { decide: () => ({ elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 15, seconds: 0 }), mode: "explicit-duration", rationale: "Fifteen minutes passed." }) };
    const runtime = createChronicleRuntime(reasoner);
    runtime.onInput("I wait.", { state, actionCount: 1, storyCards });
    expect(runtime.onOutput("Fifteen minutes pass.", { state, actionCount: 1, storyCards })).toBe("Fifteen minutes pass.");
    expect(cards[0].entry).toBe("Chronicle temporal state: 2026/04/13 19:47:00");
    expect(cards[0].description).toContain("Fifteen minutes passed.");
  });
});
