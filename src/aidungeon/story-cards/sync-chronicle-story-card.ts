import {
  createChronicleStoryCardProjection,
  findChronicleStoryCardIndex,
  findChronicleStoryCardIndices,
  type AiDungeonStoryCard
} from "./chronicle-story-card.js";
import type { TemporalLedger } from "../../chronicle/ledger/temporal-ledger.js";
import type { ChronicleState } from "../../chronicle/state/chronicle-state.js";

/** Narrow shape of documented Story Card functions used by the adapter. */
export interface StoryCardRuntime {
  readonly storyCards: AiDungeonStoryCard[];
  addStoryCard(keys: string, entry: string, type: string): number | false;
  updateStoryCard(index: number, keys: string, entry: string, type: string): void;
  removeStoryCard?: (index: number) => void;
}

export type ChronicleStoryCardSyncStatus = "created" | "updated" | "recovered" | "repaired" | "duplicate-detected";

export interface ChronicleStoryCardSyncResult {
  readonly status: ChronicleStoryCardSyncStatus;
  readonly cardIndex: number;
  readonly notesWriteAttempted: boolean;
  readonly duplicateCount: number;
}

export interface ChronicleStoryCardSyncOptions {
  readonly repairDuplicates?: boolean;
}

/**
 * Creates or refreshes the dedicated projection card. The documented API owns
 * keys/entry/type. The direct `description` assignment is intentionally an
 * experimental Notes projection, isolated here for in-app validation.
 */
export function syncChronicleStoryCard(
  runtime: StoryCardRuntime,
  state: ChronicleState,
  ledger: TemporalLedger,
  options: ChronicleStoryCardSyncOptions = {}
): ChronicleStoryCardSyncResult {
  const projection = createChronicleStoryCardProjection(state, ledger);
  const matchingIndices = findChronicleStoryCardIndices(runtime.storyCards);
  const existingIndex = matchingIndices[0];

  if (matchingIndices.length > 1 && options.repairDuplicates === true) {
    if (runtime.removeStoryCard === undefined) {
      return Object.freeze({ status: "duplicate-detected", cardIndex: existingIndex, notesWriteAttempted: false, duplicateCount: matchingIndices.length });
    }
    for (const index of matchingIndices.slice(1).reverse()) runtime.removeStoryCard(index);
    runtime.updateStoryCard(existingIndex, projection.keys, projection.entry, projection.type);
    writeExperimentalFields(runtime.storyCards[existingIndex], projection);
    return Object.freeze({ status: "repaired", cardIndex: existingIndex, notesWriteAttempted: true, duplicateCount: matchingIndices.length });
  }

  if (existingIndex !== undefined) {
    runtime.updateStoryCard(existingIndex, projection.keys, projection.entry, projection.type);
    writeExperimentalFields(runtime.storyCards[existingIndex], projection);
    return Object.freeze({ status: matchingIndices.length > 1 ? "duplicate-detected" : "updated", cardIndex: existingIndex, notesWriteAttempted: true, duplicateCount: matchingIndices.length });
  }

  const createdIndex = runtime.addStoryCard(projection.keys, projection.entry, projection.type);
  if (createdIndex !== false && runtime.storyCards[createdIndex] !== undefined) {
    writeExperimentalFields(runtime.storyCards[createdIndex], projection);
    return Object.freeze({ status: "created", cardIndex: createdIndex, notesWriteAttempted: true, duplicateCount: 1 });
  }

  const recoveredIndex = findChronicleStoryCardIndex(runtime.storyCards);
  if (recoveredIndex === undefined) {
    throw new Error("Chronicle Story Card could not be created or recovered.");
  }

  runtime.updateStoryCard(recoveredIndex, projection.keys, projection.entry, projection.type);
  writeExperimentalFields(runtime.storyCards[recoveredIndex], projection);
  return Object.freeze({ status: "recovered", cardIndex: recoveredIndex, notesWriteAttempted: true, duplicateCount: 1 });
}

/**
 * `title` and `description` are outside the documented `addStoryCard`/`updateStoryCard`
 * signature, so they are set by direct object mutation on the card reference returned
 * from `storyCards[index]` -- the same pattern Inner Self uses (construct via
 * `addStoryCard`, then assign fields on the returned card object directly).
 */
function writeExperimentalFields(card: AiDungeonStoryCard, projection: { readonly title: string; readonly notes: string }): void {
  card.title = projection.title;
  card.description = projection.notes;
}
