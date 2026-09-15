import { describe, expect, it } from "vitest";
import { CHRONICLE_RUNTIME_ERROR_KEY, createChronicleRuntime, initializeChronicleRuntime, nonEmptyText } from "../src/aidungeon/runtime.js";
import { initializeChronicleState } from "../src/chronicle/state/index.js";
import { createElapsedTime } from "../src/chronicle/calendar/index.js";
import type { TemporalReasoner } from "../src/chronicle/reasoning/index.js";
import type { AiDungeonStoryCard, StoryCardRuntime } from "../src/aidungeon/story-cards/index.js";

const configurationCard = (notes = "Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 2026\nStart Month: 4\nStart Day: 13\nStart Hour: 19\nStart Minute: 32\nStart Second: 0"): AiDungeonStoryCard => ({ keys: "chronicle-configuration", entry: "", type: "story", description: notes });

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
    const cards = [configurationCard()];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };
    expect(runtime.onInput("I walk.", { state, storyCards })).toBe("I walk.");
    expect(runtime.onContext("Base context.", { state, storyCards })).toBe("Chronicle temporal state: 2026/04/13 19:32:00\nBase context.");
    expect(JSON.stringify(state)).toContain("I walk.");
  });

  it("processes an Output through the configured Reasoner and refreshes the Story Card", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    const cards: AiDungeonStoryCard[] = [configurationCard()];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };
    const reasoner: TemporalReasoner = { decide: () => ({ elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 15, seconds: 0 }), mode: "explicit-duration", rationale: "Fifteen minutes passed." }) };
    const runtime = createChronicleRuntime(reasoner);
    runtime.onInput("I wait.", { state, actionCount: 1, storyCards });
    expect(runtime.onOutput("Fifteen minutes pass.", { state, actionCount: 1, storyCards })).toBe("Fifteen minutes pass.");
    expect(cards[1].entry).toBe("Chronicle temporal state: 2026/04/13 19:47:00");
    expect(cards[1].description).toContain("Fifteen minutes passed.");
  });

  it("pauses safely when persisted Chronicle state is invalid", () => {
    const state: Record<string, unknown> = { chronicleRuntime: { chronicleState: {} } };
    const cards = [configurationCard()];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };
    expect(createChronicleRuntime().onContext("Base context.", { state, storyCards })).toBe("Base context.");
    expect(state.chronicleRuntime).toEqual({ chronicleState: {} });
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("paused");
  });
});
