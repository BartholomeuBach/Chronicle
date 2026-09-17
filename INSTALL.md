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

The four files this package needs are already committed to this repository, ready to copy
straight from GitHub. **You do not need to clone this repository, install Node/npm, or run any
build command to install Chronicle.**

| File | AI Dungeon tab | GitHub link |
|---|---|---|
| `Library.js` | **Library** | <https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Library.js> |
| `Input.js` | **Input** | <https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Input.js> |
| `Context.js` | **Context** | <https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Context.js> |
| `Output.js` | **Output** | <https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Output.js> |

For each one: open the link, click the **copy** icon in the file view's top-right corner (or
select all and copy), then paste the full contents into the matching AI Dungeon tab.

Each file is self-contained (no `import`/`require`, verified by `npm run verify:dist`) and is
meant to be pasted whole into its matching tab, replacing that tab's contents.

**Locally validated, not a claim about GitHub:** a CI check (`npm run verify:dist:fresh`, part of
`npm run check`, wired into `.github/workflows/check.yml`) fails the build whenever these four
files stop matching a fresh build of the current TypeScript source. That means whatever is at the
links above, on the `main` branch, is guaranteed in sync with this repository's own source — it
does not mean GitHub itself is guaranteed available or unaltered; that trust is the same as for any
GitHub-hosted file.

<sub>Building from source (`npm install && npm run build`) exists only for developers modifying
Chronicle's TypeScript. It regenerates these same four files in place; it has never been required
to install Chronicle. `npm run verify:dist` checks the build's structural validity (self-contained,
`modifier(text)` present); `npm run verify:dist:fresh` separately checks the build matches what's
committed — see `06_testing_strategy.md` in this project's internal `agent_documentation/` (not
part of the public repo) for how these compose into `npm run check`.</sub>

## 2. Paste the scripts, Library first

1. Open your Scenario's **Details -> Scripting**.
2. Paste `Library.js` into the **Library** tab and save.
3. Paste `Input.js`, `Context.js`, and `Output.js` into their matching tabs and save.

**Library must be saved before the other three are exercised.** Chronicle's Input/Context/Output
scripts call a single shared function that Library sets up when it runs; the assumption is that AI
Dungeon evaluates Library before the other tabs on every turn. This is stated in `library.ts`'s own
code comment and is **not yet confirmed in-app** — see the "Library load order" row in
`agent_documentation/10_in_app_validation_playbook.md`. If this assumption is ever wrong for a given
session (wrong paste order, Library tab not saved, a Library-level script error), Chronicle degrades
silently: Input/Context/Output all still return your original text unmodified, with no error shown.
If Chronicle appears to do nothing after installation, this is the first thing to check.

## 3. Create the configuration Story Card

Chronicle is **disabled by default** until you create this card — a missing card is deliberately
interpreted as "Chronicle off," not an error.

Create a new Story Card with:

- **Keys:** `chronicle-configuration`
- **Notes / description field:** paste the template below, editing only the values you want to change

```
# Chronicle configuration
# IMPORTANT: do not change initialization fields during an active story.
# Existing Chronicle state intentionally remains unchanged. Start a new adventure
# or use a future explicit reset workflow when you need a new timeline.
Chronicle Enabled: true
Initialization Mode: Automatic
# Manual fields are optional; blank fields use the current New York time.
# Start Year:
# Start Month:
# Start Day:
# Start Hour:
# Start Minute:
# Start Second:
# Set true only to explicitly remove duplicate Chronicle temporal-state cards.
Repair Chronicle Card: false
# Lets the AI Dungeon narrator itself signal elapsed time for a completed beat,
# with its own high/medium/low confidence (D-026); Chronicle always falls back
# to its deterministic rules when the signal is absent, malformed, ambiguous,
# or contradicted by the story so far. Set false to use only the deterministic rules.
AI Temporal Signal: true
```

Field reference:

- `Chronicle Enabled` — `true`/`false`. Anything else is treated as `false`.
- `Initialization Mode` — `Automatic` starts the story clock at the real current time in the
  `America/New_York` zone (**requires in-app validation** — `Intl.DateTimeFormat` behavior in the
  sandbox is unconfirmed). `Manual` uses the Start Year/Month/Day/Hour/Minute/Second fields below it;
  any left blank fall back to the current time for that component.
- `Repair Chronicle Card` — leave `false` normally. Chronicle detects (but does not delete) duplicate
  temporal-state cards on its own; set this `true` only when you explicitly want duplicates removed,
  then set it back to `false`.
- `AI Temporal Signal` — leave `true` unless you want Chronicle to use only its deterministic rules.
  Either setting keeps the same safety guarantees; this only changes whether the AI Dungeon narrator's
  own judgment is asked to supplement them (see `agent_documentation/04_decisions.md`, D-026).

**Do not edit the initialization fields once the story has started.** Chronicle intentionally never
re-reads them after first use, to avoid silently resetting an active timeline.

## 4. Play a turn and check what you should see

- **Locally validated:** on the first enabled turn, Chronicle creates a second Story Card
  (`chronicle-temporal-state`) showing only the current in-story date/time — no Ledger history, no
  confidence scores, nothing else. The model's context gains a compact three-line `[Chronicle]`
  block with the same current time. Both are proven by automated tests
  (`tests/aidungeon-runtime.test.ts`, `tests/aidungeon/story-cards/`).
- **Requires in-app validation:** whether the `chronicle-temporal-state` card's Notes field actually
  shows the bounded Ledger history you'd expect, whether `state.message` renders as a visible
  toast/popup for a time-of-day transition, and whether the AI Dungeon narrator actually honors the
  injected `<<chronicle:...>>` signal instruction. None of these are assumed working — see
  `agent_documentation/10_in_app_validation_playbook.md` for the full test matrix to run yourself,
  and `agent_documentation/05_known_limitations.md` / `11_critical_assumptions_and_silent_failures.md`
  for every currently-known gap and its evidence level.

## 5. If something looks wrong

Chronicle surfaces problems through a transient `state.chronicleRuntimeError` diagnostic rather than
crashing a turn. If play feels wrong and you have script/state inspection access, check that key
first — its message is written to explain what happened (invalid persisted state, a duplicate Story
Card, an unsupported time range, or an unexpected internal error) rather than failing silently.
Two situations remain genuinely silent by design and are not diagnosed this way:

- **No configuration card** — Chronicle is simply off, as intended; nothing is broken.
- **Library not evaluated first** (see step 2) — every hook passes text through unmodified.

## What this package does not include yet

- Read-only player commands (`/chronicle`, `/chronicle ledger`) are planned but not implemented —
  see `agent_documentation/PROJECT_PLANNING.md`, Phase 7.
- Nothing here has been exercised inside a real AI Dungeon Scenario. Phase 8
  (`agent_documentation/10_in_app_validation_playbook.md`) is the next step after this package is
  installed, and its results — not this document — are what turn an in-app assumption into a
  confirmed fact.
