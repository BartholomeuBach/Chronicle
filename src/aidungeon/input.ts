import { nonEmptyText } from "./runtime.js";
import type { AiDungeonStoryCard } from "./story-cards/chronicle-story-card.js";

declare const text: string;
declare const state: Record<string, unknown>;
declare const info: { actionCount?: number };
declare const storyCards: AiDungeonStoryCard[];
declare const addStoryCard: (keys: string, entry: string, type: string) => number | false;
declare const updateStoryCard: (index: number, keys: string, entry: string, type: string) => void;

const modifier = (value: string) => ({
  text: globalThis.ChronicleAIDungeon?.onInput(value, { state, actionCount: info.actionCount, storyCards: { storyCards, addStoryCard, updateStoryCard } }) ?? nonEmptyText(value)
});

modifier(text);
