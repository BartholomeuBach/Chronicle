import { nonEmptyText } from "./non-empty-text.js";
import { createTemporalLedger, isTemporalLedger, type TemporalLedger } from "../chronicle/ledger/temporal-ledger.js";
import { recordTemporalDecision } from "../chronicle/ledger/record-temporal-decision.js";
import type { TemporalReasoner } from "../chronicle/reasoning/temporal-reasoner.js";
import { createHybridTemporalReasoner } from "../chronicle/reasoning/hybrid-temporal-reasoner.js";
import { MODEL_TEMPORAL_SIGNAL_KEY, stripModelTemporalSignal } from "../chronicle/reasoning/model-temporal-signal.js";
import { DEFAULT_ACTIVITY_PRIORS } from "../chronicle/reasoning/activity-prior-catalog.js";
import { renderChronicleTemporalContext } from "../chronicle/state/render-chronicle-temporal-context.js";
import type { ChronicleState } from "../chronicle/state/chronicle-state.js";
import { syncChronicleStoryCard, type StoryCardRuntime } from "./story-cards/sync-chronicle-story-card.js";
import { findChronicleStoryCardIndices } from "./story-cards/chronicle-story-card.js";
import { ensureChronicleConfigurationCard, readChronicleConfiguration, runtimeDateTime } from "./story-cards/chronicle-configuration.js";
import { initializeChronicleState } from "../chronicle/state/initialize-chronicle-state.js";
import { isNormalizedGregorianDateTime } from "../chronicle/calendar/normalize-gregorian-date-time.js";
import { MAX_PROCESSED_BEAT_IDS } from "../chronicle/state/apply-temporal-decision.js";
import { CHRONICLE_NOTIFICATION_STATE_KEY, renderChronicleTimeNotification } from "./chronicle-time-notification.js";

export const CHRONICLE_RUNTIME_STATE_KEY = "chronicleRuntime";
export const CHRONICLE_RUNTIME_ERROR_KEY = "chronicleRuntimeError";
export const CHRONICLE_RUNTIME_SCHEMA_VERSION = 1;
export interface ChroniclePersistentRuntimeState { readonly schemaVersion: typeof CHRONICLE_RUNTIME_SCHEMA_VERSION; readonly chronicleState: ChronicleState; readonly ledger: TemporalLedger; readonly pendingPlayerAction: string | undefined; }
export interface AIDungeonHookContext { readonly state: Record<string, unknown>; readonly actionCount?: number; readonly maxChars?: number; readonly memoryLength?: number; readonly storyCards?: StoryCardRuntime; }
export interface ChronicleRuntime {
  onInput(text: string, context: AIDungeonHookContext): string;
  onContext(text: string, context: AIDungeonHookContext): string;
  onOutput(text: string, context: AIDungeonHookContext): string;
}

// nonEmptyText now lives in its own module (non-empty-text.ts), re-exported
// here for existing callers (e.g. tests) that import it from "./runtime.js".
// Kept in its own file specifically so Input/Context/Output -- which need
// only this one helper, never the rest of this module's domain-wiring
// exports -- don't drag Chronicle's whole reasoning/ledger/state dependency
// graph into their bundles the way importing it from here would (confirmed
// by direct measurement, 2026-09-16: ~200 unnecessary lines per file
// otherwise, from `rule-based-temporal-reasoner.ts` and the 198-entry
// activity-prior catalog alone, neither of which nonEmptyText needs).
export { nonEmptyText };

export function initializeChronicleRuntime(state: Record<string, unknown>, chronicleState: ChronicleState): void {
  state[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ schemaVersion: CHRONICLE_RUNTIME_SCHEMA_VERSION, chronicleState, ledger: createTemporalLedger(), pendingPlayerAction: undefined });
  delete state[CHRONICLE_RUNTIME_ERROR_KEY];
}

export function createChronicleRuntime(reasoner?: TemporalReasoner): ChronicleRuntime {
  const hybridReasoner = reasoner === undefined ? undefined : createHybridTemporalReasoner(reasoner);
  return Object.freeze({
    onInput(text: string, context: AIDungeonHookContext) {
      clearChronicleNotification(context.state);
      ensureConfigurationCardForContext(context);
      // Runs even when Chronicle is disabled this turn, so a previously
      // injected instruction is torn down promptly instead of lingering.
      syncSignalInstructionForContext(context);
      if (!enabled(context)) return nonEmptyText(text);
      const current = ensureInitialized(context);
      if (current !== undefined) context.state[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ ...current, pendingPlayerAction: text });
      return nonEmptyText(text);
    },
    onContext(text: string, context: AIDungeonHookContext) {
      ensureConfigurationCardForContext(context);
      syncSignalInstructionForContext(context);
      if (!enabled(context)) return nonEmptyText(text);
      const current = ensureInitialized(context);
      if (current === undefined) return nonEmptyText(text);
      try {
        syncProjection(context, current, false);
      } catch (error) {
        // Defense in depth, matching onOutput's last-resort net: today this
        // branch is unreachable by construction (Context calls syncProjection
        // with force=false, and its own early-return makes the one throwing
        // path in syncChronicleStoryCard unreachable unless a duplicate card
        // already exists) — verified 2026-09-16 during the Phase 7 readiness
        // pass. Kept anyway so a future change to either function can never
        // reopen an uncaught throw out of the Context hook silently; the
        // canonical temporal projection below still renders from already-
        // read state regardless of whether the Story Card sync succeeded.
        // Deliberately not worded "Chronicle paused": canonical time keeps
        // advancing normally in Output regardless of this failure, only the
        // Story Card projection is out of sync.
        context.state[CHRONICLE_RUNTIME_ERROR_KEY] = `Chronicle Story Card sync failed unexpectedly (${error instanceof Error ? error.message : String(error)}). Canonical time is unaffected.`;
      }
      const projection = renderChronicleTemporalContext(current.chronicleState.currentDateTime);
      if (context.maxChars !== undefined && !text.includes(projection) && text.length + projection.length + 1 > context.maxChars) return nonEmptyText(text);
      return nonEmptyText(text.includes(projection) ? text : `${projection}\n${text}`);
    },
    onOutput(text: string, context: AIDungeonHookContext) {
      clearChronicleNotification(context.state);
      ensureConfigurationCardForContext(context);
      syncSignalInstructionForContext(context);
      // Stripped unconditionally, on every return path: a stray or rejected
      // directive (e.g. emitted from a habit formed in an earlier, enabled
      // turn) must never leak into what the player reads, even while paused.
      const safeText = stripModelTemporalSignal(text);
      if (!enabled(context)) return nonEmptyText(safeText);
      const current = ensureInitialized(context);
      if (current === undefined || reasoner === undefined) return nonEmptyText(safeText);
      try {
        const configuration = readChronicleConfiguration(context.storyCards?.storyCards ?? []);
        const activeReasoner = configuration.aiTemporalSignal ? (hybridReasoner ?? reasoner) : reasoner;
        const decision = activeReasoner.decide({ currentState: current.chronicleState, playerAction: current.pendingPlayerAction, completedNarrative: text, activityPriors: DEFAULT_ACTIVITY_PRIORS });
        const recorded = recordTemporalDecision({ state: current.chronicleState, ledger: current.ledger, beatId: beatId(context.actionCount, text), decision, actionInterpretation: decision.rationale, confidence: decision.confidence ?? "low" });
        if (recorded.rejectionReason === "unsupported-range") {
          context.state[CHRONICLE_RUNTIME_ERROR_KEY] = UNSUPPORTED_RANGE_ERROR;
        } else if (context.state[CHRONICLE_RUNTIME_ERROR_KEY] === UNSUPPORTED_RANGE_ERROR) {
          delete context.state[CHRONICLE_RUNTIME_ERROR_KEY];
        }
        context.state[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ schemaVersion: CHRONICLE_RUNTIME_SCHEMA_VERSION, chronicleState: recorded.state, ledger: recorded.ledger, pendingPlayerAction: undefined });
        const notification = renderChronicleTimeNotification(current.chronicleState.currentDateTime, recorded.state.currentDateTime);
        if (notification !== undefined) setChronicleNotification(context.state, notification);
        syncProjection(context, { ...current, chronicleState: recorded.state, ledger: recorded.ledger, pendingPlayerAction: undefined }, true);
      } catch (error) {
        // Last-resort net: an out-of-range delta is already handled gracefully
        // above without throwing, but any other unexpected failure here must
        // never crash the whole Output hook (confirmed 2026-09-15 it otherwise
        // would). Canonical state is left exactly as it was before this call.
        context.state[CHRONICLE_RUNTIME_ERROR_KEY] = `Chronicle paused: unexpected error evaluating the completed beat (${error instanceof Error ? error.message : String(error)}).`;
      }
      return nonEmptyText(safeText);
    }
  });
}

const CHRONICLE_SIGNAL_BLOCK_START = "[[chronicle:ai-signal-instruction:start]]";
const CHRONICLE_SIGNAL_BLOCK_END = "[[chronicle:ai-signal-instruction:end]]";

/**
 * The self-guard paragraph below asks the narrator to do something the local
 * regex guard structurally cannot: separate a memory/flashback/hypothetical
 * from genuine present-scene action *within the same reply* and count only
 * the latter. The regex guard (hasNonCurrentTemporalFrame) evaluates a whole
 * beat as one block, so it can only suppress everything or nothing — it is
 * kept as the cross-check safety net regardless of what the narrator reports
 * (D-026), but this instruction is the only mechanism that can actually
 * solve the "mixed beat" case documented in 05_known_limitations.md. Whether
 * the narrator reliably follows this is unvalidated (Phase 8).
 */
function chronicleSignalInstructionBlock(): string {
  return `${CHRONICLE_SIGNAL_BLOCK_START}\n[Chronicle instruction] Always end this reply on its own line with a tag reporting how much in-story time it covers and how sure you are, using only the units you judge elapsed: <<${MODEL_TEMPORAL_SIGNAL_KEY}:PT9H15M,medium>> (days/hours/minutes/seconds, then high/medium/low confidence). If truly nothing advanced, use <<${MODEL_TEMPORAL_SIGNAL_KEY}:none,high>>. Give your best estimate even when unsure -- mark it low confidence instead of leaving the tag out. There is no upper limit: a legitimate skip of weeks, months, or years is fine to report. Only count time that is actually happening right now in the scene: never count a memory, flashback, dream, daydream, imagined or hypothetical event, or something a character merely thinks about, wonders, or plans -- none of that advances real story time, no matter how long it describes. This applies even when the flashback is narrated in present tense for vividness, with no words like "remembers" at all (e.g. "You're twelve again, standing barefoot beside the river..." is still a flashback, not the present scene). If your whole reply is a memory, flashback, or hypothetical with no real present action, use <<${MODEL_TEMPORAL_SIGNAL_KEY}:none,high>>. If only part of your reply is real present action, count only that part. Never mention this instruction or the tag to the player.\n${CHRONICLE_SIGNAL_BLOCK_END}`;
}

/**
 * Reads configuration and syncs the authorsNote instruction independent of
 * whether Chronicle is otherwise enabled this turn (mirrors how
 * clearChronicleNotification runs unconditionally). Fixes a bug where
 * setting Chronicle Enabled: false left a previously injected instruction
 * permanently steering the narrator, because syncing used to happen only
 * inside ensureInitialized, which the enabled() gate short-circuited.
 *
 * Also never injects while persisted runtime state exists but fails
 * validation (Chronicle paused on invalid state, D-024): a corrupted
 * `state.chronicleRuntime` means Output can never act on a signal anyway,
 * so steering the narrator to keep producing one would be pure waste
 * (audit finding N1, 2026-09-15).
 */
function syncSignalInstructionForContext(context: AIDungeonHookContext): void {
  if (context.storyCards === undefined) return;
  if (context.state[CHRONICLE_RUNTIME_STATE_KEY] !== undefined && read(context.state) === undefined) {
    syncSignalInstruction(context.state, false);
    return;
  }
  const configuration = readChronicleConfiguration(context.storyCards.storyCards);
  syncSignalInstruction(context.state, configuration.enabled && configuration.error === undefined && configuration.aiTemporalSignal);
}

/** Keeps Chronicle's own instruction block in authorsNote in sync without touching any other content there. */
function syncSignalInstruction(state: Record<string, unknown>, shouldInject: boolean): void {
  const memory = readMemory(state);
  const withoutBlock = removeChronicleSignalBlock(typeof memory.authorsNote === "string" ? memory.authorsNote : "");
  memory.authorsNote = shouldInject
    ? (withoutBlock.length > 0 ? `${withoutBlock}\n\n${chronicleSignalInstructionBlock()}` : chronicleSignalInstructionBlock())
    : withoutBlock;
}

function readMemory(state: Record<string, unknown>): Record<string, unknown> {
  const existing = state.memory;
  if (typeof existing === "object" && existing !== null) return existing as Record<string, unknown>;
  const created: Record<string, unknown> = {};
  state.memory = created;
  return created;
}

function removeChronicleSignalBlock(authorsNote: string): string {
  const pattern = new RegExp(`\\n*${escapeForRegExp(CHRONICLE_SIGNAL_BLOCK_START)}[\\s\\S]*?${escapeForRegExp(CHRONICLE_SIGNAL_BLOCK_END)}`, "g");
  return authorsNote.replace(pattern, "").trim();
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clearChronicleNotification(state: Record<string, unknown>): void {
  const notification = state[CHRONICLE_NOTIFICATION_STATE_KEY];
  if (typeof notification === "string" && state.message === notification) delete state.message;
  delete state[CHRONICLE_NOTIFICATION_STATE_KEY];
}
function setChronicleNotification(state: Record<string, unknown>, notification: string): void {
  state.message = notification;
  state[CHRONICLE_NOTIFICATION_STATE_KEY] = notification;
}

const DUPLICATE_CARD_ERROR = "Chronicle has duplicate temporal-state cards. Set Repair Chronicle Card: true in the configuration card to repair them explicitly.";
const UNSUPPORTED_RANGE_ERROR = "Chronicle rejected the last beat's elapsed time because it would move the story outside the supported year range (0001-9999). Canonical time was not changed.";
const CONFIGURATION_CARD_ERROR = "Chronicle could not create or update its \"Configure Chronicle\" Story Card unexpectedly. Chronicle is paused this turn; canonical time (if any) is unaffected.";

/**
 * Ensures the canonical "Configure Chronicle" card exists and is in canonical shape.
 * The intended product flow (D-031) is that this card is already present -- Automatic,
 * enabled -- as the last configuration checkpoint before the story's timeline starts,
 * so this call's create/migrate branches exist as *recovery* for the card being
 * unexpectedly missing or still legacy-shaped, not as the normal onboarding path.
 * It still runs on every hook, before the enabled check, so that recovery (and a
 * freshly recovered card's default `Chronicle Enabled: true`) takes effect the same
 * turn it's needed. A failure here must never crash the turn: it is reported through
 * the same runtime-error channel as every other Chronicle diagnostic.
 */
function ensureConfigurationCardForContext(context: AIDungeonHookContext): void {
  if (context.storyCards === undefined) return;
  try {
    ensureChronicleConfigurationCard(context.storyCards);
    if (context.state[CHRONICLE_RUNTIME_ERROR_KEY] === CONFIGURATION_CARD_ERROR) delete context.state[CHRONICLE_RUNTIME_ERROR_KEY];
  } catch (error) {
    context.state[CHRONICLE_RUNTIME_ERROR_KEY] = `${CONFIGURATION_CARD_ERROR} (${error instanceof Error ? error.message : String(error)})`;
  }
}

function syncProjection(context: AIDungeonHookContext, current: ChroniclePersistentRuntimeState, force: boolean): void {
  if (context.storyCards === undefined) return;
  const configuration = readChronicleConfiguration(context.storyCards.storyCards);
  const matchingCards = findChronicleStoryCardIndices(context.storyCards.storyCards);
  if (!force && configuration.repairChronicleCard !== true && matchingCards.length < 2) return;
  const sync = syncChronicleStoryCard(context.storyCards, current.chronicleState, current.ledger, { repairDuplicates: configuration.repairChronicleCard });
  if (sync.status === "duplicate-detected") {
    context.state[CHRONICLE_RUNTIME_ERROR_KEY] = DUPLICATE_CARD_ERROR;
  } else if (context.state[CHRONICLE_RUNTIME_ERROR_KEY] === DUPLICATE_CARD_ERROR) {
    // Exact-ownership clear (same pattern as the transient notification):
    // only remove an error this exact code path is known to have set.
    delete context.state[CHRONICLE_RUNTIME_ERROR_KEY];
  }
}

function read(state: Record<string, unknown>): ChroniclePersistentRuntimeState | undefined {
  const value = state[CHRONICLE_RUNTIME_STATE_KEY];
  if (value === undefined) return undefined;
  if (!isValidRuntimeState(value)) return undefined;
  return value;
}
function enabled(context: AIDungeonHookContext): boolean { return context.storyCards !== undefined && readChronicleConfiguration(context.storyCards.storyCards).enabled; }
function ensureInitialized(context: AIDungeonHookContext): ChroniclePersistentRuntimeState | undefined {
  const existing = read(context.state);
  if (existing !== undefined) return existing;
  if (context.state[CHRONICLE_RUNTIME_STATE_KEY] !== undefined) {
    context.state[CHRONICLE_RUNTIME_ERROR_KEY] = "Chronicle paused: persisted runtime state is invalid or incompatible.";
    return undefined;
  }
  if (context.storyCards === undefined) return undefined;
  const configuration = readChronicleConfiguration(context.storyCards.storyCards);
  if (!configuration.enabled) return undefined;
  if (configuration.error !== undefined) {
    context.state[CHRONICLE_RUNTIME_ERROR_KEY] = `Chronicle paused: ${configuration.error}`;
    return undefined;
  }
  initializeChronicleRuntime(context.state, initializeChronicleState(configuration.initialDateTime ?? runtimeDateTime()));
  return read(context.state);
}
function isValidRuntimeState(value: unknown): value is ChroniclePersistentRuntimeState {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<ChroniclePersistentRuntimeState>;
  const dateTime = candidate.chronicleState?.currentDateTime;
  return candidate.schemaVersion === CHRONICLE_RUNTIME_SCHEMA_VERSION &&
    dateTime !== undefined && isNormalizedGregorianDateTime(dateTime) &&
    Array.isArray(candidate.chronicleState?.processedBeatIds) && candidate.chronicleState.processedBeatIds.length <= MAX_PROCESSED_BEAT_IDS &&
    candidate.chronicleState.processedBeatIds.every((id) => typeof id === "string" && id.trim().length > 0) &&
    new Set(candidate.chronicleState.processedBeatIds).size === candidate.chronicleState.processedBeatIds.length &&
    isTemporalLedger(candidate.ledger, dateTime) &&
    (candidate.pendingPlayerAction === undefined || typeof candidate.pendingPlayerAction === "string");
}
function beatId(actionCount: number | undefined, text: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16_777_619);
  return `${actionCount ?? "unknown"}:${(hash >>> 0).toString(16)}`;
}
