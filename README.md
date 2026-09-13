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
Explicit temporal information
        ↓
Narrative semantics
        ↓
Contextual reasoning
        ↓
Activity priors
        ↓
Conservative fallback
```

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

Eu acho que essa versão já tem bem mais **“cara de projeto da comunidade”**: visual, personalidade, piadas internas leves e uma identidade clara do Bartholomeu sem perder a parte técnica.
