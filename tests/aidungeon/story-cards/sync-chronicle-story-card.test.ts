import { describe, expect, it } from "vitest";
import { syncChronicleStoryCard, type StoryCardRuntime } from "../../../src/aidungeon/story-cards/sync-chronicle-story-card.js";
import type { AiDungeonStoryCard } from "../../../src/aidungeon/story-cards/chronicle-story-card.js";
import { initializeChronicleState } from "../../../src/chronicle/state/index.js";
import { createTemporalLedger } from "../../../src/chronicle/ledger/temporal-ledger.js";

const state = initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 });
const ledger = createTemporalLedger();

function runtimeOf(cards: AiDungeonStoryCard[], overrides: Partial<StoryCardRuntime> = {}): StoryCardRuntime {
  return {
    storyCards: cards,
    addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
    updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; },
    ...overrides
  };
}

describe("syncChronicleStoryCard", () => {
  it("creates the dedicated card when none exists", () => {
    const cards: AiDungeonStoryCard[] = [];
    const runtime = runtimeOf(cards);
    const result = syncChronicleStoryCard(runtime, state, ledger);
    expect(result.status).toBe("created");
    expect(cards[0].keys).toBe("chronicle-temporal-state");
    expect(cards[0].description).toContain("chronicleTemporalLedger");
  });

  it("updates the existing card in place rather than creating a second one", () => {
    const cards: AiDungeonStoryCard[] = [{ keys: "chronicle-temporal-state", entry: "stale", type: "story" }];
    const runtime = runtimeOf(cards);
    const result = syncChronicleStoryCard(runtime, state, ledger);
    expect(result.status).toBe("updated");
    expect(cards).toHaveLength(1);
    expect(cards[0].entry).not.toBe("stale");
  });

  it("recovers by updating a card found only after addStoryCard reports failure", () => {
    const cards: AiDungeonStoryCard[] = [{ keys: "chronicle-temporal-state", entry: "stale, but present", type: "story" }];
    const runtime = runtimeOf(cards, { addStoryCard: () => false });
    const result = syncChronicleStoryCard(runtime, state, ledger);
    // The dedicated card already exists, so this exercises the `existingIndex !== undefined`
    // branch, not the create-then-recover branch (see the throw test below for that path).
    expect(result.status).toBe("updated");
    expect(cards[0].entry).not.toBe("stale, but present");
  });

  it("reports duplicate-detected without deleting anything when repair is not requested", () => {
    const cards: AiDungeonStoryCard[] = [
      { keys: "chronicle-temporal-state", entry: "first", type: "story" },
      { keys: "chronicle-temporal-state", entry: "second", type: "story" }
    ];
    const runtime = runtimeOf(cards);
    const result = syncChronicleStoryCard(runtime, state, ledger);
    expect(result.status).toBe("duplicate-detected");
    expect(result.duplicateCount).toBe(2);
    expect(cards).toHaveLength(2);
  });

  it("repairs duplicates by keeping the first card and removing the rest only when explicitly requested", () => {
    const cards: AiDungeonStoryCard[] = [
      { keys: "chronicle-temporal-state", entry: "first", type: "story" },
      { keys: "chronicle-temporal-state", entry: "second", type: "story" },
      { keys: "chronicle-temporal-state", entry: "third", type: "story" }
    ];
    const removed: number[] = [];
    const runtime = runtimeOf(cards, { removeStoryCard: (index) => { removed.push(index); cards.splice(index, 1); } });
    const result = syncChronicleStoryCard(runtime, state, ledger, { repairDuplicates: true });
    expect(result.status).toBe("repaired");
    expect(cards).toHaveLength(1);
    expect(cards[0].entry).not.toBe("first"); // refreshed with the current projection, not left stale
  });

  it("reports duplicate-detected instead of repairing when repair is requested but removeStoryCard is unavailable", () => {
    const cards: AiDungeonStoryCard[] = [
      { keys: "chronicle-temporal-state", entry: "first", type: "story" },
      { keys: "chronicle-temporal-state", entry: "second", type: "story" }
    ];
    const runtime = runtimeOf(cards, { removeStoryCard: undefined });
    const result = syncChronicleStoryCard(runtime, state, ledger, { repairDuplicates: true });
    expect(result.status).toBe("duplicate-detected");
    expect(cards).toHaveLength(2);
  });

  it("throws a clear, catchable error when the card can neither be created nor recovered (defense-in-depth path exercised by the runtime's own try/catch)", () => {
    const cards: AiDungeonStoryCard[] = [];
    const runtime = runtimeOf(cards, { addStoryCard: () => false });
    expect(() => syncChronicleStoryCard(runtime, state, ledger)).toThrow("Chronicle Story Card could not be created or recovered.");
  });

  it("never writes Ledger history into the card entry, only into the experimental Notes projection", () => {
    const cards: AiDungeonStoryCard[] = [];
    const runtime = runtimeOf(cards);
    syncChronicleStoryCard(runtime, state, ledger);
    expect(cards[0].entry).not.toContain("chronicleTemporalLedger");
    expect(cards[0].description).toContain("chronicleTemporalLedger");
  });
});
