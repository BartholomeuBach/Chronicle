import type { ChronicleDateTimeInput } from "../../chronicle/state/chronicle-state.js";
import type { AiDungeonStoryCard } from "./chronicle-story-card.js";
import type { StoryCardRuntime } from "./sync-chronicle-story-card.js";

/** Primary discovery identifier: the card's Name/Title, as shown in the AI Dungeon Story Card list. */
export const CHRONICLE_CONFIGURATION_TITLE = "Configure Chronicle";
/** Legacy/reserved identifier kept in `keys` so pre-existing cards are still discoverable by fallback. */
export const CHRONICLE_CONFIGURATION_KEY = "chronicle-configuration";
/** "class" is a simple native type validated in community scripts (Inner Self); not a Custom Type. */
export const CHRONICLE_CONFIGURATION_TYPE = "class";

const FIELD_LABELS: readonly (readonly [key: string, label: string])[] = [
  ["chronicle enabled", "Chronicle Enabled"],
  ["initialization mode", "Initialization Mode"],
  ["repair chronicle card", "Repair Chronicle Card"],
  ["ai temporal signal", "AI Temporal Signal"],
  ["start year", "Start Year"],
  ["start month", "Start Month"],
  ["start day", "Start Day"],
  ["start hour", "Start Hour"],
  ["start minute", "Start Minute"],
  ["start second", "Start Second"]
];
const RECOGNIZED_SETTING_KEYS: readonly string[] = FIELD_LABELS.map(([key]) => key);
const DEFAULT_SETTINGS: Readonly<Record<string, string>> = Object.freeze({
  "chronicle enabled": "true",
  "initialization mode": "Automatic",
  "repair chronicle card": "false",
  "ai temporal signal": "true",
  "start year": "",
  "start month": "",
  "start day": "",
  "start hour": "",
  "start minute": "",
  "start second": ""
});

/**
 * Editable settings, in the canonical Entry format. Notes/description carries help
 * text only. Field order and the two inline comments intentionally mirror the
 * "last pit-stop before the timeline starts" product framing (D-031): Chronicle
 * Enabled first, then the initialization choice (with its own "before the first
 * turn" reminder), then the Manual-only Start fields grouped together, then the
 * two ordinary runtime settings that stay live after initialization.
 */
export function renderConfigurationEntry(values: Readonly<Record<string, string>> = DEFAULT_SETTINGS): string {
  const value = (key: string) => values[key] ?? DEFAULT_SETTINGS[key];
  return [
    `Chronicle Enabled: ${value("chronicle enabled")}`,
    "",
    "# Choose your starting mode before playing the first turn:",
    `Initialization Mode: ${value("initialization mode")}`,
    "",
    "# Used only when Initialization Mode is Manual:",
    `Start Year: ${value("start year")}`,
    `Start Month: ${value("start month")}`,
    `Start Day: ${value("start day")}`,
    `Start Hour: ${value("start hour")}`,
    `Start Minute: ${value("start minute")}`,
    `Start Second: ${value("start second")}`,
    "",
    `AI Temporal Signal: ${value("ai temporal signal")}`,
    `Repair Chronicle Card: ${value("repair chronicle card")}`
  ].join("\n");
}
export const CHRONICLE_CONFIGURATION_DEFAULT_ENTRY = renderConfigurationEntry();

export const CHRONICLE_CONFIGURATION_NOTES = `CHRONICLE - QUICK START
Nothing to set up. Just play.
Chronicle starts its clock on its own.

Want your own starting date and time?
Edit the Entry of this card (not this Notes text),
set Initialization Mode to Manual and fill in the
Start fields. Do it before the first turn.

SETTINGS (edit them in the Entry)

Chronicle Enabled
  false pauses Chronicle. Your clock is kept.

Initialization Mode
  Automatic: date from today's New York date. The
  hour comes from the opening scene when it gives a
  clue ("dusk", a clock), otherwise from New York.
  Manual: you choose it with the Start fields.
  Read only once, before the first turn.

Start Year / Month / Day / Hour / Minute / Second
  Manual mode only. A blank field uses New York.

AI Temporal Signal
  Optional. The narrator may report elapsed time.
  Chronicle keeps the clock without it.

Repair Chronicle Card
  Only for a duplicate-cards error. Set true for
  one turn, then back to false.

TROUBLESHOOTING
- Time not moving? Check Chronicle Enabled is true
  and that only one card is named "Configure Chronicle".
- The first turn creates this card. The second turn
  starts the clock.
- History of time changes: Notes of the card
  "Chronicle Temporal State".`;

export type ChronicleInitializationMode = "automatic" | "manual";
export interface ChronicleConfiguration { readonly enabled: boolean; readonly mode: ChronicleInitializationMode; readonly initialDateTime?: ChronicleDateTimeInput; readonly repairChronicleCard: boolean; readonly aiTemporalSignal: boolean; readonly error?: string; }

const DISABLED_DEFAULT: ChronicleConfiguration = Object.freeze({ enabled: false, mode: "automatic", repairChronicleCard: false, aiTemporalSignal: true });

/**
 * Locates the configuration card by its canonical title first (primary), falling back
 * to the legacy `chronicle-configuration` identifier in `keys` for cards created before
 * the title-based scheme existed.
 */
export function findChronicleConfigurationCardIndex(storyCards: readonly AiDungeonStoryCard[]): number | undefined {
  const byTitle = storyCards.findIndex((card) => normalizedTitle(card.title) === CHRONICLE_CONFIGURATION_TITLE.toLowerCase());
  if (byTitle !== -1) return byTitle;
  const byKeys = storyCards.findIndex((card) => (card.keys ?? "").split(",").map((key) => key.trim()).includes(CHRONICLE_CONFIGURATION_KEY));
  return byKeys !== -1 ? byKeys : undefined;
}

/**
 * Reads the user-facing setup card. Settings are read from Entry (canonical); any
 * recognized setting still found only in Notes/description (legacy pre-migration
 * format) is used as a fallback so an un-migrated card keeps working exactly as before.
 * A missing card deliberately means disabled -- callers that want the card
 * auto-created should call `ensureChronicleConfigurationCard` first.
 */
export function readChronicleConfiguration(cards: readonly AiDungeonStoryCard[], currentDateTime?: ChronicleDateTimeInput): ChronicleConfiguration {
  const index = findChronicleConfigurationCardIndex(cards);
  if (index === undefined) return DISABLED_DEFAULT;
  const card = cards[index];
  const notesValues = pickRecognized(parseLines(card.description ?? ""));
  const entryValues = pickRecognized(parseLines(card.entry ?? ""));
  const values = { ...notesValues, ...entryValues };
  return buildConfiguration(values, currentDateTime ?? runtimeDateTime());
}

/**
 * Finds or creates the canonical configuration card, and normalizes an existing card
 * (legacy or already-canonical) toward the canonical shape: title, type "class", the
 * legacy key reserved in `keys`, settings living in Entry, and help text in Notes.
 * Never overwrites Entry values that already look like recognized settings, and never
 * overwrites Notes text unless it is empty, a known Chronicle-authored template, or
 * holds legacy settings being migrated out -- so a creator's own unrelated Notes text
 * is left untouched.
 *
 * Product framing (D-031): "Configure Chronicle" is meant to already exist as the last
 * configuration checkpoint before the story's timeline starts -- Automatic/enabled out
 * of the box, so a creator can simply ignore it and play, or open it once to switch to
 * Manual before their first turn. This function's create/migrate path is the *recovery*
 * mechanism for when the card is unexpectedly missing or still in a legacy shape, not
 * the normal onboarding step; it is called on every hook (before the enabled check)
 * specifically so recovery happens as early as possible, not because creating the card
 * late is the intended flow.
 */
export function ensureChronicleConfigurationCard(runtime: StoryCardRuntime): { readonly cardIndex: number; readonly status: "existing" | "migrated" | "created" } {
  const index = findChronicleConfigurationCardIndex(runtime.storyCards);
  if (index === undefined) {
    return Object.freeze({ cardIndex: createConfigurationCard(runtime), status: "created" });
  }
  const migrated = normalizeConfigurationCard(runtime.storyCards[index]);
  return Object.freeze({ cardIndex: index, status: migrated ? "migrated" : "existing" });
}

function createConfigurationCard(runtime: StoryCardRuntime): number {
  const createdIndex = runtime.addStoryCard(CHRONICLE_CONFIGURATION_KEY, CHRONICLE_CONFIGURATION_DEFAULT_ENTRY, CHRONICLE_CONFIGURATION_TYPE);
  const index = createdIndex !== false && runtime.storyCards[createdIndex] !== undefined ? createdIndex : findChronicleConfigurationCardIndex(runtime.storyCards);
  if (index === undefined) throw new Error("Chronicle configuration card could not be created or recovered.");
  const card = runtime.storyCards[index];
  card.title = CHRONICLE_CONFIGURATION_TITLE;
  card.type = CHRONICLE_CONFIGURATION_TYPE;
  if ((card.entry ?? "") === "") card.entry = CHRONICLE_CONFIGURATION_DEFAULT_ENTRY;
  card.description = CHRONICLE_CONFIGURATION_NOTES;
  return index;
}

function normalizeConfigurationCard(card: AiDungeonStoryCard): boolean {
  let changed = false;
  if (card.type !== CHRONICLE_CONFIGURATION_TYPE) {
    card.type = CHRONICLE_CONFIGURATION_TYPE;
    changed = true;
  }
  if (normalizedTitle(card.title) !== CHRONICLE_CONFIGURATION_TITLE.toLowerCase()) {
    card.title = CHRONICLE_CONFIGURATION_TITLE;
    changed = true;
  }
  const keyList = (card.keys ?? "").split(",").map((key) => key.trim()).filter((key) => key.length > 0);
  if (!keyList.includes(CHRONICLE_CONFIGURATION_KEY)) {
    card.keys = [...keyList, CHRONICLE_CONFIGURATION_KEY].join(",");
    changed = true;
  }

  const entryValues = parseLines(card.entry ?? "");
  const notesValues = parseLines(card.description ?? "");
  const entryHasRecognizedSettings = RECOGNIZED_SETTING_KEYS.some((key) => entryValues[key] !== undefined);
  const notesHasRecognizedSettings = RECOGNIZED_SETTING_KEYS.some((key) => notesValues[key] !== undefined);

  if (!entryHasRecognizedSettings) {
    // Migrate whatever legacy Notes-based settings exist (D-0xx compatibility path); default otherwise.
    card.entry = renderConfigurationEntry({ ...DEFAULT_SETTINGS, ...pickRecognized(notesValues) });
    changed = true;
  }

  if (notesHasRecognizedSettings || isKnownNotesTemplate(card.description)) {
    if (card.description !== CHRONICLE_CONFIGURATION_NOTES) {
      card.description = CHRONICLE_CONFIGURATION_NOTES;
      changed = true;
    }
  }
  return changed;
}

/** Chronicle-authored Notes text (any past or current template revision) is always safe to refresh; a creator's own custom text is not. */
function isKnownNotesTemplate(description: string | undefined): boolean {
  const trimmed = (description ?? "").trim();
  return trimmed === "" || trimmed.startsWith("# Chronicle") || trimmed.startsWith("Chronicle is ready to start") || trimmed.startsWith("CHRONICLE - QUICK START");
}

function buildConfiguration(values: Record<string, string>, currentDateTime: ChronicleDateTimeInput): ChronicleConfiguration {
  const enabled = (values["chronicle enabled"] ?? "true").toLowerCase() === "true";
  const mode = (values["initialization mode"] ?? "automatic").toLowerCase() === "manual" ? "manual" : "automatic";
  const repairChronicleCard = (values["repair chronicle card"] ?? "false").toLowerCase() === "true";
  const aiTemporalSignal = (values["ai temporal signal"] ?? "true").toLowerCase() === "true";
  const manual = mode === "manual" ? readManualDateTime(values, currentDateTime) : undefined;
  return Object.freeze({ enabled, mode, initialDateTime: manual?.initialDateTime, repairChronicleCard, aiTemporalSignal, error: manual?.error });
}

/** Uses the America/New_York civil time only for first-run convenience defaults. */
export function runtimeDateTime(now: Date = new Date()): ChronicleDateTimeInput {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return { year: value("year"), month: value("month"), day: value("day"), hour: value("hour"), minute: value("minute"), second: value("second") };
}

function normalizedTitle(title: string | undefined): string {
  return (title ?? "").trim().toLowerCase();
}

function pickRecognized(values: Record<string, string>): Record<string, string> {
  const picked: Record<string, string> = {};
  for (const key of RECOGNIZED_SETTING_KEYS) if (values[key] !== undefined) picked[key] = values[key];
  return picked;
}

function parseLines(text: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of text.split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator > 0) values[line.slice(0, separator).trim().toLowerCase()] = line.slice(separator + 1).trim();
  }
  return values;
}
function readManualDateTime(values: Record<string, string>, currentDateTime: ChronicleDateTimeInput): Pick<ChronicleConfiguration, "initialDateTime" | "error"> {
  const fields = [
    ["start year", "year"], ["start month", "month"], ["start day", "day"],
    ["start hour", "hour"], ["start minute", "minute"], ["start second", "second"]
  ] as const;
  const input: ChronicleDateTimeInput = { ...currentDateTime };
  for (const [field, component] of fields) {
    const raw = values[field];
    if (raw === undefined || raw === "") continue;
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed)) {
      return Object.freeze({ error: `Manual Chronicle configuration has an invalid ${field} value.` });
    }
    input[component] = parsed;
  }
  return Object.freeze({ initialDateTime: Object.freeze(input) });
}
