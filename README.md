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

## Easy Install 🛠️

> **Ready-to-install** means Chronicle's four published scripts are built and checked locally. It does **not** mean their AI Dungeon behavior has been confirmed in a real Scenario yet. Installation is the first step of Phase 8 validation.

**No cloning, Node, npm, or build step is needed.** Install the four committed files below into one AI Dungeon Scenario. Each link opens the exact, versioned artifact for its matching tab; use GitHub's **Copy** button on that file page, rather than selecting code from this README.

### Install Chronicle in an existing Scenario

1. Open the [AI Dungeon website](https://aidungeon.com/) on PC (or use desktop view), create or edit a Scenario, then open **Details → Scripting** and enable **Scripts Enabled**.
2. In **Edit Scripts**, replace the contents of the **Library** tab with [`Library.js`](https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Library.js), then click **Save** before continuing.
3. Replace each remaining tab with its matching file, using the GitHub file page's **Copy** button:
   - **Input** → [`Input.js`](https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Input.js)
   - **Context** → [`Context.js`](https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Context.js)
   - **Output** → [`Output.js`](https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Output.js)
4. Click **Save** again after all four tabs are filled.
5. Start or continue an Adventure from that Scenario. If `Configure Chronicle` was not already present, the first turn creates it; the second turn starts Chronicle's timeline. This deliberate one-turn pause gives you time to choose a Manual start before the clock exists.
6. Run the smoke test below before relying on Chronicle in a longer story.

The four files above are the only installable source of truth. `INSTALL.md` contains the detailed setup, Manual-start option, and troubleshooting guide.

### Smoke test

This checks installation only; it does not test whether Chronicle's narrative time estimates are accurate.

1. Start from the Scenario with all four tabs saved and play one ordinary turn.
2. Open Story Cards. With no pre-existing configuration, **Configure Chronicle** should now exist.
3. Play one more ordinary turn.
4. Open Story Cards again. **Chronicle Temporal State** should now exist and its Entry should contain:

   ```text
   [Chronicle]
   Current story time: YYYY/MM/DD HH:MM:SS.
   Time of day: <period>.
   ```

If you pre-created `Configure Chronicle` in the Scenario, Chronicle initializes on the first turn instead. If either expected card is absent, use the short troubleshooting guide in `INSTALL.md`; do not assume a narrative-reasoning failure yet.

### Optional advanced setup

Want a known fictional starting time instead of Chronicle's Automatic default? Before starting an Adventure, add **Configure Chronicle** to the Scenario's own Story Cards and use `Initialization Mode: Manual`. The exact template and a deterministic smoke-test value are in `INSTALL.md`.

A future **Chronicle Demo Scenario** is planned as the easiest route: scripts and a preconfigured card will already be present. It is not published yet.

### Quick troubleshooting

- **“Unexpected end of input”**: reopen the named tab and copy its linked `.js` file again using GitHub's file-page Copy button. Do not copy Markdown fences.
- **No Chronicle cards appear**: confirm Scripts Enabled, that all four matching tabs were saved, and that Library was saved before the other tabs.
- **Only Configure Chronicle appears after the first turn**: expected recovery behavior; play a second turn.
- **Chronicle Temporal State is still absent after the relevant initialization turn**: follow `INSTALL.md` before changing story text or temporal settings.

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
is trusted only if it doesn't contradict that check. Malformed or contradicted signals fall through to
the deterministic tiers. When a signal is absent, Chronicle still applies explicit narrative evidence
and conservative rules, but deliberately withholds an activity-prior-only scene-progression advance:
the narrator's missing report must not turn a weak prior into fictional elapsed time. With `AI Temporal
Signal: false`, the deterministic reasoner runs on its own, including its normal activity-prior behavior.

Narrative evidence always wins over rigid defaults.

### What Chronicle guarantees — and what it estimates

Chronicle guarantees a bounded persisted clock, bounded decision history, and at-most-once processing for an AI Dungeon action when `info.actionCount` is available. Its calendar arithmetic, Story Card projection, and fallback path are deterministic.

It does **not** guarantee that a narrator follows the optional temporal-tag instruction or that a narrative phrase has only one possible real-world hour. Automatic initialization preserves its automatic date and estimates only the initial hour/minute: explicit clocks win, then ranked opening-scene cues (including figurative language such as dusk, long shadows, and blue hour), then the automatic clock. Treat that result as a sensible seed, not as recovered canonical lore.

For the current live-test checklist, diagnostics, and known platform limitations, see [VALIDATION.md](./VALIDATION.md).

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

Live AI Dungeon validation has begun: script loading, Story Card creation, Notes projection, persistence, model-visible clock context, and ledger writes have been observed in a real Scenario. Temporal-inference quality and the optional narrator signal are not yet validated; see [VALIDATION.md](./VALIDATION.md) for the current evidence and test backlog.

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
