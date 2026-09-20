import { nonEmptyText } from "./non-empty-text.js";
import { isPlainObject, usableStoryCardGlobals } from "./runtime-guards.js";
import type { AiDungeonStoryCard } from "./story-cards/chronicle-story-card.js";

declare const text: unknown;
declare const state: unknown;
declare const history: unknown;
declare const info: { actionCount?: number; maxChars?: number; memoryLength?: number } | undefined;
declare const storyCards: AiDungeonStoryCard[] | undefined;
declare const addStoryCard: ((keys: string, entry: string, type: string) => number | false) | undefined;
declare const updateStoryCard: ((index: number, keys: string, entry: string, type: string) => void) | undefined;
declare const removeStoryCard: ((index: number) => void) | undefined;

// Deliberately written with plain if/else instead of optional chaining or
// nullish coalescing: this tab's own compiled output should be as small and
// literal as possible, since it -- along with Input and Output -- is the
// artifact most likely to be hand-copied from a rendered Markdown code block
// rather than downloaded as a file (see 05_known_limitations.md).
const modifier = (value: unknown) => {
  const safeText = typeof value === "string" ? value : "";
  if (!isPlainObject(state)) return { text: nonEmptyText(safeText) };
  const runtime = globalThis.ChronicleAIDungeon;
  if (runtime === undefined) return { text: nonEmptyText(safeText) };
  const actionCount = info === undefined ? undefined : info.actionCount;
  const maxChars = info === undefined ? undefined : info.maxChars;
  const memoryLength = info === undefined ? undefined : info.memoryLength;
  const result = runtime.onContext(safeText, {
    state,
    actionCount,
    maxChars,
    memoryLength,
    history: Array.isArray(history) ? history : undefined,
    storyCards: usableStoryCardGlobals(storyCards, addStoryCard, updateStoryCard, removeStoryCard)
  });
  return { text: result };
};

modifier(text);
