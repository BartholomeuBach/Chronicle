import { createActivityPrior, type ActivityPrior } from "./activity-prior.js";

export interface ActivityPriorCatalogEntry extends ActivityPrior {
  readonly category:
    | "movement"
    | "routine"
    | "chores"
    | "food"
    | "social"
    | "exploration"
    | "combat"
    | "crafting"
    | "rest"
    | "travel"
    | "commerce"
    | "animal-care"
    | "performance"
    | "medical"
    | "magic"
    | "stealth"
    | "survival"
    | "worship"
    | "learning"
    | "adventure";
}

type EntryInput = Omit<ActivityPriorCatalogEntry, "suggestedElapsedTime"> & { readonly minutes: number };

/**
 * Fallback durations only, always ranked below narrative/contextual evidence
 * in the Reasoner (see `decide()` in `rule-based-temporal-reasoner.ts`): this
 * catalog is consulted only after every stronger evidence tier has found
 * nothing. Expanding it never turns it into a whitelist of "the only
 * activities Chronicle understands" — an activity absent here still reaches
 * the conservative fallback exactly as before, and any activity present here
 * is still overridden the moment the narrative states its own duration.
 *
 * Expanded 2026-09-16 from 67 to ~200 entries, at the project owner's
 * explicit, scoped request: common, narratively useful actions across
 * interactive fiction/RPG scenes, grouped by category, each with a duration
 * most readers would agree on at a glance. Activities whose real-world
 * duration varies too widely to have a single defensible default (hunting,
 * fishing, a duel, a siege, a full ritual, a night's sleep, cross-country
 * travel, ...) are deliberately excluded from a fixed value and either left
 * out entirely or added to the existing `requiresContext: true` group below,
 * which `DEFAULT_ACTIVITY_PRIORS` filters out of the active baseline the
 * same way the original set already did.
 */
const entries: readonly EntryInput[] = [
  // --- movement ---
  ...["walk", "stroll", "cross the room", "go upstairs", "go downstairs", "enter", "leave", "open the door"].map((activity) => ({ activity, category: "movement" as const, minutes: 2 })),
  ...["run", "jog", "climb", "swim", "ride", "drive", "row a boat"].map((activity) => ({ activity, category: "movement" as const, minutes: 5 })),
  ...["step outside", "step inside", "wade across a stream", "crawl through a tunnel", "squeeze through a gap", "duck through a doorway"].map((activity) => ({ activity, category: "movement" as const, minutes: 2 })),

  // --- routine / self-care ---
  ...["wash", "shower", "bathe", "dress", "change clothes", "brush teeth", "make breakfast", "cook", "eat", "clean", "do laundry", "shop"].map((activity) => ({ activity, category: "routine" as const, minutes: 10 })),
  ...["comb your hair", "shave", "tie your shoes", "put on armor", "take off armor"].map((activity) => ({ activity, category: "routine" as const, minutes: 5 })),
  ...["groom yourself", "braid hair", "polish boots"].map((activity) => ({ activity, category: "routine" as const, minutes: 10 })),

  // --- household chores ---
  ...["sweep the floor", "mop the floor", "dust the shelves", "wash the dishes", "fold the laundry", "make the bed", "tidy the room", "feed the fire", "chop kindling"].map((activity) => ({ activity, category: "chores" as const, minutes: 10 })),
  ...["scrub the floor", "mend a fence"].map((activity) => ({ activity, category: "chores" as const, minutes: 15 })),

  // --- food & dining ---
  ...["pour a drink", "serve a meal", "set the table"].map((activity) => ({ activity, category: "food" as const, minutes: 5 })),
  ...["prepare a meal", "bake bread", "brew tea"].map((activity) => ({ activity, category: "food" as const, minutes: 15 })),
  ...["roast meat over a fire"].map((activity) => ({ activity, category: "food" as const, minutes: 20 })),
  ...["cook a feast"].map((activity) => ({ activity, category: "food" as const, minutes: 90 })),

  // --- social ---
  ...["talk", "chat", "argue", "negotiate", "flirt", "meet", "say goodbye", "listen"].map((activity) => ({ activity, category: "social" as const, minutes: 5 })),
  ...["introduce yourself", "apologize", "thank someone", "compliment", "gossip"].map((activity) => ({ activity, category: "social" as const, minutes: 5 })),
  ...["have a conversation", "console", "comfort", "interrogate"].map((activity) => ({ activity, category: "social" as const, minutes: 15 })),

  // --- exploration & investigation ---
  ...["search", "inspect", "investigate", "scout", "patrol", "look around", "explore a room", "read a letter"].map((activity) => ({ activity, category: "exploration" as const, minutes: 10 })),
  ...["peek through a window", "peer around a corner", "listen at a door"].map((activity) => ({ activity, category: "exploration" as const, minutes: 5 })),
  ...["search a room thoroughly", "examine a body", "study a map", "search for clues"].map((activity) => ({ activity, category: "exploration" as const, minutes: 15 })),

  // --- combat preparation (the fight itself stays requiresContext, below) ---
  ...["draw a weapon", "sheath a weapon", "nock an arrow", "don a helmet", "raise a shield", "take aim"].map((activity) => ({ activity, category: "combat" as const, minutes: 2 })),
  ...["sharpen a blade", "string a bow"].map((activity) => ({ activity, category: "combat" as const, minutes: 5 })),

  // --- crafting & skill ---
  ...["pack supplies", "organize inventory", "craft", "repair", "train", "practice", "study", "read", "write"].map((activity) => ({ activity, category: "adventure" as const, minutes: 15 })),
  ...["sew a garment", "carve a figure", "sketch a drawing", "paint a picture", "compose a song", "tune an instrument"].map((activity) => ({ activity, category: "crafting" as const, minutes: 15 })),
  ...["brew a potion", "enchant an item"].map((activity) => ({ activity, category: "crafting" as const, minutes: 30 })),
  ...["forge a blade"].map((activity) => ({ activity, category: "crafting" as const, minutes: 60 })),

  // --- rest & recovery ---
  ...["rest", "sit down", "wait", "meditate"].map((activity) => ({ activity, category: "rest" as const, minutes: 5 })),
  ...["catch your breath", "take a break", "stretch"].map((activity) => ({ activity, category: "rest" as const, minutes: 5 })),
  ...["doze off"].map((activity) => ({ activity, category: "rest" as const, minutes: 10 })),
  ...["rest by the fire"].map((activity) => ({ activity, category: "rest" as const, minutes: 60 })),

  // --- travel preparation (the journey itself stays requiresContext, below) ---
  ...["saddle a horse", "unsaddle a horse", "load the wagon", "moor the ship", "board a ship", "disembark"].map((activity) => ({ activity, category: "travel" as const, minutes: 5 })),
  ...["check the map"].map((activity) => ({ activity, category: "travel" as const, minutes: 10 })),

  // --- commerce & shopping ---
  ...["haggle", "pay for goods", "browse a stall"].map((activity) => ({ activity, category: "commerce" as const, minutes: 5 })),
  ...["shop for supplies", "visit the market", "buy provisions"].map((activity) => ({ activity, category: "commerce" as const, minutes: 15 })),

  // --- animal care ---
  ...["feed the horse", "groom the horse", "milk a cow", "muck the stable", "tend the animals", "water the livestock"].map((activity) => ({ activity, category: "animal-care" as const, minutes: 10 })),

  // --- performance & entertainment ---
  ...["sing a song", "tell a joke", "play a tune"].map((activity) => ({ activity, category: "performance" as const, minutes: 5 })),
  ...["perform a dance", "tell a story", "recite a poem"].map((activity) => ({ activity, category: "performance" as const, minutes: 15 })),

  // --- medical & first aid (non-magical; the broader "heal" stays requiresContext, below) ---
  ...["bandage a wound", "apply a poultice", "clean a wound"].map((activity) => ({ activity, category: "medical" as const, minutes: 5 })),
  ...["tend to the wounded", "stitch a wound"].map((activity) => ({ activity, category: "medical" as const, minutes: 15 })),

  // --- magic (small, bounded acts; the full "ritual" stays requiresContext, below) ---
  ...["cast a spell", "light a candle", "chant a phrase"].map((activity) => ({ activity, category: "magic" as const, minutes: 2 })),
  ...["prepare a spell", "inscribe a scroll"].map((activity) => ({ activity, category: "magic" as const, minutes: 10 })),

  // --- stealth & subterfuge ---
  ...["sneak", "hide", "tiptoe", "eavesdrop"].map((activity) => ({ activity, category: "stealth" as const, minutes: 2 })),
  ...["pick a lock", "pick a pocket", "disguise yourself"].map((activity) => ({ activity, category: "stealth" as const, minutes: 10 })),

  // --- nature & survival ---
  ...["forage for food", "gather herbs", "collect firewood", "start a fire", "set a trap"].map((activity) => ({ activity, category: "survival" as const, minutes: 10 })),
  ...["set up camp", "break camp"].map((activity) => ({ activity, category: "survival" as const, minutes: 15 })),
  ...["build a shelter"].map((activity) => ({ activity, category: "survival" as const, minutes: 30 })),

  // --- worship ---
  ...["pray", "give an offering", "light incense"].map((activity) => ({ activity, category: "worship" as const, minutes: 5 })),
  ...["attend a ceremony"].map((activity) => ({ activity, category: "worship" as const, minutes: 20 })),

  // --- learning & knowledge ---
  ...["do research", "decipher a text", "review your notes"].map((activity) => ({ activity, category: "learning" as const, minutes: 15 })),
  ...["study a tome"].map((activity) => ({ activity, category: "learning" as const, minutes: 30 })),

  // --- activities whose real duration is too context-dependent for any single
  //     default (kept excluded from DEFAULT_ACTIVITY_PRIORS below, exactly like
  //     the original set) ---
  ...["travel", "journey", "hike", "march", "sail", "fight", "battle", "sleep", "nap", "ritual", "heal"].map((activity) => ({ activity, category: "adventure" as const, minutes: 0, requiresContext: true })),
  ...["hunt", "fish"].map((activity) => ({ activity, category: "survival" as const, minutes: 0, requiresContext: true }))
];

export const ACTIVITY_PRIOR_CATALOG: readonly ActivityPriorCatalogEntry[] = Object.freeze(entries.map((entry) => Object.freeze({
  ...createActivityPrior({ activity: entry.activity, suggestedElapsedTime: { days: 0, hours: 0, minutes: entry.minutes, seconds: 0 }, requiresContext: entry.requiresContext }),
  category: entry.category
})));

/** Active baseline: intentionally excludes broad actions that require narrative context. */
export const DEFAULT_ACTIVITY_PRIORS: readonly ActivityPrior[] = Object.freeze(
  ACTIVITY_PRIOR_CATALOG.filter((entry) => entry.requiresContext !== true)
);
