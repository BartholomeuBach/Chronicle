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
      // Input marks the start of a new turn (the one point in the hook cycle
      // this codebase already treats that way -- see pendingPlayerAction
      // below). Clearing here, before this turn's own ensureConfigurationCardForContext
      // call runs, means: if THIS call is what recovery-creates the card, the
      // flag it sets survives for the rest of this turn; if the card was
      // instead recovery-created on a *prior* turn, this clears that stale
      // flag so ensureInitialized is unblocked starting now (D-032).
      delete context.state[CHRONICLE_CONFIG_RECOVERY_PENDING_KEY];
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
      const configuration = readChronicleConfiguration(context.storyCards?.storyCards ?? []);
      const additions = [
        text.includes(projection) ? undefined : projection,
        configuration.aiTemporalSignal && !text.includes(CHRONICLE_SIGNAL_BLOCK_START) ? chronicleSignalInstructionBlock() : undefined
      ].filter((value): value is string => value !== undefined);
      if (additions.length === 0) return nonEmptyText(text);
      const appended = additions.join("\n");
      if (context.maxChars !== undefined && text.length + appended.length + 1 > context.maxChars) return nonEmptyText(text);
      // Cache-efficient AI Dungeon models only accept additions after the
      // already-built context. Both the clock and the temporal protocol are
      // deliberately appended as one compact, fresh block.
      return nonEmptyText(`${text}\n${appended}`);
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
  return `${CHRONICLE_SIGNAL_BLOCK_START}\n<SYSTEM>\n# CHRONICLE TEMPORAL REPORT — REQUIRED OUTPUT HEADER\nBegin the response with exactly one header: <<${MODEL_TEMPORAL_SIGNAL_KEY}:PT#D#H#M#S,high|medium|low>>, then a newline, then the story prose. For no current-scene elapsed time, begin with <<${MODEL_TEMPORAL_SIGNAL_KEY}:none,high>>. A clock check, dialogue beat, plan, memory, dream, flashback, or hypothetical is none. Never mention this protocol in the story prose.\n# EXACT SHAPE\n<<${MODEL_TEMPORAL_SIGNAL_KEY}:PT30M,high>>\nThirty minutes later, story prose continues here.\n</SYSTEM>\n${CHRONICLE_SIGNAL_BLOCK_END}`;
}

/**
 * Chronicle v1 injected its protocol into Authors Note. The live test showed
 * that the narrator often omitted that report, so v2 appends a strict,
 * cache-compatible instruction in Context instead. Remove only the legacy
 * block from existing saves and leave every creator-owned note untouched.
 */
function syncSignalInstructionForContext(context: AIDungeonHookContext): void {
  const memory = context.state.memory;
  if (memory === null || typeof memory !== "object") return;
  const record = memory as Record<string, unknown>;
  if (typeof record.authorsNote !== "string") return;
  record.authorsNote = removeChronicleSignalBlock(record.authorsNote);
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
const CHRONICLE_CONFIG_RECOVERY_PENDING_KEY = "chronicleConfigRecoveryPending";

/**
 * Ensures the canonical "Configure Chronicle" card exists and is in canonical shape.
 *
 * NORMAL FLOW (D-032): this card is meant to already exist -- added once, directly in
 * the Scenario's own Story Cards editor (not via scripting), so AI Dungeon's documented
 * Scenario-to-Adventure copy behavior carries it into every new Adventure before any
 * script ever runs. In that flow this call always finds an existing card and simply
 * normalizes it if needed (D-030).
 *
 * RECOVERY FLOW: if the card is unexpectedly missing (deleted, or the Scenario creator
 * skipped the one-time setup step), this call creates it from scratch. Recovery
 * creation deliberately does NOT also initialize the timeline in the same turn --
 * see the `CHRONICLE_CONFIG_RECOVERY_PENDING_KEY` guard in `ensureInitialized` below --
 * so a creator who only discovers the card this way still gets a full turn to open it,
 * choose Automatic/Manual, and edit the Start fields before `state.chronicleRuntime` is
 * ever created. Runs on every hook, before the enabled check, so recovery happens as
 * early as possible. A failure here must never crash the turn: it is reported through
 * the same runtime-error channel as every other Chronicle diagnostic.
 */
function ensureConfigurationCardForContext(context: AIDungeonHookContext): void {
  if (context.storyCards === undefined) return;
  try {
    const result = ensureChronicleConfigurationCard(context.storyCards);
    if (result.status === "created") context.state[CHRONICLE_CONFIG_RECOVERY_PENDING_KEY] = true;
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
  // The configuration card was just recovery-created this turn (D-032): defer
  // initialization to a later turn instead of consuming Automatic/Manual and the
  // Start fields the same moment the card first appears, so a creator who only
  // discovers Chronicle through recovery still gets a real chance to edit it first.
  if (context.state[CHRONICLE_CONFIG_RECOVERY_PENDING_KEY] === true) return undefined;
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
