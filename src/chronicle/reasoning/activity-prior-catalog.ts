import { createActivityPrior, type ActivityPrior } from "./activity-prior.js";

export interface ActivityPriorCatalogEntry extends ActivityPrior {
  readonly category: "movement" | "routine" | "social" | "exploration" | "adventure" | "rest";
}

type EntryInput = Omit<ActivityPriorCatalogEntry, "suggestedElapsedTime"> & { readonly minutes: number };
const entries: readonly EntryInput[] = [
  ...["walk", "stroll", "cross the room", "go upstairs", "go downstairs", "enter", "leave", "open the door"].map((activity) => ({ activity, category: "movement" as const, minutes: 2 })),
  ...["run", "jog", "climb", "swim", "ride", "drive", "row a boat"].map((activity) => ({ activity, category: "movement" as const, minutes: 5 })),
  ...["wash", "shower", "bathe", "dress", "change clothes", "brush teeth", "make breakfast", "cook", "eat", "clean", "do laundry", "shop"].map((activity) => ({ activity, category: "routine" as const, minutes: 10 })),
  ...["talk", "chat", "argue", "negotiate", "flirt", "meet", "say goodbye", "listen"].map((activity) => ({ activity, category: "social" as const, minutes: 5 })),
  ...["search", "inspect", "investigate", "scout", "patrol", "look around", "explore a room", "read a letter"].map((activity) => ({ activity, category: "exploration" as const, minutes: 10 })),
  ...["pack supplies", "organize inventory", "craft", "repair", "train", "practice", "study", "read", "write"].map((activity) => ({ activity, category: "adventure" as const, minutes: 15 })),
  ...["rest", "sit down", "wait", "meditate"].map((activity) => ({ activity, category: "rest" as const, minutes: 5 })),
  ...["travel", "journey", "hike", "march", "sail", "fight", "battle", "sleep", "nap", "ritual", "heal"].map((activity) => ({ activity, category: "adventure" as const, minutes: 0, requiresContext: true }))
];

export const ACTIVITY_PRIOR_CATALOG: readonly ActivityPriorCatalogEntry[] = Object.freeze(entries.map((entry) => Object.freeze({
  ...createActivityPrior({ activity: entry.activity, suggestedElapsedTime: { days: 0, hours: 0, minutes: entry.minutes, seconds: 0 }, requiresContext: entry.requiresContext }),
  category: entry.category
})));

/** Active baseline: intentionally excludes broad actions that require narrative context. */
export const DEFAULT_ACTIVITY_PRIORS: readonly ActivityPrior[] = Object.freeze(
  ACTIVITY_PRIOR_CATALOG.filter((entry) => entry.requiresContext !== true)
);
