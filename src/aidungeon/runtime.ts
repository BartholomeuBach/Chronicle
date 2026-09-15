import { createTemporalLedger, type TemporalLedger } from "../chronicle/ledger/temporal-ledger.js";
import { recordTemporalDecision } from "../chronicle/ledger/record-temporal-decision.js";
import type { TemporalReasoner } from "../chronicle/reasoning/temporal-reasoner.js";
import { formatChronicleDateTime } from "../chronicle/state/format-chronicle-date-time.js";
import type { ChronicleState } from "../chronicle/state/chronicle-state.js";
import { syncChronicleStoryCard, type StoryCardRuntime } from "./story-cards/sync-chronicle-story-card.js";

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
      const current = read(context.state);
      if (current !== undefined) context.state[CHRONICLE_RUNTIME_STATE_KEY] = Object.freeze({ ...current, pendingPlayerAction: text });
      return nonEmptyText(text);
    },
    onContext(text: string, context: AIDungeonHookContext) {
      const current = read(context.state);
      if (current === undefined) return nonEmptyText(text);
      const projection = `Chronicle temporal state: ${formatChronicleDateTime(current.chronicleState.currentDateTime)}`;
      return nonEmptyText(text.includes(projection) ? text : `${projection}\n${text}`);
    },
    onOutput(text: string, context: AIDungeonHookContext) {
      const current = read(context.state);
      if (current === undefined || reasoner === undefined) return nonEmptyText(text);
      const decision = reasoner.decide({ currentState: current.chronicleState, playerAction: current.pendingPlayerAction, completedNarrative: text, activityPriors: [] });
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
function beatId(actionCount: number | undefined, text: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(hash ^ text.charCodeAt(index), 16_777_619);
  return `${actionCount ?? "unknown"}:${(hash >>> 0).toString(16)}`;
}
