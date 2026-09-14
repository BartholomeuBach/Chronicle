import {
  createChronicleStoryCardProjection,
  findChronicleStoryCardIndex,
  type AiDungeonStoryCard
} from "./chronicle-story-card.js";
import type { TemporalLedger } from "../../chronicle/ledger/temporal-ledger.js";
import type { ChronicleState } from "../../chronicle/state/chronicle-state.js";

/** Narrow shape of documented Story Card functions used by the adapter. */
export interface StoryCardRuntime {
  readonly storyCards: AiDungeonStoryCard[];
  addStoryCard(keys: string, entry: string, type: string): number | false;
  updateStoryCard(index: number, keys: string, entry: string, type: string): void;
}

export type ChronicleStoryCardSyncStatus = "created" | "updated" | "recovered";

export interface ChronicleStoryCardSyncResult {
  readonly status: ChronicleStoryCardSyncStatus;
  readonly cardIndex: number;
  readonly notesWriteAttempted: boolean;
}

/**
 * Creates or refreshes the dedicated projection card. The documented API owns
 * keys/entry/type. The direct `description` assignment is intentionally an
 * experimental Notes projection, isolated here for in-app validation.
 */
export function syncChronicleStoryCard(
  runtime: StoryCardRuntime,
  state: ChronicleState,
  ledger: TemporalLedger
): ChronicleStoryCardSyncResult {
  const projection = createChronicleStoryCardProjection(state, ledger);
  const existingIndex = findChronicleStoryCardIndex(runtime.storyCards);

  if (existingIndex !== undefined) {
    runtime.updateStoryCard(existingIndex, projection.keys, projection.entry, projection.type);
    writeExperimentalNotes(runtime.storyCards[existingIndex], projection.notes);
    return Object.freeze({ status: "updated", cardIndex: existingIndex, notesWriteAttempted: true });
  }

  const createdIndex = runtime.addStoryCard(projection.keys, projection.entry, projection.type);
  if (createdIndex !== false && runtime.storyCards[createdIndex] !== undefined) {
    writeExperimentalNotes(runtime.storyCards[createdIndex], projection.notes);
    return Object.freeze({ status: "created", cardIndex: createdIndex, notesWriteAttempted: true });
  }

  const recoveredIndex = findChronicleStoryCardIndex(runtime.storyCards);
  if (recoveredIndex === undefined) {
    throw new Error("Chronicle Story Card could not be created or recovered.");
  }

  runtime.updateStoryCard(recoveredIndex, projection.keys, projection.entry, projection.type);
  writeExperimentalNotes(runtime.storyCards[recoveredIndex], projection.notes);
  return Object.freeze({ status: "recovered", cardIndex: recoveredIndex, notesWriteAttempted: true });
}

function writeExperimentalNotes(card: AiDungeonStoryCard, notes: string): void {
  card.description = notes;
}
