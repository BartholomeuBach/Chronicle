import { advanceChronicleDateTime } from "../calendar/advance-chronicle-date-time.js";
import type { ElapsedTime } from "../calendar/elapsed-time.js";
import { isTemporalMode, type TemporalMode } from "../reasoning/temporal-mode.js";
import type { ChronicleDateTime, ChronicleState } from "../state/chronicle-state.js";

export const TEMPORAL_LEDGER_SCHEMA_VERSION = 1;
export const MAX_TEMPORAL_LEDGER_RECORDS = 100;
export const TEMPORAL_CONFIDENCE_LEVELS = ["high", "medium", "low"] as const;

export type TemporalConfidence = (typeof TEMPORAL_CONFIDENCE_LEVELS)[number];

/** A compact temporal snapshot, intentionally excluding operational metadata. */
export interface TemporalStateSnapshot {
  readonly currentDateTime: ChronicleDateTime;
}

/** One transparent record of an accepted incremental temporal update. */
export interface TemporalLedgerRecord {
  readonly schemaVersion: typeof TEMPORAL_LEDGER_SCHEMA_VERSION;
  readonly beatId: string;
  readonly previousState: TemporalStateSnapshot;
  readonly actionInterpretation: string;
  readonly elapsedTime: ElapsedTime;
  readonly mode: TemporalMode;
  readonly reasoning: string;
  readonly confidence: TemporalConfidence;
  readonly resultingState: TemporalStateSnapshot;
}

export interface TemporalLedgerRecordInput {
  readonly beatId: string;
  readonly previousState: ChronicleState;
  readonly actionInterpretation: string;
  readonly elapsedTime: ElapsedTime;
  readonly mode: TemporalMode;
  readonly reasoning: string;
  readonly confidence: TemporalConfidence;
  readonly resultingState: ChronicleState;
}

export interface TemporalLedger {
  readonly records: readonly TemporalLedgerRecord[];
}

export function createTemporalLedger(): TemporalLedger {
  return Object.freeze({ records: Object.freeze([]) });
}

/** Creates an immutable, internally consistent record for one accepted beat. */
export function createTemporalLedgerRecord(input: TemporalLedgerRecordInput): TemporalLedgerRecord {
  const beatId = requireText(input.beatId, "beatId", 128);
  const actionInterpretation = requireText(input.actionInterpretation, "actionInterpretation", 280);
  const reasoning = requireText(input.reasoning, "reasoning", 500);
  assertTemporalConfidence(input.confidence);

  const expectedDateTime = advanceChronicleDateTime(input.previousState.currentDateTime, input.elapsedTime);
  if (!sameDateTime(expectedDateTime, input.resultingState.currentDateTime)) {
    throw new RangeError("resultingState must equal previousState plus elapsedTime.");
  }

  return Object.freeze({
    schemaVersion: TEMPORAL_LEDGER_SCHEMA_VERSION,
    beatId,
    previousState: snapshot(input.previousState),
    actionInterpretation,
    elapsedTime: Object.freeze({ ...input.elapsedTime }),
    mode: input.mode,
    reasoning,
    confidence: input.confidence,
    resultingState: snapshot(input.resultingState)
  });
}

/** Appends once per beat and retains only the most recent bounded records. */
export function appendTemporalLedger(ledger: TemporalLedger, record: TemporalLedgerRecord): TemporalLedger {
  if (ledger.records.some((existingRecord) => existingRecord.beatId === record.beatId)) {
    return ledger;
  }

  return Object.freeze({
    records: Object.freeze([...ledger.records, record].slice(-MAX_TEMPORAL_LEDGER_RECORDS))
  });
}

export function isTemporalConfidence(value: unknown): value is TemporalConfidence {
  return typeof value === "string" && (TEMPORAL_CONFIDENCE_LEVELS as readonly string[]).includes(value);
}

/** Validates persisted Ledger data before an integration adapter uses it. */
export function isTemporalLedger(value: unknown): value is TemporalLedger {
  return value !== null && typeof value === "object" && Array.isArray((value as TemporalLedger).records) &&
    (value as TemporalLedger).records.every(isTemporalLedgerRecord);
}

function isTemporalLedgerRecord(value: unknown): value is TemporalLedgerRecord {
  if (value === null || typeof value !== "object") return false;
  const record = value as Partial<TemporalLedgerRecord>;
  return record.schemaVersion === TEMPORAL_LEDGER_SCHEMA_VERSION &&
    isText(record.beatId, 128) && isText(record.actionInterpretation, 280) && isText(record.reasoning, 500) &&
    isTemporalConfidence(record.confidence) && isTemporalMode(record.mode) &&
    isDateTime(record.previousState?.currentDateTime) && isDateTime(record.resultingState?.currentDateTime) &&
    isElapsedTime(record.elapsedTime);
}

function isDateTime(value: unknown): value is ChronicleDateTime {
  return value !== null && typeof value === "object" && Object.values(value).length === 6 && Object.values(value).every(Number.isSafeInteger);
}

function isElapsedTime(value: unknown): value is ElapsedTime {
  return value !== null && typeof value === "object" && Object.values(value).length === 4 && Object.values(value).every((part) => Number.isSafeInteger(part) && part >= 0);
}

function isText(value: unknown, maxLength: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function assertTemporalConfidence(value: unknown): asserts value is TemporalConfidence {
  if (!isTemporalConfidence(value)) {
    throw new RangeError(`Unsupported temporal confidence: ${String(value)}.`);
  }
}

function snapshot(state: ChronicleState): TemporalStateSnapshot {
  return Object.freeze({ currentDateTime: Object.freeze({ ...state.currentDateTime }) });
}

function sameDateTime(left: ChronicleDateTime, right: ChronicleDateTime): boolean {
  return (
    left.year === right.year &&
    left.month === right.month &&
    left.day === right.day &&
    left.hour === right.hour &&
    left.minute === right.minute &&
    left.second === right.second
  );
}

function requireText(value: string, name: string, maxLength: number): string {
  const text = value.trim();
  if (text.length === 0 || text.length > maxLength) {
    throw new RangeError(`${name} must contain 1 to ${maxLength} characters.`);
  }
  return text;
}
