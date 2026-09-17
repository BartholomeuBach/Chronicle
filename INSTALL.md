# Installing Chronicle in AI Dungeon

> The friendly, quick-start version of this guide now also lives in [`README.md`](./README.md), under
> its "Installation" section. This document is the fuller, evidence-labeled version referenced by
> `agent_documentation/PROJECT_PLANNING.md` (Phase 7) — the two should never disagree; if they ever
> drift, treat this one as authoritative for the locally-validated/requires-in-app-validation split.
> Every `agent_documentation/...` path mentioned below is this project's internal, maintainer-facing
> documentation — deliberately not part of the public repository, so those paths aren't clickable
> links here and won't resolve if you go looking for them on GitHub.

This is the Phase 7 "ready-to-install" package instructions: how to paste Chronicle into a
supported AI Dungeon Scenario. It assumes no source-code knowledge, but it does assume you can
open a Scenario's **Details -> Scripting** tabs and create a Story Card.

**What "ready-to-install" means here, precisely:** the four scripts below compile, pass Chronicle's
full local test suite, and produce self-contained artifacts with no unresolved imports (verified by
`npm run check`, see `agent_documentation/06_testing_strategy.md`). It does **not** mean any of this
has been confirmed to work inside a real AI Dungeon Scenario yet — that is a separate step (Phase 8,
below). Every claim in this document is either **locally validated** (proven by an automated test
you can re-run yourself) or **requires in-app validation** (an assumption about how AI Dungeon's
runtime behaves, not yet observed). Where that distinction matters, it is called out explicitly.

## 1. Get the four script files — no clone, no Node, no build

**You do not need to clone this repository, install Node/npm, or run any build command to install
Chronicle.** `Library.js` is Chronicle's actual engine, big enough to need its own file (linked
below); `Input.js`, `Context.js`, and `Output.js` are each ~20 lines and pasted directly below,
same as `Library.js`'s content would be if it weren't too long for this to stay readable.

| File | AI Dungeon tab | How to get it |
|---|---|---|
| `Library.js` | **Library** | Open <https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Library.js>, click the **copy** icon in the top-right corner (or select all and copy). |
| `Input.js` | **Input** | Copy the block in step 2 of section 2, below. |
| `Context.js` | **Context** | Copy the block in step 3 of section 2, below. |
| `Output.js` | **Output** | Copy the block in step 4 of section 2, below. |

Each file is self-contained (no `import`/`require`, verified by `npm run verify:dist`) and is
meant to be pasted whole into its matching tab, replacing that tab's contents.

**Locally validated, not a claim about GitHub:** two CI checks, both part of `npm run check`
(wired into `.github/workflows/check.yml`), keep all four in sync with source automatically —
`verify:dist:fresh` for the `dist/aidungeon/*.js` files themselves, `verify:embedded-snippets` for
the three copies pasted into this document and `README.md` below. Either fails the build the moment
source and an installable copy — file or pasted snippet — disagree. That guarantees `main`'s
content is internally consistent; it does not mean GitHub itself is guaranteed available or
unaltered, which is the same trust boundary as for any GitHub-hosted file or page.

<sub>Building from source (`npm install && npm run build`) exists only for developers modifying
Chronicle's TypeScript. It regenerates these same four files in place; it has never been required
to install Chronicle. `npm run verify:dist` checks the build's structural validity (self-contained,
`modifier(text)` present); `npm run verify:dist:fresh` and `npm run verify:embedded-snippets`
separately check that the build and this document's pasted copies match what's committed — see
`06_testing_strategy.md` in this project's internal `agent_documentation/` (not part of the public
repo) for how these compose into `npm run check`.</sub>

## 2. Paste the scripts, Library first

The operational rule is simple: **paste and save Library first, then paste Input/Context/Output,
then save again.**

1. Open your Scenario's **Details -> Scripting**. Paste `Library.js` (from section 1 above) into
   the **Library** tab, then **save now**, before touching the other three tabs.
2. Select the `Input` tab, delete everything in it, and paste this:

   <!-- chronicle:dist-embed:Input:start -->
   ```js
   // Chronicle — paste this file into the AI Dungeon Input script tab.
   "use strict";
   (() => {
     // src/aidungeon/non-empty-text.ts
     function nonEmptyText(text2) {
       return text2 === "" ? "\u200B" : text2;
     }

     // src/aidungeon/runtime-guards.ts
     function isPlainObject(value) {
       return typeof value === "object" && value !== null && !Array.isArray(value);
     }
     function usableStoryCardGlobals(storyCards2, addStoryCard2, updateStoryCard2, removeStoryCard2) {
       if (!Array.isArray(storyCards2) || typeof addStoryCard2 !== "function" || typeof updateStoryCard2 !== "function") return void 0;
       return {
         storyCards: storyCards2,
         addStoryCard: addStoryCard2,
         updateStoryCard: updateStoryCard2,
         removeStoryCard: typeof removeStoryCard2 === "function" ? removeStoryCard2 : void 0
       };
     }

     // src/aidungeon/input.ts
     var modifier = (value) => {
       var _a, _b;
       const safeText = typeof value === "string" ? value : "";
       return {
         text: isPlainObject(state) ? (_b = (_a = globalThis.ChronicleAIDungeon) == null ? void 0 : _a.onInput(safeText, {
           state,
           actionCount: info == null ? void 0 : info.actionCount,
           storyCards: usableStoryCardGlobals(storyCards, addStoryCard, updateStoryCard, removeStoryCard)
         })) != null ? _b : nonEmptyText(safeText) : nonEmptyText(safeText)
       };
     };
     modifier(text);
   })();
   ```
   <!-- chronicle:dist-embed:Input:end -->

3. Select the `Context` tab, delete everything in it, and paste this:

   <!-- chronicle:dist-embed:Context:start -->
   ```js
   // Chronicle — paste this file into the AI Dungeon Context script tab.
   "use strict";
   (() => {
     // src/aidungeon/non-empty-text.ts
     function nonEmptyText(text2) {
       return text2 === "" ? "\u200B" : text2;
     }

     // src/aidungeon/runtime-guards.ts
     function isPlainObject(value) {
       return typeof value === "object" && value !== null && !Array.isArray(value);
     }
     function usableStoryCardGlobals(storyCards2, addStoryCard2, updateStoryCard2, removeStoryCard2) {
       if (!Array.isArray(storyCards2) || typeof addStoryCard2 !== "function" || typeof updateStoryCard2 !== "function") return void 0;
       return {
         storyCards: storyCards2,
         addStoryCard: addStoryCard2,
         updateStoryCard: updateStoryCard2,
         removeStoryCard: typeof removeStoryCard2 === "function" ? removeStoryCard2 : void 0
       };
     }

     // src/aidungeon/context.ts
     var modifier = (value) => {
       var _a, _b;
       const safeText = typeof value === "string" ? value : "";
       return {
         text: isPlainObject(state) ? (_b = (_a = globalThis.ChronicleAIDungeon) == null ? void 0 : _a.onContext(safeText, {
           state,
           actionCount: info == null ? void 0 : info.actionCount,
           maxChars: info == null ? void 0 : info.maxChars,
           memoryLength: info == null ? void 0 : info.memoryLength,
           storyCards: usableStoryCardGlobals(storyCards, addStoryCard, updateStoryCard, removeStoryCard)
         })) != null ? _b : nonEmptyText(safeText) : nonEmptyText(safeText)
       };
     };
     modifier(text);
   })();
   ```
   <!-- chronicle:dist-embed:Context:end -->

4. Select the `Output` tab, delete everything in it, and paste this:

   <!-- chronicle:dist-embed:Output:start -->
   ```js
   // Chronicle — paste this file into the AI Dungeon Output script tab.
   "use strict";
   (() => {
     // src/aidungeon/non-empty-text.ts
     function nonEmptyText(text2) {
       return text2 === "" ? "\u200B" : text2;
     }

     // src/aidungeon/runtime-guards.ts
     function isPlainObject(value) {
       return typeof value === "object" && value !== null && !Array.isArray(value);
     }
     function usableStoryCardGlobals(storyCards2, addStoryCard2, updateStoryCard2, removeStoryCard2) {
       if (!Array.isArray(storyCards2) || typeof addStoryCard2 !== "function" || typeof updateStoryCard2 !== "function") return void 0;
       return {
         storyCards: storyCards2,
         addStoryCard: addStoryCard2,
         updateStoryCard: updateStoryCard2,
         removeStoryCard: typeof removeStoryCard2 === "function" ? removeStoryCard2 : void 0
       };
     }

     // src/aidungeon/output.ts
     var modifier = (value) => {
       var _a, _b;
       const safeText = typeof value === "string" ? value : "";
       return {
         text: isPlainObject(state) ? (_b = (_a = globalThis.ChronicleAIDungeon) == null ? void 0 : _a.onOutput(safeText, {
           state,
           actionCount: info == null ? void 0 : info.actionCount,
           storyCards: usableStoryCardGlobals(storyCards, addStoryCard, updateStoryCard, removeStoryCard)
         })) != null ? _b : nonEmptyText(safeText) : nonEmptyText(safeText)
       };
     };
     modifier(text);
   })();
   ```
   <!-- chronicle:dist-embed:Output:end -->

5. **Save again**, now that all four tabs are pasted.

**Library must be saved before the other three are exercised.** Chronicle's Input/Context/Output
scripts call a single shared function that Library sets up when it runs; the assumption is that AI
Dungeon evaluates Library before the other tabs on every turn. This is stated in `library.ts`'s own
code comment and is **not yet confirmed in-app** — see the "Library load order" row in
`agent_documentation/10_in_app_validation_playbook.md`. If this assumption is ever wrong for a given
session (wrong paste order, Library tab not saved, a Library-level script error), Chronicle degrades
silently: Input/Context/Output all still return your original text unmodified, with no error shown.
If Chronicle appears to do nothing after installation, this is the first thing to check.

## 3. `Configure Chronicle` — your last checkpoint before the story begins

You do not create the configuration card yourself, and you don't need to pick a card **Type**,
decide what **Keys**/**Triggers** mean, or know anything about AI Dungeon's scripting API.
**`Configure Chronicle`** (Type `Class`) is meant to already be sitting in your Story Cards by the
time your adventure's opening scene appears — before you've typed a single action — ready to use
exactly as it is:

- `Chronicle Enabled: true` — Chronicle is already on.
- `Initialization Mode: Automatic` — it will start the story clock from the current real-world time
  the moment your first turn is actually processed.

**If that's what you want, you can ignore this card completely and just start playing.** Open it
only if you want a custom starting date/time: switch `Initialization Mode` to `Manual` and fill in
the Start fields, **before playing your first turn** — see below for why that timing matters.

Its **Entry** (the editable part) looks like this:

```
Chronicle Enabled: true

# Choose your starting mode before playing the first turn:
Initialization Mode: Automatic

# Used only when Initialization Mode is Manual:
Start Year:
Start Month:
Start Day:
Start Hour:
Start Minute:
Start Second:

AI Temporal Signal: true
Repair Chronicle Card: false
```

Field reference — edit values in **Entry**, never in Notes:

- `Chronicle Enabled` — `true`/`false`. Anything else is treated as `false`. Takes effect any time
  you change it, before or after the timeline has started.
- `Initialization Mode` — `Automatic` starts the story clock at the real current time in the
  `America/New_York` zone (**requires in-app validation** — `Intl.DateTimeFormat` behavior in the
  sandbox is unconfirmed). `Manual` uses the Start Year/Month/Day/Hour/Minute/Second fields below it;
  any left blank fall back to the current time for that component. **Read only once** — the first
  time Chronicle actually processes a turn and initializes its timeline.
- `Start Year`/`Month`/`Day`/`Hour`/`Minute`/`Second` — only used when `Initialization Mode` is
  `Manual`, and, like it, **read only once**, the first time the timeline initializes.
- `AI Temporal Signal` — leave `true` unless you want Chronicle to use only its deterministic rules.
  Either setting keeps the same safety guarantees; this only changes whether the AI Dungeon narrator's
  own judgment is asked to supplement them (see `agent_documentation/04_decisions.md`, D-026). Takes
  effect any time you change it.
- `Repair Chronicle Card` — leave `false` normally. Chronicle detects (but does not delete) duplicate
  temporal-state cards on its own; set this `true` only when you explicitly want duplicates removed,
  then set it back to `false`.

The card's **Notes** field is documentation only — an explanation of each setting and basic
troubleshooting. Chronicle never reads settings from Notes on a canonical card; it only exists to
help you fill in Entry correctly.

**Once the timeline has initialized (your first turn has been processed), editing `Initialization
Mode` or the Start fields again does nothing.** They are consumed exactly once, at the moment the
timeline is born, precisely so you can freely revisit this card afterward without ever risking a
silent reset. This is why Manual, if you want it, needs to be chosen *before* that first turn, not
after.

**For your first-ever test, switch `Initialization Mode` to `Manual` and fill in fixed values**
before playing your first turn:

```
Chronicle Enabled: true
Initialization Mode: Manual
Start Year: 2026
Start Month: 9
Start Day: 16
Start Hour: 18
Start Minute: 0
Start Second: 0
AI Temporal Signal: true
Repair Chronicle Card: false
```

This gives the smoke test below (section 4) an exact, predictable expected value —
`2026/09/16 18:00:00` — instead of "whatever the current time happens to be," and rules out
`Automatic`'s `Intl.DateTimeFormat`/timezone dependency (itself one of the things this first test is
meant to help confirm, not something you want as a confound while checking Chronicle itself).
`Automatic` is the normal, recommended mode for everyday play once installation is confirmed
working — switch back to it for your next Scenario (a running story's mode cannot change once
initialized, per the one-shot behavior above) whenever you like after this first test.

**Already have an older `chronicle-configuration` card from a previous version?** Nothing to do —
Chronicle finds it automatically (by its old `keys` identifier), renames/retypes it to the new
`Configure Chronicle` / `Class` card, and moves any settings that were in its Notes into the new
Entry, preserving your existing values. It does not create a second card.

**If the card is ever missing** (deleted by accident, or this is your very first turn and the
platform hasn't run Chronicle's scripts before now — see the caveat below), Chronicle recreates it
automatically the moment it next runs, as a recovery measure, not as the normal way this card is
meant to appear. Recreating it never resets an already-initialized timeline.

<sub>Whether AI Dungeon runs a Scenario's scripts (and so creates this card) before the player's very
first typed action, or only once that action is submitted, is a platform behavior Chronicle cannot
independently confirm from outside a running session — the same class of open question as the
"Library load order" assumption below. Practically: open the Story Cards list right after creating
your Scenario, before typing anything, to check.</sub>

## 4. Smoke test: confirm Chronicle initialized

This is the one check every install should run before anything else — it tells you, in under a
minute, whether Chronicle is actually active or only appears to be installed.

1. Play (or Continue) one turn in your Scenario, with the Manual example from section 3 above
   already in place.
2. Open your Story Cards and look for a card named **`Chronicle Temporal State`**.
3. Its entry should read:
   ```
   [Chronicle]
   Current story time: 2026/09/16 18:00:00.
   Time of day: evening.
   ```
   (using the recommended Manual example from section 3 above) — or a little later than that, if
   your first action already gave Chronicle evidence that some time passed during it.

**If that card never appears:** see "5. If something looks wrong" below — most likely cause is
Library not having been saved before the other tabs (section 2), or `Chronicle Enabled` having been
switched to `false` on the `Configure Chronicle` card.

- **Locally validated:** on the first enabled turn, Chronicle creates both the `Configure Chronicle`
  card (if none existed yet) and the `Chronicle Temporal State` card showing only the current
  in-story date/time — no Ledger history, no confidence scores, nothing else. The model's context
  gains a compact three-line `[Chronicle]` block with the same current time. Both are proven by
  automated tests (`tests/aidungeon-runtime.test.ts`, `tests/aidungeon/story-cards/`).
- **Requires in-app validation:** whether the `Chronicle Temporal State` card's Notes field actually
  shows the bounded Ledger history you'd expect, whether card **Title** is readable/settable the way
  Chronicle's card-discovery logic assumes (the `title`/`description` Story Card fields are a
  community-observed mapping, not part of AI Dungeon's official documented API — see
  `agent_documentation/03_ai_dungeon_integration.md`), whether `state.message` renders as a visible
  toast/popup for a time-of-day transition, and whether the AI Dungeon narrator actually honors the
  injected `<<chronicle:...>>` signal instruction. None of these are assumed working — see
  `agent_documentation/10_in_app_validation_playbook.md` for the full test matrix to run yourself,
  and `agent_documentation/05_known_limitations.md` / `11_critical_assumptions_and_silent_failures.md`
  for every currently-known gap and its evidence level.

## 5. If something looks wrong

Chronicle surfaces problems through a transient `state.chronicleRuntimeError` diagnostic rather than
crashing a turn. If play feels wrong and you have script/state inspection access, check that key
first — its message is written to explain what happened (invalid persisted state, a duplicate Story
Card, a configuration card that could not be created, an unsupported time range, or an unexpected
internal error) rather than failing silently.

One situation remains genuinely silent by design and is not diagnosed this way: **Library not
evaluated first** (see step 2) — every hook passes text through unmodified, and Chronicle never gets
a chance to run at all, including its own configuration-card creation.

If a hook ever runs with a missing or malformed `state`, `storyCards`, `addStoryCard`, or
`updateStoryCard` global (an AI Dungeon runtime irregularity, not a normal condition), Chronicle
degrades to a safe passthrough for that hook instead of erroring the turn — see
`agent_documentation/05_known_limitations.md`.

## What this package does not include yet

- Read-only player commands (`/chronicle`, `/chronicle ledger`) are planned but not implemented —
  see `agent_documentation/PROJECT_PLANNING.md`, Phase 7.
- Nothing here has been exercised inside a real AI Dungeon Scenario. Phase 8
  (`agent_documentation/10_in_app_validation_playbook.md`) is the next step after this package is
  installed, and its results — not this document — are what turn an in-app assumption into a
  confirmed fact.
