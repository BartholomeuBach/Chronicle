import type { AiDungeonStoryCard } from "./story-cards/chronicle-story-card.js";

/**
 * Defensive presence/type checks for AI Dungeon's injected globals, mirroring the
 * community-validated guard pattern (Inner Self checks `state`/`info`/`storyCards`/
 * `addStoryCard` before trusting them). Chronicle's hooks call these before touching
 * any runtime global so a missing/malformed sandbox value degrades to a safe
 * passthrough instead of throwing out of Input/Context/Output.
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export interface UsableStoryCardGlobals {
  readonly storyCards: AiDungeonStoryCard[];
  readonly addStoryCard: (keys: string, entry: string, type: string) => number | false;
  readonly updateStoryCard: (index: number, keys: string, entry: string, type: string) => void;
  readonly removeStoryCard: ((index: number) => void) | undefined;
}

/** Narrows the four Story Card globals together; any missing/malformed piece disables the whole group. */
export function usableStoryCardGlobals(
  storyCards: unknown,
  addStoryCard: unknown,
  updateStoryCard: unknown,
  removeStoryCard: unknown
): UsableStoryCardGlobals | undefined {
  if (!Array.isArray(storyCards) || typeof addStoryCard !== "function" || typeof updateStoryCard !== "function") return undefined;
  return {
    storyCards: storyCards as AiDungeonStoryCard[],
    addStoryCard: addStoryCard as UsableStoryCardGlobals["addStoryCard"],
    updateStoryCard: updateStoryCard as UsableStoryCardGlobals["updateStoryCard"],
    removeStoryCard: typeof removeStoryCard === "function" ? (removeStoryCard as (index: number) => void) : undefined
  };
}
