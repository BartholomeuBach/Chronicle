import { nonEmptyText } from "./runtime.js";
import type { AiDungeonStoryCard } from "./story-cards/chronicle-story-card.js";

declare const text: string;
declare const state: Record<string, unknown>;
declare const info: { actionCount?: number; maxChars?: number; memoryLength?: number };
declare const storyCards: AiDungeonStoryCard[];
declare const addStoryCard: (keys: string, entry: string, type: string) => number | false;
declare const updateStoryCard: (index: number, keys: string, entry: string, type: string) => void;
declare const removeStoryCard: ((index: number) => void) | undefined;

const modifier = (value: string) => ({
  text: globalThis.ChronicleAIDungeon?.onContext(value, { state, actionCount: info.actionCount, maxChars: info.maxChars, memoryLength: info.memoryLength, storyCards: { storyCards, addStoryCard, updateStoryCard, removeStoryCard: typeof removeStoryCard === "function" ? removeStoryCard : undefined } }) ?? nonEmptyText(value)
});

modifier(text);
