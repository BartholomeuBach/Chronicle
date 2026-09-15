import { createTemporalLedger, type TemporalLedger } from "../chronicle/ledger/temporal-ledger.js";
import { recordTemporalDecision } from "../chronicle/ledger/record-temporal-decision.js";
import type { TemporalReasoner } from "../chronicle/reasoning/temporal-reasoner.js";
import { DEFAULT_ACTIVITY_PRIORS } from "../chronicle/reasoning/activity-prior-catalog.js";
import { formatChronicleDateTime } from "../chronicle/state/format-chronicle-date-time.js";
import type { ChronicleState } from "../chronicle/state/chronicle-state.js";
import { syncChronicleStoryCard, type StoryCardRuntime } from "./story-cards/sync-chronicle-story-card.js";
import { readChronicleConfiguration, runtimeDateTime } from "./story-cards/chronicle-configuration.js";
import { initializeChronicleState } from "../chronicle/state/initialize-chronicle-state.js";

export const CHRONICLE_RUNTIME_STATE_KEY = "chronicleRuntime";
export interface ChroniclePersistentRuntimeState { readonly chronicleState: ChronicleState; readonly ledger: TemporalLedger; readonly pendingPlayerAction: string | undefined; }
export interface AIDungeonHookContext { readonly state: Record<string, unknown>; readonly actionCount?: number; readonly storyCards?: StoryCardRuntime; }
export interface ChronicleRuntime {
  onInput(text: string, context: AIDungeonHookContext): string;
  onContext(text: string, context: AIDungeonHookContext): string;
  onOutput(text: string, context: AIDungeonHookContext): string;
}

/**
 * AI Dungeon treats empty Input and Output text as a script error. A zero-width
 * placeholder keeps the Phase 0 adapter safe without altering non-empty prose.
 */
export function nonEmptyText(text: string): string {
  return text === "" ? "\u200B" : text;
}

export function initializeChronicleRuntime(state: Record<string, unknown>, chronicleState: ChronicleState): void {
  state[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ chronicleState, ledger: createTemporalLedger(), pendingPlayerAction: undefined });
}

export function createChronicleRuntime(reasoner?: TemporalReasoner): ChronicleRuntime {
  return Object.freeze({
    onInput(text: string, context: AIDungeonHookContext) {
      if (!enabled(context)) return nonEmptyText(text);
      const current = ensureInitialized(context);
      if (current !== undefined) context.state[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ ...current, pendingPlayerAction: text });
      return nonEmptyText(text);
    },
    onContext(text: string, context: AIDungeonHookContext) {
      if (!enabled(context)) return nonEmptyText(text);
      const current = ensureInitialized(context);
      if (current === undefined) return nonEmptyText(text);
      const projection = `Chronicle temporal state: ${formatChronicleDateTime(current.chronicleState.currentDateTime)}`;
      return nonEmptyText(text.includes(projection) ? text : `${projection}\n${text}`);
    },
    onOutput(text: string, context: AIDungeonHookContext) {
      if (!enabled(context)) return nonEmptyText(text);
      const current = ensureInitialized(context);
      if (current === undefined || reasoner === undefined) return nonEmptyText(text);
      const decision = reasoner.decide({ currentState: current.chronicleState, playerAction: current.pendingPlayerAction, completedNarrative: text, activityPriors: DEFAULT_ACTIVITY_PRIORS });
      const recorded = recordTemporalDecision({ state: current.chronicleState, ledger: current.ledger, beatId: beatId(context.actionCount, text), decision, actionInterpretation: decision.rationale, confidence: decision.confidence ?? "low" });
      context.state[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ chronicleState: recorded.state, ledger: recorded.ledger, pendingPlayerAction: undefined });
      if (context.storyCards !== undefined) syncChronicleStoryCard(context.storyCards, recorded.state, recorded.ledger);
      return nonEmptyText(text);
    }
  });
}

export const passthroughRuntime: ChronicleRuntime = createChronicleRuntime();

function read(state: Record<string, unknown>): ChroniclePersistentRuntimeState | undefined {
  const value = state[CHRONICLE_RUNTIME_STATE_KEY];
  return value !== null && typeof value === "object" && "chronicleState" in value && "ledger" in value ? value as ChroniclePersistentRuntimeState : undefined;
}
function enabled(context: AIDungeonHookContext): boolean { return context.storyCards !== undefined && readChronicleConfiguration(context.storyCards.storyCards).enabled; }
function ensureInitialized(context: AIDungeonHookContext): ChroniclePersistentRuntimeState | undefined {
  const existing = read(context.state);
  if (existing !== undefined) return existing;
  if (context.storyCards === undefined) return undefined;
  const configuration = readChronicleConfiguration(context.storyCards.storyCards);
  if (!configuration.enabled) return undefined;
  initializeChronicleRuntime(context.state, initializeChronicleState(configuration.initialDateTime ?? runtimeDateTime()));
  return read(context.state);
}
function beatId(actionCount: number | undefined, text: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16_777_619);
  return `${actionCount ?? "unknown"}:${(hash >>> 0).toString(16)}`;
}
