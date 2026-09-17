<p align="center">
  <img src="./assets/repo_page.png" width="800">
</p>

# Chronicle ⏳😈

### *Because even hell needs a clock.*

Made by Bartholomeu Bach 🔥

---

## Overview 🔥

Chronicle is a narrative time-management module for AI Dungeon.

It keeps track of the current in-story date and time, interprets how much fictional time actually passes during scenes, and helps prevent the AI from hallucinating its own timeline.

Chronicle is the first module of a broader project:

# Narrative System Engine ⚙️

The long-term goal is to build a modular narrative system around AI Dungeon that gives interactive stories stronger internal consistency without replacing the AI as the storyteller.

LLMs are great at writing scenes.

They are much less reliable at maintaining systems over long stories.

Time gets confused. Goals disappear. Consequences are forgotten. Characters suddenly know things they should not know. A two-day deadline somehow becomes tomorrow, then next week, then apparently never happened.

The Narrative System Engine is an attempt to give those systems an actual persistent state.

Chronicle begins with time.

Future modules may handle things such as:

- 🎲 **Agency & Outcome** — intentions, attempts, success, failure, and consequences
- 📜 **Quest Manager** — objectives, progress, deadlines, completion, and failure
- ❤️ **Bonds** — relationships and evolving character dynamics
- 🌍 **World State** — persistent changes to the world
- 🎒 **Inventory** — items, resources, and ownership
- 🎭 **Director** — pacing, narrative pressure, and story direction

Each module should remain lightweight, modular, and independently useful.

The AI should still write the story.

The system should help it remember what is true.

---

## Why am I building this? 😈

Because AI is frighteningly good at writing emotional scenes...

...and absolutely terrible at knowing what day it is.

Imagine this extremely serious narrative situation:

Your character asks his waifu out on Monday.

She says:

> “Sure. Let's meet here in two days.”

Great.

Wednesday.

Simple.

Twenty turns later, you ask:

> “How long until our date?”

And suddenly the AI thinks it's Tuesday.

Or Thursday.

Or tomorrow.

Or yesterday.

Or your waifu shows up furious because apparently you've already missed it.

Meanwhile you're staring at the screen thinking:

> **bro, it has been four fictional hours**

That's the problem Chronicle is trying to solve.

The model does not really maintain a clock.

It sees fragments of narrative context and tries to reconstruct the timeline every time it generates something.

For short stories, that can work surprisingly well.

For long adventures...

...good luck.

Chronicle exists so the narrator stops having to guess what time it is.

---

## Main Features ⏳

| Feature | Description |
|---|---|
| **Persistent Story Clock** | Maintains an authoritative in-story date and time across the adventure |
| **Narrative Time Reasoning** | Estimates elapsed fictional time from narrative meaning rather than rigid action timers |
| **Scene Awareness** | Distinguishes between an ongoing scene and an actual time skip |
| **Contextual Time Deltas** | Understands expressions like “for hours”, “until morning”, or “for days” |
| **Activity Priors** | Uses typical activity durations as fallback guidance without turning them into hard rules |
| **Double-Counting Protection** | Avoids charging time twice when a scene unfolds across multiple turns |
| **Minimal AI Context** | Exposes only the current temporal state instead of flooding the model with history |
| **Temporal Ledger** | Keeps detailed time decisions in Story Card notes so players can inspect how the timeline evolved |
| **AI Dungeon Integration** | Designed around AI Dungeon scripting, Story Cards, and persistent state |

---

## Installation 🛠️

> **Ready-to-install** means these scripts are tested and kept in sync with this repository's source automatically. It does **not** mean any of this has been confirmed working inside a real AI Dungeon Scenario yet — that's a separate, still-pending validation pass. See **Project Status** below.

**No cloning, no Node, no build step required.** `Input`, `Context`, and `Output` are small enough to copy directly from this page. Only `Library` — Chronicle's actual engine — is big enough to need its own file, linked below.

### Scenario Script Install Guide

1. Open the [AI Dungeon website](https://aidungeon.com/) on PC (or "View as Desktop" if you're on mobile-only).
2. [Create a new Scenario](https://help.aidungeon.com/faq/what-are-scenarios), or open an existing one you want to add Chronicle to.
3. Open the `DETAILS` tab, scroll down to `Scripting`, and toggle on **Scripts Enabled**.
4. Select `EDIT SCRIPTS`.
5. Open [`Library.js`](https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Library.js) on GitHub, click the **copy** icon in the top-right corner of the file (or select all and copy), then select the `Library` tab on the left, delete everything in it, and paste.
6. **Click the SAVE button now**, before touching the other tabs. Input/Context/Output all depend on something Library sets up when it runs, so save it first to be safe.
7. Select the `Input` tab, delete everything in it, and paste the code below:

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

8. Select the `Context` tab, delete everything in it, and paste the code below:

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

9. Select the `Output` tab, delete everything in it, and paste the code below:

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

10. Click **SAVE** again, now that all four tabs are pasted.
11. **Play (or Continue) one turn.** You don't need to create anything yourself — on this turn,
    Chronicle automatically creates a Story Card named **`Configure Chronicle`** (Type `Class`),
    already enabled and running on the real current time. You only open it if you want to change a
    setting; see the [configuration card](#configuration-card) section below.

    **For your very first test**, before playing that turn, it's easier to open the card *after* it's
    created and switch `Initialization Mode` to `Manual` with fixed values (see below), then play
    again — it makes what Chronicle should show you exact and predictable, with no timezone
    guesswork involved.
12. **Smoke test**, then open your Story Cards and confirm:
    - a card named `Configure Chronicle` exists;
    - a card named `Chronicle Temporal State` also exists;
    - its entry matches what you set — with the recommended Manual example, that's exactly:
      ```
      [Chronicle]
      Current story time: 2026/09/16 18:00:00.
      Time of day: evening.
      ```
      (or a little later, if your first action already gave Chronicle evidence that time passed).

    If those cards never appear, see **Gameplay Tips** below and `INSTALL.md`'s troubleshooting section before assuming your own story is broken.

<sub>Building from source (`npm install && npm run build`) is only for developers who want to modify Chronicle's TypeScript — see **Architecture Philosophy** below. It has never been required to install Chronicle, and these snippets are kept in sync with it automatically.</sub>

### *And that's it — Chronicle is live.*

Every turn played from that Scenario from now on runs through Chronicle.

<sub>Chronicle is enabled by default from the moment it creates its own `Configure Chronicle` card — set `Chronicle Enabled: false` on that card any time you want to pause it.</sub>

---

### Configuration card

Chronicle creates and maintains a Story Card named **`Configure Chronicle`** (Type `Class`)
automatically — you never build this card by hand. Its **Entry** field holds the editable settings;
its **Notes** field is documentation/help text only and is never read for settings. Edit values
directly in Entry:

```
Chronicle Enabled: true
Initialization Mode: Automatic
Repair Chronicle Card: false
AI Temporal Signal: true
Start Year:
Start Month:
Start Day:
Start Hour:
Start Minute:
Start Second:
```

| Field | What it does |
|---|---|
| `Chronicle Enabled` | `true`/`false`. Anything else is treated as `false`. |
| `Initialization Mode` | `Automatic` starts the story clock at the real current time (America/New_York). `Manual` uses the Start Year/Month/Day/Hour/Minute/Second fields below it; any left blank fall back to the current time for that field. |
| `Repair Chronicle Card` | Leave `false` normally. Chronicle detects duplicate temporal-state cards on its own without deleting anything; set this `true` only when you explicitly want duplicates removed, then set it back to `false`. |
| `AI Temporal Signal` | Leave `true` to let the AI Dungeon narrator itself help estimate elapsed time, on top of Chronicle's deterministic rules. Set `false` to use only the deterministic rules. Either way, Chronicle never trusts the narrator blindly — see **How Chronicle Thinks** below. |

⚠️ **Don't edit the Start Year/Month/Day/Hour/Minute/Second fields once your story has already started.** Chronicle intentionally never re-reads them after first use, so it won't silently reset an active timeline.

**For your first-ever test, use `Manual` instead of `Automatic`, with fixed values:**

```
Chronicle Enabled: true
Initialization Mode: Manual
Repair Chronicle Card: false
AI Temporal Signal: true
Start Year: 2026
Start Month: 9
Start Day: 16
Start Hour: 18
Start Minute: 0
Start Second: 0
```

**Upgrading from an older Chronicle version?** If you already have a `chronicle-configuration` card
from before, Chronicle finds it automatically, renames/retypes it to `Configure Chronicle` / `Class`,
and moves any settings that were in its Notes into the new Entry field — your existing values are
preserved, and no second card is created.

This gives you an exact, predictable expected value for the smoke test above — `2026/09/16 18:00:00`
— instead of "whatever time it is right now," which also rules out any `Automatic`/timezone
question (`Intl.DateTimeFormat` behavior in the AI Dungeon sandbox is one of the things this first
test is meant to help confirm) as a confound while you're checking whether Chronicle itself works.
`Automatic` is the normal, recommended mode for everyday play once you've confirmed installation.

---

### Gameplay Tips

- `Library` should be saved before `Input`/`Context`/`Output` are ever exercised (step 6 above) — Chronicle assumes AI Dungeon evaluates `Library` first. If the smoke test's `Chronicle Temporal State` card never appears, this is the first thing to check.
- Set `Chronicle Enabled: false` on the `Configure Chronicle` card any time you want Chronicle off — it pauses without losing its saved timeline.
- Chronicle only ever shows the AI the *current* time, never a history dump — the full reasoning log lives in a separate `Chronicle Temporal State` Story Card's Notes, for players who want to inspect how the clock got there.
- Chronicle is early (see **Project Status** below) — not every narrative edge case is handled yet.

---

## How Chronicle Thinks 🧠

Chronicle is not just an action-duration lookup table.

It tries to answer one question:

> **How much time actually passed in the story?**

For example:

```text
"I sit down to eat with my sister."
````

does not necessarily mean:

```text
+45 minutes
```

The dinner scene may only be starting.

Only a minute or two may have passed.

Meanwhile:

```text
"We spend the evening eating, drinking and talking."
```

clearly represents a much larger passage of time.

And:

```text
"I trained for days."
```

may advance the story by several days even if that exact action was never predefined anywhere.

Chronicle uses a hierarchy of evidence:

```text
0. Validated AI temporal signal (guarded, optional)
        ↓
1. Explicit temporal evidence
        ↓
2. Narrative semantics / contextual rules
        ↓
3. Activity priors
        ↓
4. Conservative fallback
```

**The AI narrator's own signal sits at the top, but it is never trusted blindly.** When enabled (the
default), Chronicle asks the AI Dungeon narrator to report how much time it judges just passed,
tagged with its own confidence. That report is checked against the same non-current-frame guard
Chronicle's deterministic rules already use — a memory, dream, hypothetical, or quoted scene — and
is trusted only if it doesn't contradict that check. Absent, malformed, or contradicted signals fall
straight through to tier 1 and below, exactly as if the narrator had said nothing at all. Tiers 1-4
are Chronicle's original deterministic rules, unchanged and always active as the fallback — they are
what runs every single time tier 0 has nothing to say.

Narrative evidence always wins over rigid defaults.

---

## Narrative Reasoning over Rigid Rules 🧠

Chronicle may use typical activity durations as reference points.

For example:

```text
meal    → usually 30–90 min
sleep   → usually 6–10 h
shower  → usually 10–30 min
```

But these are only priors.

They are not rules.

A rushed meal might take ten minutes.

A long argument over dinner might take three hours.

A character collapsing from exhaustion might sleep twelve.

Context wins.

---

## Scene Progression vs Time Skip 🎬

One of Chronicle's most important responsibilities is distinguishing between a scene that is actively unfolding and a true temporal transition.

```text
"I get into bed."
```

does not mean eight hours passed.

```text
"I sleep until morning."
```

probably does.

Likewise:

```text
"I sit down for dinner."
```

means the dinner scene has started.

It does not mean the entire dinner already happened.

This helps Chronicle avoid turning ordinary scenes into rigid RPG-style time skips.

---

## Incremental Time Only ⏱️

Chronicle estimates only the amount of time that passed since the previous update.

This prevents double counting.

For example:

```text
19:00 → dinner begins
19:05 → conversation continues
19:20 → conversation continues
19:30 → dinner ends
```

Chronicle should not suddenly add another 45 minutes when the characters leave the table just because a meal usually takes that long.

The time that already passed has already been counted.

---

## Current Temporal State 🕰️

The storytelling AI does not need Chronicle's entire history.

It only needs the current temporal truth.

For example:

```text
[Chronicle]
Monday, April 13, 2026 — 19:32
```

This state is continuously replaced as the story progresses.

The goal is to keep the active context extremely small and highly relevant.

No giant timeline dumps.

No unnecessary logs.

No context-window murder.

---

## Temporal Ledger 📜

Although the storytelling AI only needs the current state, Chronicle also keeps a detailed temporal ledger for the player.

A Chronicle update may internally record something like:

```json
{
  "before": "2026-04-13T19:20",
  "action": "Dinner conversation continued",
  "interpretation": "scene_progression",
  "delta": "12m",
  "reason": "Conversation continued while the meal was already underway.",
  "after": "2026-04-13T19:32"
}
```

This log is intended for transparency and debugging.

It allows the player to understand:

* why time advanced;
* how Chronicle interpreted an action;
* where timeline mistakes may have happened;
* how the current story time was reached.

In other words:

> **The AI sees the state.
> The user can inspect the reasoning.**

---

## Architecture Philosophy ⚙️

Chronicle separates internal state from model-facing context.

Conceptually:

```text
Narrative Beat
      ↓
Temporal Reasoner
      ↓
Time Delta
      ↓
Deterministic Calendar
      ↓
Chronicle State
      │
      ├── Current State → AI Context
      │
      └── Temporal Ledger → Story Card Notes
```

The internal system may be complex.

The information exposed to the narrator should not be.

Chronicle should own a rich internal state while exposing only the minimum information needed to maintain temporal consistency.

---

## Current Scope 🧪

The first version of Chronicle focuses on:

* current story date;
* current story time;
* narrative time deltas;
* scene progression;
* summarized time passage;
* contextual time inference;
* deterministic calendar updates;
* persistent temporal state;
* compact AI context;
* temporal decision logs.

Chronicle does **not** currently attempt to manage:

* future scheduled events;
* quest deadlines;
* NPC schedules;
* hidden or uncertain time;
* character-perceived vs objective time;
* weather;
* seasons;
* event triggering.

Those systems may come later.

For now, the goal is deliberately simple:

> **Give the story a clock — and make that clock actually make sense.**

---

## Narrative System Engine Roadmap ⚙️

Chronicle is only the beginning.

The long-term vision is a collection of independent narrative modules that can work together.

```text
Narrative System Engine
│
├── ⏳ Chronicle
│   └── time and calendar management
│
├── 🎲 Agency & Outcome
│   └── intentions, attempts, and consequences
│
├── 📜 Quest Manager
│   └── objectives and progression
│
├── ❤️ Bonds
│   └── relationships and character dynamics
│
├── 🌍 World State
│   └── persistent world changes
│
├── 🎒 Inventory
│   └── items and resources
│
└── 🎭 Director
    └── pacing and narrative pressure
```

Each module should be useful on its own.

Together, they should help transform AI-driven stories from loosely remembered text into more persistent narrative systems.

---

## Project Status 🚧

Chronicle is currently in early development.

Expect:

* experiments;
* questionable temporal decisions;
* broken timelines;
* weird edge cases;
* and probably at least one waifu accidentally waiting three days at a restaurant.

That's why we're building it.

---

## License 📜

MIT

Chronicle is intended to be open-source and available for experimentation, modification, contribution, and integration with other AI Dungeon projects.

---

<p align="center">
  ⏳ <i>Because even hell needs a clock.</i> 😈
</p>
```
