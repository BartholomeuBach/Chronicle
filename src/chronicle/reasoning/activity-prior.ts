import { createElapsedTime, type ElapsedTime, type ElapsedTimeInput } from "../calendar/elapsed-time.js";

/**
 * Optional fallback guidance for a recognizable activity. It is deliberately
 * only data: a Temporal Reasoner decides whether narrative evidence makes it
 * applicable.
 */
export interface ActivityPrior {
  readonly activity: string;
  readonly suggestedElapsedTime: ElapsedTime;
  readonly requiresContext?: boolean;
}

export interface ActivityPriorInput {
  readonly activity: string;
  readonly suggestedElapsedTime: ElapsedTimeInput;
  readonly requiresContext?: boolean;
}

export function createActivityPrior(input: ActivityPriorInput): ActivityPrior {
  const activity = input.activity.trim();
  if (activity.length === 0) {
    throw new RangeError("activity must contain non-whitespace text.");
  }

  return Object.freeze({
    activity,
    suggestedElapsedTime: createElapsedTime(input.suggestedElapsedTime),
    requiresContext: input.requiresContext
  });
}
