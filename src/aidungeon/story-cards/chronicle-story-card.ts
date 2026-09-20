import type { TemporalLedger, TemporalLedgerRecord } from "../../chronicle/ledger/temporal-ledger.js";
import { formatChronicleDateTime } from "../../chronicle/state/format-chronicle-date-time.js";
import { renderChronicleTemporalContext } from "../../chronicle/state/render-chronicle-temporal-context.js";
import type { ChronicleState } from "../../chronicle/state/chronicle-state.js";
import type { ChronicleSignalDiagnostic } from "../chronicle-signal-diagnostic.js";

/** Legacy/reserved identifier kept in `keys` so pre-existing cards are still discoverable by fallback. */
export const CHRONICLE_STORY_CARD_KEY = "chronicle-temporal-state";
/** Primary discovery identifier: the card's Name/Title, as shown in the AI Dungeon Story Card list. */
export const CHRONICLE_STORY_CARD_TITLE = "Chronicle Temporal State";
/** "class" is a simple native type validated in community scripts (Inner Self); not a Custom Type. */
export const CHRONICLE_STORY_CARD_TYPE = "class";
export const MAX_STORY_CARD_LEDGER_RECORDS = 20;

/**
 * Story Card fields Chronicle actually reads/writes at runtime. `id`, `keys`, `entry`,
 * and `type` are documented by the official scripting API. `title` and `description`
 * (the UI's Name/Notes fields) are a community-observed mapping -- confirmed working in
 * Inner Self, not yet confirmed by AI Dungeon's own reference -- so they stay optional
 * and are always read/written defensively.
 */
export interface AiDungeonStoryCard {
  readonly id?: string | number;
  keys: string;
  entry: string;
  type: string;
  title?: string;
  description?: string;
}

export interface ChronicleStoryCardProjection {
  readonly keys: string;
  readonly title: string;
  readonly entry: string;
  readonly type: string;
  readonly notes: string;
}

/**
 * Renders the only card content that may be visible to the narrator.
 * Ledger history is deliberately absent from the entry.
 */
export function renderChronicleStoryCardEntry(state: ChronicleState): string {
  return renderChronicleTemporalContext(state.currentDateTime);
}

/**
 * Renders an inspectable projection for Story Card Notes. `description` is a
 * community-observed mapping and must be validated in a real AI Dungeon app.
 */
export function renderChronicleStoryCardNotes(ledger: TemporalLedger, signalDiagnostic?: ChronicleSignalDiagnostic): string {
  const records = ledger.records.slice(-MAX_STORY_CARD_LEDGER_RECORDS).map(renderLedgerRecord);
  return JSON.stringify(
    {
      chronicleTemporalLedger: {
        schemaVersion: 1,
        records
      },
      chronicleSignalDiagnostic: signalDiagnostic
    },
    null,
    2
  );
}

export function createChronicleStoryCardProjection(
  state: ChronicleState,
  ledger: TemporalLedger,
  signalDiagnostic?: ChronicleSignalDiagnostic
): ChronicleStoryCardProjection {
  return Object.freeze({
    keys: CHRONICLE_STORY_CARD_KEY,
    title: CHRONICLE_STORY_CARD_TITLE,
    entry: renderChronicleStoryCardEntry(state),
    type: CHRONICLE_STORY_CARD_TYPE,
    notes: renderChronicleStoryCardNotes(ledger, signalDiagnostic)
  });
}

/** Locates the dedicated card without matching unrelated card text. */
export function findChronicleStoryCardIndex(storyCards: readonly AiDungeonStoryCard[]): number | undefined {
  return findChronicleStoryCardIndices(storyCards)[0];
}

/**
 * Returns every dedicated Chronicle projection card, in current array order.
 * A card matches by its canonical title (primary, case/whitespace-insensitive) or,
 * for backward compatibility with cards created before the title-based scheme, by the
 * legacy `chronicle-temporal-state` identifier in `keys` (fallback).
 */
export function findChronicleStoryCardIndices(storyCards: readonly AiDungeonStoryCard[]): readonly number[] {
  const indices: number[] = [];
  storyCards.forEach((card, index) => {
    if (matchesChronicleStoryCard(card)) indices.push(index);
  });
  return Object.freeze(indices);
}

function matchesChronicleStoryCard(card: AiDungeonStoryCard): boolean {
  if (normalizedTitle(card.title) === CHRONICLE_STORY_CARD_TITLE.toLowerCase()) return true;
  return (card.keys ?? "").split(",").map((key) => key.trim()).includes(CHRONICLE_STORY_CARD_KEY);
}

function normalizedTitle(title: string | undefined): string {
  return (title ?? "").trim().toLowerCase();
}

function renderLedgerRecord(record: TemporalLedgerRecord): object {
  return {
    beatId: record.beatId,
    before: formatChronicleDateTime(record.previousState.currentDateTime),
    interpretation: record.actionInterpretation,
    elapsedTime: record.elapsedTime,
    mode: record.mode,
    signalStatus: record.signalStatus,
    reasoning: record.reasoning,
    confidence: record.confidence,
    after: formatChronicleDateTime(record.resultingState.currentDateTime)
  };
}
