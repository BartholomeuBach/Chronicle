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
    const cards: AiDungeonStoryCard[] = [configurationCard()];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };
    expect(runtime.onInput("I walk.", { state, storyCards })).toBe("I walk.");
    expect(runtime.onContext("Base context.", { state, storyCards })).toBe("[Chronicle]\nCurrent story time: 2026/04/13 19:32:00.\nTime of day: evening.\nBase context.");
    expect(JSON.stringify(state)).toContain("I walk.");
  });

  it("preserves existing Context when the Chronicle projection would exceed the budget", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    const cards = [configurationCard()];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };
    expect(createChronicleRuntime().onContext("Existing context", { state, maxChars: 20, storyCards })).toBe("Existing context");
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
    expect(cards[1].entry).toBe("[Chronicle]\nCurrent story time: 2026/04/13 19:47:00.\nTime of day: evening.");
    expect(cards[1].description).toContain("Fifteen minutes passed.");
  });

  it("notifies the player only when an accepted Output crosses a time-of-day boundary", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 20, minute: 55, second: 0 }));
    const cards: AiDungeonStoryCard[] = [configurationCard()];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };
    const reasoner: TemporalReasoner = { decide: () => ({ elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 8, seconds: 0 }), mode: "explicit-duration", rationale: "Eight minutes passed." }) };
    const runtime = createChronicleRuntime(reasoner);

    expect(runtime.onOutput("Eight minutes pass.", { state, actionCount: 1, storyCards })).toBe("Eight minutes pass.");
    expect(state.message).toBe("🌙 Chronicle — Nightfall\nStory time: 2026/04/13 21:03:00.");
    expect(runtime.onInput("I look outside.", { state, actionCount: 2, storyCards })).toBe("I look outside.");
    expect(state.message).toBeUndefined();
  });

  it("does not replace another script's message when Chronicle has no matching transient notice", () => {
    const state: Record<string, unknown> = { message: "Quest updated." };
    const cards = [configurationCard("Chronicle Enabled: false")];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };
    createChronicleRuntime().onInput("I wait.", { state, storyCards });
    expect(state.message).toBe("Quest updated.");
  });

  it("pauses safely when persisted Chronicle state is invalid", () => {
    const state: Record<string, unknown> = { chronicleRuntime: { chronicleState: {} } };
    const cards = [configurationCard()];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };
    expect(createChronicleRuntime().onContext("Base context.", { state, storyCards })).toBe("Base context.");
    expect(state.chronicleRuntime).toEqual({ chronicleState: {} });
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("paused");
  });

  it("pauses when a persisted Ledger record is malformed", () => {
    const state: Record<string, unknown> = { chronicleRuntime: { schemaVersion: 1, chronicleState: { currentDateTime: { year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }, processedBeatIds: [] }, ledger: { records: [{ schemaVersion: 1, beatId: "bad", previousState: {}, elapsedTime: {}, mode: "bad", reasoning: "x", confidence: "high", resultingState: {} }] } } };
    const cards = [configurationCard()];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };
    createChronicleRuntime().onContext("Base context.", { state, storyCards });
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("invalid");
  });

  it("pauses instead of initializing from an invalid Manual configuration", () => {
    const state: Record<string, unknown> = {};
    const cards = [configurationCard("Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: long ago")];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };

    expect(createChronicleRuntime().onContext("Base context.", { state, storyCards })).toBe("Base context.");
    expect(state.chronicleRuntime).toBeUndefined();
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("invalid start year");
  });

  it("pauses when persisted ledger snapshots do not form a coherent timeline", () => {
    const state: Record<string, unknown> = { chronicleRuntime: {
      schemaVersion: 1,
      chronicleState: { currentDateTime: { year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }, processedBeatIds: [] },
      ledger: { records: [{ schemaVersion: 1, beatId: "output-1", previousState: { currentDateTime: { year: 2026, month: 4, day: 13, hour: 19, minute: 0, second: 0 } }, elapsedTime: { days: 0, hours: 0, minutes: 15, seconds: 0 }, mode: "explicit-duration", reasoning: "Fifteen minutes passed.", actionInterpretation: "Fifteen minutes passed.", confidence: "high", resultingState: { currentDateTime: { year: 2026, month: 4, day: 13, hour: 19, minute: 20, second: 0 } } }] }
    } };
    const cards = [configurationCard()];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };
    createChronicleRuntime().onContext("Base context.", { state, storyCards });
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("invalid");
  });

  it("does not reinitialize an active story when configuration initialization fields change", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    const cards = [configurationCard("Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 1434\nStart Month: 9\nStart Day: 18")];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };

    createChronicleRuntime().onContext("Base context.", { state, storyCards });
    expect((state.chronicleRuntime as { chronicleState: { currentDateTime: { year: number } } }).chronicleState.currentDateTime.year).toBe(2026);
  });

  it("repairs duplicate canonical cards in Context only after the explicit configuration request", () => {
    const state: Record<string, unknown> = {};
    const cards: AiDungeonStoryCard[] = [
      configurationCard("Chronicle Enabled: true\nRepair Chronicle Card: true"),
      { keys: "chronicle-temporal-state", entry: "old", type: "story" },
      { keys: "chronicle-temporal-state", entry: "duplicate", type: "story" }
    ];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; },
      removeStoryCard(index) { cards.splice(index, 1); }
    };

    createChronicleRuntime().onContext("Base context.", { state, storyCards });
    expect(cards.filter((card) => card.keys === "chronicle-temporal-state")).toHaveLength(1);
  });
});
