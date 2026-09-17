import { nonEmptyText } from "./non-empty-text.js";
import { isPlainObject, usableStoryCardGlobals } from "./runtime-guards.js";
import type { AiDungeonStoryCard } from "./story-cards/chronicle-story-card.js";

declare const text: unknown;
declare const state: unknown;
declare const info: { actionCount?: number } | undefined;
declare const storyCards: AiDungeonStoryCard[] | undefined;
declare const addStoryCard: ((keys: string, entry: string, type: string) => number | false) | undefined;
declare const updateStoryCard: ((index: number, keys: string, entry: string, type: string) => void) | undefined;
declare const removeStoryCard: ((index: number) => void) | undefined;

const modifier = (value: unknown) => {
  const safeText = typeof value === "string" ? value : "";
  return {
    text: isPlainObject(state)
      ? (globalThis.ChronicleAIDungeon?.onOutput(safeText, {
          state,
          actionCount: info?.actionCount,
          storyCards: usableStoryCardGlobals(storyCards, addStoryCard, updateStoryCard, removeStoryCard)
        }) ?? nonEmptyText(safeText))
      : nonEmptyText(safeText)
  };
};

modifier(text);
