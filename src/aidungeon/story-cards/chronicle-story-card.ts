import type { TemporalLedger, TemporalLedgerRecord } from "../../chronicle/ledger/temporal-ledger.js";
import { formatChronicleDateTime } from "../../chronicle/state/format-chronicle-date-time.js";
import type { ChronicleState } from "../../chronicle/state/chronicle-state.js";

export const CHRONICLE_STORY_CARD_KEY = "chronicle-temporal-state";
export const CHRONICLE_STORY_CARD_TYPE = "story";
export const MAX_STORY_CARD_LEDGER_RECORDS = 20;

/** Minimal documented Story Card fields, plus experimental Notes mapping. */
export interface AiDungeonStoryCard {
  readonly id?: string | number;
  readonly keys: string;
  readonly entry: string;
  readonly type: string;
  description?: string;
}

export interface ChronicleStoryCardProjection {
  readonly keys: string;
  readonly entry: string;
  readonly type: string;
  readonly notes: string;
}

/**
 * Renders the only card content that may be visible to the narrator.
 * Ledger history is deliberately absent from the entry.
 */
export function renderChronicleStoryCardEntry(state: ChronicleState): string {
  return `Chronicle temporal state: ${formatChronicleDateTime(state.currentDateTime)}`;
}

/**
 * Renders an inspectable projection for Story Card Notes. `description` is a
 * community-observed mapping and must be validated in a real AI Dungeon app.
 */
export function renderChronicleStoryCardNotes(ledger: TemporalLedger): string {
  const records = ledger.records.slice(-MAX_STORY_CARD_LEDGER_RECORDS).map(renderLedgerRecord);
  return JSON.stringify(
    {
      chronicleTemporalLedger: {
        schemaVersion: 1,
        records
      }
    },
    null,
    2
  );
}

export function createChronicleStoryCardProjection(
  state: ChronicleState,
  ledger: TemporalLedger
): ChronicleStoryCardProjection {
  return Object.freeze({
    keys: CHRONICLE_STORY_CARD_KEY,
    entry: renderChronicleStoryCardEntry(state),
    type: CHRONICLE_STORY_CARD_TYPE,
    notes: renderChronicleStoryCardNotes(ledger)
  });
}

/** Locates the dedicated card without matching unrelated card text. */
export function findChronicleStoryCardIndex(storyCards: readonly AiDungeonStoryCard[]): number | undefined {
  const index = storyCards.findIndex((card) => card.keys.split(",").map((key) => key.trim()).includes(CHRONICLE_STORY_CARD_KEY));
  return index === -1 ? undefined : index;
}

function renderLedgerRecord(record: TemporalLedgerRecord): object {
  return {
    beatId: record.beatId,
    before: formatChronicleDateTime(record.previousState.currentDateTime),
    interpretation: record.actionInterpretation,
    elapsedTime: record.elapsedTime,
    mode: record.mode,
    reasoning: record.reasoning,
    confidence: record.confidence,
    after: formatChronicleDateTime(record.resultingState.currentDateTime)
  };
}
