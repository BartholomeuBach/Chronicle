import { nonEmptyText } from "./runtime.js";
import type { AiDungeonStoryCard } from "./story-cards/chronicle-story-card.js";

declare const text: string;
declare const state: Record<string, unknown>;
declare const info: { actionCount?: number };
declare const storyCards: AiDungeonStoryCard[];
declare const addStoryCard: (keys: string, entry: string, type: string) => number | false;
declare const updateStoryCard: (index: number, keys: string, entry: string, type: string) => void;
declare const removeStoryCard: ((index: number) => void) | undefined;

const modifier = (value: string) => ({
  text: globalThis.ChronicleAIDungeon?.onOutput(value, {
    state,
    actionCount: info.actionCount,
    storyCards: { storyCards, addStoryCard, updateStoryCard, removeStoryCard: typeof removeStoryCard === "function" ? removeStoryCard : undefined }
  }) ?? nonEmptyText(value)
});

modifier(text);
