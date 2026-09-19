import { describe, expect, it } from "vitest";
import { CHRONICLE_RUNTIME_ERROR_KEY, createChronicleRuntime, initializeChronicleRuntime, nonEmptyText } from "../src/aidungeon/runtime.js";
import { initializeChronicleState } from "../src/chronicle/state/index.js";
import { createElapsedTime } from "../src/chronicle/calendar/index.js";
import { createPlayerActionCorroboratedReasoner, ruleBasedTemporalReasoner } from "../src/chronicle/reasoning/index.js";
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

  it("captures input and appends only current temporal state to Context", () => {
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
    const contextualized = runtime.onContext("Base context.", { state, storyCards });
    expect(contextualized).toContain("Base context.\n[Chronicle]\nCurrent story time: 2026/04/13 19:32:00.\nTime of day: evening.");
    expect(contextualized).toContain("# CHRONICLE TEMPORAL REPORT — REQUIRED");
    expect(contextualized).toContain("<<chronicle:PT#D#H#M#S,high|medium|low>>");
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

  it("does not let an unexpected Story Card sync failure crash the Context hook (defense in depth, 2026-09-16)", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    const cards: AiDungeonStoryCard[] = [
      configurationCard(),
      { keys: "chronicle-temporal-state", entry: "existing", type: "story" },
      { keys: "chronicle-temporal-state", entry: "duplicate", type: "story" }
    ];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard: () => false,
      updateStoryCard: () => { throw new Error("simulated platform failure"); }
    };
    expect(createChronicleRuntime().onContext("Base context.", { state, storyCards })).toContain(
      "Base context.\n[Chronicle]\nCurrent story time: 2026/04/13 19:32:00.\nTime of day: evening."
    );
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("Story Card sync failed unexpectedly");
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("Canonical time is unaffected");
  });

  it("preserves an already-applied canonical time update even when the Story Card sync throws afterward (locks in the 2026-09-15 fix)", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    const cards: AiDungeonStoryCard[] = [
      configurationCard(),
      { keys: "chronicle-temporal-state", entry: "existing", type: "story" },
      { keys: "chronicle-temporal-state", entry: "duplicate", type: "story" }
    ];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard: () => false,
      updateStoryCard: () => { throw new Error("simulated platform failure"); }
    };
    const reasoner: TemporalReasoner = { decide: () => ({ elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 15, seconds: 0 }), mode: "explicit-duration", rationale: "Fifteen minutes passed." }) };
    const runtime = createChronicleRuntime(reasoner);
    runtime.onInput("I wait.", { state, actionCount: 1, storyCards });
    expect(runtime.onOutput("Fifteen minutes pass.", { state, actionCount: 1, storyCards })).toBe("Fifteen minutes pass.");
    const runtimeState = state.chronicleRuntime as { chronicleState: { currentDateTime: { hour: number; minute: number } } };
    expect(runtimeState.chronicleState.currentDateTime).toMatchObject({ hour: 19, minute: 47 });
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("unexpected error evaluating the completed beat");
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

  it("never injects the AI-signal instruction while paused on invalid persisted state (audit N1, 2026-09-15)", () => {
    const state: Record<string, unknown> = { chronicleRuntime: { chronicleState: {} } };
    const cards = [configurationCard()];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };
    createChronicleRuntime().onContext("Base context.", { state, storyCards });
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("paused");
    expect((state.memory as { authorsNote?: string } | undefined)?.authorsNote ?? "").not.toContain("<<chronicle:");
  });

  it("never crashes Output on an out-of-range delta; surfaces a diagnostic that self-clears on the next healthy beat (regression, 2026-09-15)", () => {
    const state: Record<string, unknown> = {};
    const cards: AiDungeonStoryCard[] = [configurationCard("Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 9999\nStart Month: 12\nStart Day: 30\nStart Hour: 12\nStart Minute: 0\nStart Second: 0")];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };
    const runtime = createChronicleRuntime(ruleBasedTemporalReasoner);

    expect(() => runtime.onOutput("Years pass in an instant. <<chronicle:P365D,high>>", { state, actionCount: 1, storyCards })).not.toThrow();
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("supported year range");
    const runtimeStateAfterOverflow = (state.chronicleRuntime as { chronicleState: { currentDateTime: { year: number } } }).chronicleState;
    expect(runtimeStateAfterOverflow.currentDateTime.year).toBe(9999); // canonical time left completely unchanged

    // A subsequent, ordinary beat succeeds normally and clears the stale diagnostic.
    runtime.onOutput("You pause for a moment.", { state, actionCount: 2, storyCards });
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toBeUndefined();
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

  it("does not rebuild the clock when Initialization Mode itself changes after the timeline has started (D-031)", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    // The card now says Automatic, having been Manual (or vice versa) at the moment of first init -- switching modes afterward must be a no-op.
    const cards = [configurationCard("Chronicle Enabled: true\nInitialization Mode: Automatic")];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };

    createChronicleRuntime().onContext("Base context.", { state, storyCards });
    const runtimeState = (state.chronicleRuntime as { chronicleState: { currentDateTime: { year: number; hour: number } } }).chronicleState;
    expect(runtimeState.currentDateTime).toMatchObject({ year: 2026, hour: 19 }); // unchanged, not reseeded from "now"
  });

  it("recreates a missing configuration card as recovery, without resetting an already-initialized timeline (D-031)", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    // The configuration card vanished (e.g. accidentally deleted); auto-create is recovery-only here, not the normal onboarding path.
    const cards: AiDungeonStoryCard[] = [];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };

    createChronicleRuntime().onContext("Base context.", { state, storyCards });

    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("Configure Chronicle"); // recovered, not skipped
    const runtimeState = (state.chronicleRuntime as { chronicleState: { currentDateTime: { year: number; hour: number } } }).chronicleState;
    expect(runtimeState.currentDateTime).toMatchObject({ year: 2026, hour: 19 }); // the existing timeline survives the recreated card untouched
  });

  it("keeps runtime settings (Enabled, AI Temporal Signal, Repair) effective after the timeline has initialized (D-031)", () => {
    const state: Record<string, unknown> = {};
    initializeChronicleRuntime(state, initializeChronicleState({ year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 0 }));
    const cards = [configurationCard("Chronicle Enabled: true\nAI Temporal Signal: false")];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };
    const runtime = createChronicleRuntime(ruleBasedTemporalReasoner);

    // AI Temporal Signal: false, post-init, still suppresses the injected instruction.
    runtime.onContext("Base context.", { state, storyCards });
    expect((state.memory as { authorsNote?: string } | undefined)?.authorsNote ?? "").not.toContain("<<chronicle:");

    // Chronicle Enabled: false, post-init, still pauses processing without deleting runtime state.
    cards[0] = configurationCard("Chronicle Enabled: false");
    runtime.onOutput("Hours pass.", { state, actionCount: 1, storyCards });
    const runtimeState = (state.chronicleRuntime as { chronicleState: { currentDateTime: { hour: number } } }).chronicleState;
    expect(runtimeState.currentDateTime.hour).toBe(19); // unchanged: the disabled beat never applied
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

  it("clears the duplicate-card runtime error once the creator repairs it (regression: it used to linger forever)", () => {
    const state: Record<string, unknown> = {};
    const cards: AiDungeonStoryCard[] = [
      configurationCard("Chronicle Enabled: true"),
      { keys: "chronicle-temporal-state", entry: "old", type: "story" },
      { keys: "chronicle-temporal-state", entry: "duplicate", type: "story" }
    ];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; },
      removeStoryCard(index) { cards.splice(index, 1); }
    };
    const runtime = createChronicleRuntime();

    runtime.onContext("Base context.", { state, storyCards });
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("duplicate");

    cards[0] = configurationCard("Chronicle Enabled: true\nRepair Chronicle Card: true");
    runtime.onContext("Base context.", { state, storyCards });
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toBeUndefined();
  });

  it("auto-creates the canonical configuration card as recovery on first use, without initializing the timeline that same turn (D-032)", () => {
    const state: Record<string, unknown> = {};
    const cards: AiDungeonStoryCard[] = [];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };
    const runtime = createChronicleRuntime();

    // Turn 1: the card did not exist, so it is recovery-created here -- but the
    // creator has not had any chance to open/edit it yet, so the timeline must
    // NOT be born this same turn.
    expect(runtime.onInput("I wake up.", { state, actionCount: 1, storyCards })).toBe("I wake up.");
    expect(cards).toHaveLength(1);
    expect(cards[0].title).toBe("Configure Chronicle");
    expect(state.chronicleRuntime).toBeUndefined(); // deferred -- recovery just happened, not a real editing window yet
    expect(runtime.onContext("Base context.", { state, storyCards })).toBe("Base context."); // no [Chronicle] projection yet either
    expect(runtime.onOutput("Some narration.", { state, actionCount: 1, storyCards })).toBe("Some narration."); // no ledger record

    // Turn 2: a full turn has passed since recovery, so initialization proceeds normally,
    // reading whatever the creator left on the card (untouched defaults, in this case).
    expect(runtime.onInput("I look around.", { state, actionCount: 2, storyCards })).toBe("I look around.");
    expect(state.chronicleRuntime).toBeDefined();
  });

  it("lets a creator who edits the recovery-created card mid-turn still get their Manual choice honored, once initialization actually runs (D-032)", () => {
    const state: Record<string, unknown> = {};
    const cards: AiDungeonStoryCard[] = [];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };
    const runtime = createChronicleRuntime();

    runtime.onInput("I wake up.", { state, actionCount: 1, storyCards }); // recovery-creates the card, defers init
    expect(state.chronicleRuntime).toBeUndefined();

    // The creator opens the just-created card and switches to Manual before their next turn.
    cards[0].entry = "Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 1342\nStart Month: 9\nStart Day: 17\nStart Hour: 8\nStart Minute: 0\nStart Second: 0\nAI Temporal Signal: true\nRepair Chronicle Card: false";

    runtime.onInput("I check my surroundings.", { state, actionCount: 2, storyCards });
    const runtimeState = (state.chronicleRuntime as { chronicleState: { currentDateTime: { year: number; month: number; day: number; hour: number } } }).chronicleState;
    expect(runtimeState.currentDateTime).toMatchObject({ year: 1342, month: 9, day: 17, hour: 8 });
  });

  it("migrates a legacy chronicle-configuration card found only by keys, preserving its settings", () => {
    const state: Record<string, unknown> = {};
    const cards: AiDungeonStoryCard[] = [{ keys: "chronicle-configuration", entry: "", type: "story", description: "Chronicle Enabled: false" }];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };

    createChronicleRuntime().onInput("I wait.", { state, actionCount: 1, storyCards });

    expect(cards).toHaveLength(1); // migrated in place, not duplicated
    expect(cards[0].title).toBe("Configure Chronicle");
    expect(cards[0].entry).toContain("Chronicle Enabled: false");
    expect(state.chronicleRuntime).toBeUndefined(); // still disabled, exactly as the migrated setting says
  });

  it("initializes on the very first turn when the configuration card already existed beforehand -- the normal flow (D-032)", () => {
    const state: Record<string, unknown> = {};
    // Simulates a card pre-seeded on the Scenario itself (e.g. via the Scenario's own
    // Story Cards editor, copied into every new Adventure) -- not recovery-created here.
    const cards: AiDungeonStoryCard[] = [{
      keys: "chronicle-configuration", title: "Configure Chronicle", type: "class",
      entry: "Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 1342\nStart Month: 9\nStart Day: 17\nStart Hour: 8\nStart Minute: 0\nStart Second: 0\nAI Temporal Signal: true\nRepair Chronicle Card: false"
    }];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };

    createChronicleRuntime().onInput("I wake up.", { state, actionCount: 1, storyCards });

    expect(cards).toHaveLength(1); // no second card created
    const runtimeState = (state.chronicleRuntime as { chronicleState: { currentDateTime: { year: number; month: number; day: number; hour: number } } } | undefined)?.chronicleState;
    expect(runtimeState?.currentDateTime).toMatchObject({ year: 1342, month: 9, day: 17, hour: 8 });
  });

  it("does not crash the turn when the configuration card cannot be created or recovered", () => {
    const state: Record<string, unknown> = {};
    const cards: AiDungeonStoryCard[] = [];
    const storyCards: StoryCardRuntime = { storyCards: cards, addStoryCard: () => false, updateStoryCard: () => {} };

    expect(() => createChronicleRuntime().onInput("I wait.", { state, actionCount: 1, storyCards })).not.toThrow();
    expect(createChronicleRuntime().onInput("I wait.", { state, actionCount: 1, storyCards })).toBe("I wait.");
    expect(state[CHRONICLE_RUNTIME_ERROR_KEY]).toContain("Configure Chronicle");
  });

  it("carries the Input-captured player action all the way to a confidence boost in the Story Card Notes (Opção A, wired as in library.ts)", () => {
    const state: Record<string, unknown> = {};
    const cards: AiDungeonStoryCard[] = [configurationCard("Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 2026\nStart Month: 4\nStart Day: 13\nStart Hour: 19\nStart Minute: 32\nStart Second: 0\nAI Temporal Signal: false")];
    const storyCards: StoryCardRuntime = {
      storyCards: cards,
      addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
      updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
    };
    const runtime = createChronicleRuntime(createPlayerActionCorroboratedReasoner(ruleBasedTemporalReasoner));

    runtime.onInput("I go talk to the merchant.", { state, actionCount: 1, storyCards });
    runtime.onOutput("You talk to the merchant for a while.", { state, actionCount: 1, storyCards });

    expect(cards[1].description).toContain("\"confidence\": \"medium\"");
    expect(cards[1].description).toContain("player action names the same activity");
  });
});

describe("AI Temporal Signal (D-026)", () => {
  const cardsFor = (notes: string): { cards: AiDungeonStoryCard[]; storyCards: StoryCardRuntime } => {
    const cards: AiDungeonStoryCard[] = [configurationCard(notes)];
    return {
      cards,
      storyCards: {
        storyCards: cards,
        addStoryCard(keys, entry, type) { cards.push({ keys, entry, type }); return cards.length - 1; },
        updateStoryCard(index, keys, entry, type) { cards[index] = { ...cards[index], keys, entry, type }; }
      }
    };
  };
  const manualNotes = (extra = "") =>
    `Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 2026\nStart Month: 4\nStart Day: 13\nStart Hour: 19\nStart Minute: 32\nStart Second: 0${extra}`;

  it("appends its strict temporal protocol in Context without touching a creator's Authors Note", () => {
    const state: Record<string, unknown> = { memory: { authorsNote: "Keep tone dark and gritty." } };
    const { storyCards } = cardsFor(manualNotes());
    const contextualized = createChronicleRuntime(ruleBasedTemporalReasoner).onContext("Base context.", { state, storyCards });
    const authorsNote = (state.memory as { authorsNote: string }).authorsNote;
    expect(authorsNote).toBe("Keep tone dark and gritty.");
    expect(contextualized).toContain("# CHRONICLE TEMPORAL REPORT — REQUIRED");
  });

  it("instructs the narrator to self-guard against memories, flashbacks, and hypotheticals", () => {
    const state: Record<string, unknown> = {};
    const { storyCards } = cardsFor(manualNotes());
    const contextualized = createChronicleRuntime(ruleBasedTemporalReasoner).onContext("Base context.", { state, storyCards });
    expect(contextualized).toContain("memory, dream, flashback, hypothetical");
    expect(contextualized).toContain("no real elapsed time");
  });

  it("does not append the temporal protocol when AI Temporal Signal is disabled", () => {
    const state: Record<string, unknown> = {};
    const { storyCards } = cardsFor(manualNotes("\nAI Temporal Signal: false"));
    const contextualized = createChronicleRuntime(ruleBasedTemporalReasoner).onContext("Base context.", { state, storyCards });
    expect(contextualized).not.toContain("# CHRONICLE TEMPORAL REPORT — REQUIRED");
  });

  it("removes only its legacy Authors Note instruction from existing saves", () => {
    const state: Record<string, unknown> = { memory: { authorsNote: "Creator note.\n[[chronicle:ai-signal-instruction:start]]\nlegacy\n[[chronicle:ai-signal-instruction:end]]" } };
    const { storyCards: enabledCards } = cardsFor(manualNotes());
    createChronicleRuntime(ruleBasedTemporalReasoner).onContext("Base context.", { state, storyCards: enabledCards });
    const authorsNote = (state.memory as { authorsNote: string }).authorsNote;
    expect(authorsNote).toBe("Creator note.");
  });

  it("trusts a valid narrator-signaled directive, strips it from the returned narrative, and records it as model-signaled", () => {
    const state: Record<string, unknown> = {};
    const { cards, storyCards } = cardsFor(manualNotes());
    const runtime = createChronicleRuntime(ruleBasedTemporalReasoner);
    runtime.onInput("I settle in for the night.", { state, actionCount: 1, storyCards });
    const result = runtime.onOutput(
      "You sleep soundly until well past dawn. <<chronicle:PT9H15M>>",
      { state, actionCount: 1, storyCards }
    );

    expect(result).toBe("You sleep soundly until well past dawn.");
    const runtimeState = (state.chronicleRuntime as { chronicleState: { currentDateTime: { hour: number; minute: number; day: number } } }).chronicleState;
    expect(runtimeState.currentDateTime).toMatchObject({ day: 14, hour: 4, minute: 47 });
    // The traceability projected into the Story Card Notes for the player/creator to inspect (D-026 follow-up).
    expect(cards[1].description).toContain("\"mode\": \"model-signaled\"");
    expect(cards[1].description).toContain("\"signalStatus\": \"accepted\"");
  });

  it("falls back to the deterministic reasoner when the narrator omits the signal, unchanged from today's behavior", () => {
    const state: Record<string, unknown> = {};
    const { cards, storyCards } = cardsFor(manualNotes());
    const runtime = createChronicleRuntime(ruleBasedTemporalReasoner);
    const result = runtime.onOutput("After 2 hours, they reach the town.", { state, actionCount: 1, storyCards });

    expect(result).toBe("After 2 hours, they reach the town.");
    const runtimeState = (state.chronicleRuntime as { chronicleState: { currentDateTime: { hour: number } } }).chronicleState;
    expect(runtimeState.currentDateTime.hour).toBe(21);
    expect(cards[1].description).toContain("\"signalStatus\": \"absent\"");
  });

  it("ignores a stray directive's content, but still strips it, once AI Temporal Signal is disabled", () => {
    const state: Record<string, unknown> = {};
    const { storyCards } = cardsFor(manualNotes("\nAI Temporal Signal: false"));
    const runtime = createChronicleRuntime(ruleBasedTemporalReasoner);
    const result = runtime.onOutput("The door creaks quietly. <<chronicle:PT5H>>", { state, actionCount: 1, storyCards });

    expect(result).toBe("The door creaks quietly.");
    const runtimeState = (state.chronicleRuntime as { chronicleState: { currentDateTime: { hour: number } } }).chronicleState;
    expect(runtimeState.currentDateTime.hour).toBe(19); // unchanged: the disabled flag means the tag is never trusted as evidence
  });

  it("never leaks a stray directive to the player even while Chronicle is paused", () => {
    const state: Record<string, unknown> = { chronicleRuntime: { chronicleState: {} } };
    const { storyCards } = cardsFor(manualNotes());
    const result = createChronicleRuntime(ruleBasedTemporalReasoner).onOutput("Something happens. <<chronicle:PT2H>>", { state, actionCount: 1, storyCards });
    expect(result).toBe("Something happens.");
  });

  it("does not leave the temporal protocol in Authors Note once Chronicle is disabled", () => {
    const state: Record<string, unknown> = { memory: { authorsNote: "Creator note.\n[[chronicle:ai-signal-instruction:start]]\nlegacy\n[[chronicle:ai-signal-instruction:end]]" } };
    const { storyCards: enabledStoryCards } = cardsFor(manualNotes());
    const runtime = createChronicleRuntime(ruleBasedTemporalReasoner);
    runtime.onContext("Base context.", { state, storyCards: enabledStoryCards });
    expect((state.memory as { authorsNote: string }).authorsNote).toBe("Creator note.");

    const { storyCards: disabledStoryCards } = cardsFor("Chronicle Enabled: false");
    const contextualized = runtime.onContext("Base context.", { state, storyCards: disabledStoryCards });
    expect(contextualized).not.toContain("# CHRONICLE TEMPORAL REPORT — REQUIRED");
  });

  it("still stops advancing time once Chronicle is disabled, even with persisted state already present", () => {
    const state: Record<string, unknown> = {};
    const { storyCards: enabledStoryCards } = cardsFor(manualNotes());
    const runtime = createChronicleRuntime(ruleBasedTemporalReasoner);
    runtime.onOutput("After 2 hours, they reach the town.", { state, actionCount: 1, storyCards: enabledStoryCards });

    const { storyCards: disabledStoryCards } = cardsFor("Chronicle Enabled: false");
    runtime.onOutput("After 5 hours, they reach the next town.", { state, actionCount: 2, storyCards: disabledStoryCards });

    const runtimeState = (state.chronicleRuntime as { chronicleState: { currentDateTime: { hour: number } } }).chronicleState;
    expect(runtimeState.currentDateTime.hour).toBe(21); // unchanged from the first beat; the second (disabled) beat never applied
  });
});
