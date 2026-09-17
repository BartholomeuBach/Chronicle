import { describe, expect, it } from "vitest";
import {
  CHRONICLE_CONFIGURATION_DEFAULT_ENTRY,
  CHRONICLE_CONFIGURATION_KEY,
  CHRONICLE_CONFIGURATION_NOTES,
  CHRONICLE_CONFIGURATION_TITLE,
  CHRONICLE_CONFIGURATION_TYPE,
  ensureChronicleConfigurationCard,
  findChronicleConfigurationCardIndex,
  readChronicleConfiguration,
  runtimeDateTime
} from "../../../src/aidungeon/story-cards/index.js";
import type { AiDungeonStoryCard, StoryCardRuntime } from "../../../src/aidungeon/story-cards/index.js";

/** A legacy pre-migration card: identified by `keys`, settings live in Notes/description. */
const legacyCard = (description: string): AiDungeonStoryCard => ({ keys: "chronicle-configuration", entry: "", type: "story", description });
/** A canonical card: identified by title, settings live in Entry. */
const canonicalCard = (entry: string, description = CHRONICLE_CONFIGURATION_NOTES): AiDungeonStoryCard => ({
  keys: CHRONICLE_CONFIGURATION_KEY,
  title: CHRONICLE_CONFIGURATION_TITLE,
  entry,
  type: CHRONICLE_CONFIGURATION_TYPE,
  description
});

function fakeRuntime(cards: AiDungeonStoryCard[]): StoryCardRuntime {
  return {
    storyCards: cards,
    addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
    updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
  };
}

describe("Chronicle Configuration Story Card: reading settings", () => {
  it("is disabled when no configuration card exists", () => {
    expect(readChronicleConfiguration([])).toEqual({ enabled: false, mode: "automatic", repairChronicleCard: false, aiTemporalSignal: true });
  });
  it("reads settings from a canonical card's Entry", () => {
    const entry = "Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 1342\nStart Month: 9\nStart Day: 17\nStart Hour: 8\nStart Minute:\nStart Second:";
    expect(readChronicleConfiguration([canonicalCard(entry)], { year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 45 })).toMatchObject({
      enabled: true, mode: "manual", initialDateTime: { year: 1342, month: 9, day: 17, hour: 8, minute: 32, second: 45 }
    });
  });
  it("still reads settings from a legacy card's Notes when it has not been migrated yet", () => {
    expect(readChronicleConfiguration([legacyCard("Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 1342\nStart Month: 9\nStart Day: 17\nStart Hour: 8")], { year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 45 })).toMatchObject({ enabled: true, mode: "manual", initialDateTime: { year: 1342, month: 9, day: 17, hour: 8, minute: 32, second: 45 } });
  });
  it("prefers Entry over legacy Notes when both are present", () => {
    const card: AiDungeonStoryCard = { ...canonicalCard("Chronicle Enabled: false"), description: "Chronicle Enabled: true" };
    expect(readChronicleConfiguration([card])).toMatchObject({ enabled: false });
  });
  it("completes blank Manual fields from the current runtime datetime", () => {
    expect(readChronicleConfiguration([canonicalCard("Initialization Mode: Manual\nStart Year: 1434")], { year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 45 })).toMatchObject({
      initialDateTime: { year: 1434, month: 4, day: 13, hour: 19, minute: 32, second: 45 }
    });
  });
  it("reports an invalid Manual value instead of silently changing the requested date", () => {
    expect(readChronicleConfiguration([canonicalCard("Initialization Mode: Manual\nStart Year: long ago")], { year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 45 })).toMatchObject({
      mode: "manual", error: "Manual Chronicle configuration has an invalid start year value."
    });
  });
  it("defaults an existing card to enabled automatic mode and allows pause", () => {
    expect(readChronicleConfiguration([canonicalCard("")])).toEqual({ enabled: true, mode: "automatic", repairChronicleCard: false, aiTemporalSignal: true });
    expect(readChronicleConfiguration([canonicalCard("Chronicle Enabled: false")])).toEqual({ enabled: false, mode: "automatic", repairChronicleCard: false, aiTemporalSignal: true });
  });
  it("disables the AI-signaled evidence tier only on explicit request", () => {
    expect(readChronicleConfiguration([canonicalCard("AI Temporal Signal: false")])).toMatchObject({ aiTemporalSignal: false });
    expect(readChronicleConfiguration([canonicalCard("")])).toMatchObject({ aiTemporalSignal: true });
  });
  it("reads an explicit duplicate-card repair request, and the Notes stay documentation-only", () => {
    expect(readChronicleConfiguration([canonicalCard("Repair Chronicle Card: true")])).toMatchObject({ repairChronicleCard: true });
    expect(CHRONICLE_CONFIGURATION_NOTES).toContain("do not change");
    expect(CHRONICLE_CONFIGURATION_NOTES).not.toContain("Chronicle Enabled: false"); // no settings values leak into Notes
  });
  it("uses New York civil time for automatic and blank Manual components", () => {
    expect(runtimeDateTime(new Date("2026-03-08T06:59:00Z"))).toEqual({ year: 2026, month: 3, day: 8, hour: 1, minute: 59, second: 0 });
    expect(runtimeDateTime(new Date("2026-03-08T07:00:00Z"))).toEqual({ year: 2026, month: 3, day: 8, hour: 3, minute: 0, second: 0 });
    expect(runtimeDateTime(new Date("2026-11-01T06:00:00Z"))).toEqual({ year: 2026, month: 11, day: 1, hour: 1, minute: 0, second: 0 });
  });
});

describe("findChronicleConfigurationCardIndex", () => {
  it("matches by canonical title first", () => {
    expect(findChronicleConfigurationCardIndex([{ keys: "unrelated", entry: "", type: "class", title: "Configure Chronicle" }])).toBe(0);
  });
  it("falls back to the legacy keys identifier when no title matches", () => {
    expect(findChronicleConfigurationCardIndex([legacyCard("")])).toBe(0);
  });
  it("finds nothing when neither the title nor the legacy key is present", () => {
    expect(findChronicleConfigurationCardIndex([{ keys: "unrelated", entry: "", type: "class", title: "Something else" }])).toBeUndefined();
  });
  it("prefers a title match over an unrelated card that only happens to hold the legacy key text elsewhere", () => {
    const cards = [{ keys: "other", entry: "", type: "class" }, canonicalCard("")];
    expect(findChronicleConfigurationCardIndex(cards)).toBe(1);
  });
});

describe("ensureChronicleConfigurationCard: auto-creation and migration", () => {
  it("creates the canonical card automatically when none exists", () => {
    const cards: AiDungeonStoryCard[] = [];
    const result = ensureChronicleConfigurationCard(fakeRuntime(cards));

    expect(result.status).toBe("created");
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe(CHRONICLE_CONFIGURATION_TITLE);
    expect(cards[0].type).toBe(CHRONICLE_CONFIGURATION_TYPE);
    expect(cards[0].keys).toBe(CHRONICLE_CONFIGURATION_KEY);
    expect(cards[0].entry).toBe(CHRONICLE_CONFIGURATION_DEFAULT_ENTRY);
    expect(cards[0].description).toBe(CHRONICLE_CONFIGURATION_NOTES);
    expect(readChronicleConfiguration(cards)).toMatchObject({ enabled: true, mode: "automatic" });
  });

  it("leaves an already-canonical card untouched, preserving the creator's own settings", () => {
    const cards: AiDungeonStoryCard[] = [canonicalCard("Chronicle Enabled: false\nInitialization Mode: Manual\nStart Year: 1500")];
    const before = { ...cards[0] };
    const result = ensureChronicleConfigurationCard(fakeRuntime(cards));

    expect(result.status).toBe("existing");
    expect(cards[0]).toEqual(before);
  });

  it("migrates a legacy keys-identified card: sets title/type and moves Notes-based settings into Entry", () => {
    const cards: AiDungeonStoryCard[] = [legacyCard("Chronicle Enabled: false\nInitialization Mode: Manual\nStart Year: 1500\nAI Temporal Signal: false")];
    const result = ensureChronicleConfigurationCard(fakeRuntime(cards));

    expect(result.status).toBe("migrated");
    expect(cards[0].title).toBe(CHRONICLE_CONFIGURATION_TITLE);
    expect(cards[0].type).toBe(CHRONICLE_CONFIGURATION_TYPE);
    expect(cards[0].keys.split(",").map((key) => key.trim())).toContain(CHRONICLE_CONFIGURATION_KEY);
    expect(cards[0].entry).toContain("Chronicle Enabled: false");
    expect(cards[0].entry).toContain("Start Year: 1500");
    expect(cards[0].entry).toContain("AI Temporal Signal: false");
    expect(cards[0].description).toBe(CHRONICLE_CONFIGURATION_NOTES);
    // The migrated settings are preserved through the normal read path, not just visually in Entry.
    expect(readChronicleConfiguration(cards)).toMatchObject({ enabled: false, mode: "manual", aiTemporalSignal: false });
  });

  it("does not overwrite a creator's own unrelated Notes text when Entry already has recognized settings", () => {
    const cards: AiDungeonStoryCard[] = [canonicalCard("Chronicle Enabled: true", "My own reminder: ask about the missing amulet next session.")];
    const result = ensureChronicleConfigurationCard(fakeRuntime(cards));

    expect(result.status).toBe("existing");
    expect(cards[0].description).toBe("My own reminder: ask about the missing amulet next session.");
  });

  it("is idempotent: a second ensure call after migration reports 'existing', not 'migrated' again", () => {
    const cards: AiDungeonStoryCard[] = [legacyCard("Chronicle Enabled: false")];
    const runtime = fakeRuntime(cards);
    ensureChronicleConfigurationCard(runtime);
    const second = ensureChronicleConfigurationCard(runtime);
    expect(second.status).toBe("existing");
  });

  it("recovers by finding the card even when addStoryCard reports duplicate-key failure", () => {
    const cards: AiDungeonStoryCard[] = [];
    const runtime: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return false; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };
    const result = ensureChronicleConfigurationCard(runtime);
    expect(result.cardIndex).toBe(0);
    expect(cards[0].title).toBe(CHRONICLE_CONFIGURATION_TITLE);
  });

  it("finds the canonical card by title even if a duplicate card also carries the legacy key", () => {
    const cards: AiDungeonStoryCard[] = [
      legacyCard("Chronicle Enabled: false"),
      canonicalCard("Chronicle Enabled: true")
    ];
    expect(findChronicleConfigurationCardIndex(cards)).toBe(1);
    expect(readChronicleConfiguration(cards)).toMatchObject({ enabled: true });
  });
});
