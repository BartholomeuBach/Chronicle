import { describe, expect, it } from "vitest";
import { createElapsedTime } from "../../../src/chronicle/calendar/index.js";
import { recordTemporalDecision, createTemporalLedger } from "../../../src/chronicle/ledger/index.js";
import type { TemporalReasonerDecision } from "../../../src/chronicle/reasoning/index.js";
import { initializeChronicleState } from "../../../src/chronicle/state/index.js";
import {
  createChronicleStoryCardProjection,
  findChronicleStoryCardIndex,
  MAX_STORY_CARD_LEDGER_RECORDS,
  syncChronicleStoryCard,
  type AiDungeonStoryCard,
  type StoryCardRuntime
} from "../../../src/aidungeon/story-cards/index.js";

const state = () => initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 });
const decision: TemporalReasonerDecision = {
  elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 15, seconds: 0 }),
  mode: "explicit-duration",
  rationale: "The narrative explicitly states fifteen minutes."
};

const ledgerWithOneRecord = () => {
  const previousState = state();
  return recordTemporalDecision({
    state: previousState,
    ledger: createTemporalLedger(),
    beatId: "output-001",
    decision,
    actionInterpretation: "The party walks to the inn.",
    confidence: "high"
  });
};

const fakeRuntime = (cards: AiDungeonStoryCard[] = []): StoryCardRuntime => ({
  storyCards: cards,
  addStoryCard(keys, entry, type) {
    cards.push({ keys, entry, type });
    return cards.length - 1;
  },
  updateStoryCard(index, keys, entry, type) {
    const existing = cards[index];
    cards[index] = { ...existing, keys, entry, type };
  }
});

describe("Chronicle Story Card projection", () => {
  it("keeps the entry minimal and puts Ledger history only in Notes", () => {
    const recorded = ledgerWithOneRecord();
    const projection = createChronicleStoryCardProjection(recorded.state, recorded.ledger);

    expect(projection.entry).toBe("Chronicle temporal state: 2026/04/13 19:47:00");
    expect(projection.entry).not.toContain("walks to the inn");
    expect(JSON.parse(projection.notes)).toMatchObject({
      chronicleTemporalLedger: { schemaVersion: 1, records: [{ beatId: "output-001", confidence: "high" }] }
    });
  });

  it("finds only the dedicated Chronicle card", () => {
    expect(findChronicleStoryCardIndex([{ keys: "other, chronicle", entry: "", type: "story" }])).toBeUndefined();
    expect(findChronicleStoryCardIndex([{ keys: "other, chronicle-temporal-state", entry: "", type: "story" }])).toBe(0);
  });

  it("creates, updates, and overwrites malformed Notes from canonical data", () => {
    const recorded = ledgerWithOneRecord();
    const cards: AiDungeonStoryCard[] = [];
    const runtime = fakeRuntime(cards);
    const created = syncChronicleStoryCard(runtime, recorded.state, recorded.ledger);
    cards[0].description = "manually corrupted";
    const updated = syncChronicleStoryCard(runtime, recorded.state, recorded.ledger);

    expect(created).toMatchObject({ status: "created", cardIndex: 0, notesWriteAttempted: true });
    expect(updated).toMatchObject({ status: "updated", cardIndex: 0, notesWriteAttempted: true });
    expect(cards).toHaveLength(1);
    expect(() => JSON.parse(cards[0].description ?? "")).not.toThrow();
  });

  it("recovers a card created by a duplicate-key race without creating another one", () => {
    const recorded = ledgerWithOneRecord();
    const cards: AiDungeonStoryCard[] = [];
    const runtime: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) {
        cards.push({ keys, entry, type });
        return false;
      },
      updateStoryCard(index, keys, entry, type) {
        cards[index] = { ...cards[index], keys, entry, type };
      }
    };

    expect(syncChronicleStoryCard(runtime, recorded.state, recorded.ledger)).toMatchObject({
      status: "recovered",
      cardIndex: 0
    });
    expect(cards).toHaveLength(1);
  });

  it("limits the Notes projection even when the canonical Ledger is larger", () => {
    let recorded = ledgerWithOneRecord();
    for (let index = 1; index <= MAX_STORY_CARD_LEDGER_RECORDS; index += 1) {
      recorded = recordTemporalDecision({
        state: recorded.state,
        ledger: recorded.ledger,
        beatId: `output-${index}`,
        decision: { ...decision, elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }) },
        actionInterpretation: "No additional time.",
        confidence: "low"
      });
    }
    const notes = JSON.parse(createChronicleStoryCardProjection(recorded.state, recorded.ledger).notes);
    expect(notes.chronicleTemporalLedger.records).toHaveLength(MAX_STORY_CARD_LEDGER_RECORDS);
    expect(notes.chronicleTemporalLedger.records[0].beatId).toBe("output-1");
  });
});
