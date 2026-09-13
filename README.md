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
