import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createContext, runInContext } from "node:vm";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(repositoryRoot, "dist", "aidungeon");

/**
 * End-to-end behavior check of the four published artifacts.
 *
 * Unit tests import `src/`; this runs the exact `dist/aidungeon/*.js` files a
 * player pastes into AI Dungeon, one hook at a time, against fake sandbox
 * globals (`text`, `state`, `info`, `history`, `storyCards`, ...). Each hook
 * gets a fresh V8 context with Library evaluated first, and only `state` and
 * the Story Cards persist between hooks, as in the real platform. It therefore
 * catches what unit tests cannot: bundling mistakes, a missing global, and any
 * behavior a player would actually see in the text returned by Output.
 *
 * It is a model of the platform, not the platform: it cannot prove how the real
 * AI Dungeon treats Undo, Retry, or Continue.
 */
const artifacts = Object.fromEntries(["Library", "Input", "Context", "Output"].map((name) => [name, readFileSync(resolve(distDir, `${name}.js`), "utf8")]));

function configurationCard({ signal, manual, hour, minute }) {
  const entry = [
    "Chronicle Enabled: true",
    `Initialization Mode: ${manual ? "Manual" : "Automatic"}`,
    "Start Year: 2026", "Start Month: 4", "Start Day: 13", `Start Hour: ${hour}`, `Start Minute: ${minute}`, "Start Second: 0",
    `AI Temporal Signal: ${signal}`, "Repair Chronicle Card: false"
  ].join("\n");
  return { keys: "chronicle-configuration", title: "Configure Chronicle", entry, type: "class", description: "" };
}

function newSession({ signal = false, manual = true, hour = 14, minute = 0, maxChars = 20_000 } = {}) {
  return { state: {}, storyCards: [configurationCard({ signal, manual, hour, minute })], history: [], maxChars };
}

function runHook(hook, session, text, info) {
  const cards = session.storyCards;
  const context = createContext({
    text, state: session.state, info, history: session.history, storyCards: cards,
    addStoryCard: (keys, entry, type) => { cards.push({ keys, entry, type }); return cards.length - 1; },
    updateStoryCard: (index, keys, entry, type) => { Object.assign(cards[index], { keys, entry, type }); },
    removeStoryCard: (index) => { cards.splice(index, 1); }
  });
  runInContext(artifacts.Library, context);
  return runInContext(artifacts[hook], context).text;
}

/** One full turn: Input, Context, the (fake) model reply, then Output. */
function playTurn(session, action, modelReply, actionCount) {
  const info = { actionCount, maxChars: session.maxChars, memoryLength: 0 };
  runHook("Input", session, action, info);
  const contextText = runHook("Context", session, `${session.history.map((entry) => entry.text).join("\n")}\n${action}`, info);
  const reply = typeof modelReply === "function" ? modelReply(contextText) : modelReply;
  return { contextText, shown: runHook("Output", session, reply, info) };
}

function clock(session) {
  const dateTime = session.state.chronicleRuntime?.chronicleState?.currentDateTime;
  if (dateTime === undefined) return "(uninitialized)";
  const pad = (value) => String(value).padStart(2, "0");
  return `${dateTime.year}-${pad(dateTime.month)}-${pad(dateTime.day)} ${pad(dateTime.hour)}:${pad(dateTime.minute)}`;
}

const failures = [];
let passed = 0;
function check(name, actual, expected) {
  if (actual === expected) { passed += 1; return; }
  failures.push(`${name}\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`);
}

// --- Baseline: the clock advances, holds, and is shown to the narrator ------
{
  const session = newSession();
  const first = playTurn(session, "> You look around.", "The room is quiet.", 1);
  check("baseline: manual start initializes on the first turn", clock(session), "2026-04-13 14:00");
  check("baseline: Context appends the current clock", first.contextText.includes("[Chronicle]") && first.contextText.includes("2026/04/13 14:00:00"), true);
  playTurn(session, "> You wait.", "Two hours later, the sun is low.", 2);
  check("baseline: an explicit duration advances the clock", clock(session), "2026-04-13 16:00");
  playTurn(session, "> You check the clock.", "You glance at the clock. It reads 4:00 PM.", 3);
  check("baseline: a clock check does not advance the clock", clock(session), "2026-04-13 16:00");
}

// --- Retry with the same actionCount must not be charged twice ---------------
{
  const session = newSession();
  playTurn(session, "> You wait.", "Two hours later, the moon rises.", 1);
  playTurn(session, "> You wait.", "Two hours later, the moon rises over the roofs.", 1);
  check("retry: the same actionCount never counts twice", clock(session), "2026-04-13 16:00");
}

// --- The AI protocol is only requested when enabled ---------------------------
{
  const on = playTurn(newSession({ signal: true }), "> Look.", "Quiet.", 1);
  check("signal on: Context carries the temporal report request", on.contextText.includes("CHRONICLE OUTPUT FORMAT"), true);
  const off = playTurn(newSession({ signal: false }), "> Look.", "Quiet.", 1);
  check("signal off: Context does not carry the request", off.contextText.includes("CHRONICLE OUTPUT FORMAT"), false);
}

// --- A valid model tag is honoured and never shown ----------------------------
{
  const session = newSession({ signal: true });
  const turn = playTurn(session, "> Work.", "<<chronicle:PT2H,high>>\nHours pass as you sort the crates.", 1);
  check("model tag: shown text has no control marker", turn.shown, "Hours pass as you sort the crates.");
  check("model tag: the reported duration is applied", clock(session), "2026-04-13 16:00");
}

// --- Control markers must never reach the player -------------------------------
{
  const markers = [
    ["bootstrap 'none' completion", "none,high>>\nThe alley smells of rain."],
    ["bootstrap 'none' without confidence", "none>>\nThe alley smells of rain."],
    ["bootstrap clock completion", "19:30,high>>\nThe alley smells of rain."],
    ["capitalised directive", "<<Chronicle:PT30M,high>>\nThe alley smells of rain."],
    ["single-bracket directive", "<chronicle:PT30M,high>\nThe alley smells of rain."],
    ["truncated directive", "The alley smells of rain. <<chronicle:PT30"]
  ];
  for (const [name, reply] of markers) {
    const shown = playTurn(newSession({ signal: true, manual: false }), "> Look.", reply, 1).shown;
    check(`no leak: ${name}`, shown, "The alley smells of rain.");
  }
}

// --- Automatic bootstrap: prefill is requested and its answer is used ---------
{
  const session = newSession({ signal: true, manual: false });
  let endsWithPrefill = false;
  playTurn(session, "> Look.", (contextText) => { endsWithPrefill = contextText.endsWith("<<chronicle:start:"); return "19:30,high>>\nRain taps the glass."; }, 1);
  check("bootstrap: Context ends with the prefill", endsWithPrefill, true);
  check("bootstrap: the narrator's hour and minute are applied", /\d{4}-\d{2}-\d{2} 19:30/.test(clock(session)), true);
}

// --- A descriptive time-of-day phrase must not skip most of a day --------------
// Both with and without the AI signal: a narrator that omits its tag is the common live case.
for (const signal of [false, true]) {
  const clockAfter = (hour, minute, reply) => {
    const session = newSession({ signal, hour, minute });
    playTurn(session, "> You continue.", reply, 1);
    return clock(session);
  };
  const label = `signal ${signal ? "on, tag absent" : "off"}`;
  check(`transition (${label}): waking from a nap stays put`, clockAfter(14, 0, "You woke up with a start, heart pounding."), "2026-04-13 14:00");
  check(`transition (${label}): a descriptive 'Night fell' stays put`, clockAfter(21, 30, "Night fell over the harbor as the guards changed shifts."), "2026-04-13 21:30");
  check(`transition (${label}): a descriptive 'morning came' stays put`, clockAfter(7, 0, "The fog lifts and morning came softly over the hills."), "2026-04-13 07:00");
  check(`transition (${label}): waking after a night's sleep still reaches morning`, clockAfter(23, 0, "You woke up, stiff and cold."), "2026-04-14 06:00");
}

if (failures.length > 0) {

  console.error(`dist behavior check failed (${failures.length} of ${failures.length + passed}):\n`);
  for (const failure of failures) console.error(`  - ${failure}\n`);
  process.exit(1);
}
console.log(`AI Dungeon artifacts behave as expected end to end (${passed} checks).`);
