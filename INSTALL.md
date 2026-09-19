# Chronicle — installation guide

This is the detailed, authoritative guide for installing Chronicle in an AI Dungeon Scenario. It deliberately links only to the four committed artifacts in `dist/aidungeon/`: installers never need to clone the repository, run Node, build TypeScript, or copy JavaScript out of a rendered Markdown block.

> **Ready to install is not validated in AI Dungeon.** Local tests prove that the published files are generated, self-contained, fresh, and parseable. Their lifecycle, Story Card, and narrator behavior still require the Phase 8 test run in a real Scenario.

## Quick install in an existing Scenario

1. On [AI Dungeon](https://aidungeon.com/), create or edit a Scenario. Go to **Details → Scripting**, enable **Scripts Enabled**, then open **Edit Scripts**.
2. Open [`Library.js`](https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Library.js), use the file page's **Copy** button, replace the entire **Library** tab, and click **Save**.
3. Use the same file-page Copy button for each remaining matching tab:
   - **Input**: [`Input.js`](https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Input.js)
   - **Context**: [`Context.js`](https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Context.js)
   - **Output**: [`Output.js`](https://github.com/BartholomeuBach/Chronicle/blob/main/dist/aidungeon/Output.js)
4. Click **Save** again. Do not paste one file into a different tab.
5. Start or continue an Adventure from the Scenario. Follow the smoke test below before treating Chronicle as active in a long-running story.

Use the GitHub **Copy** button on the linked file page for every tab. Do not manually select code from this guide: it intentionally contains no embedded script copies, so there is no Markdown fence to accidentally paste.

## Smoke test: prove the installation path

This test is intentionally simple. It proves only that the installation created the expected Chronicle projections; it does not prove that the elapsed-time reasoner is accurate.

### Standard recovery path

Use this when the Scenario does not already contain a `Configure Chronicle` card.

1. With all four tabs saved, play one ordinary turn.
2. Open Story Cards. **Configure Chronicle** should now exist.
3. Play a second ordinary turn.
4. Open Story Cards again. **Chronicle Temporal State** should now exist. Its Entry should have this shape:

```text
[Chronicle]
Current story time: YYYY/MM/DD HH:MM:SS.
Time of day: <period>.
```

The first turn deliberately creates the configuration card without initializing time. This is not a failure: it gives the creator a real chance to choose a Manual date before the timeline is created. The second eligible turn initializes the timeline.

### If the card was pre-created

If you add `Configure Chronicle` to the Scenario's own Story Cards before the Adventure begins, Chronicle reads it on the first eligible turn. In that path, **Chronicle Temporal State** should appear after the first turn instead of the second.

If the expected card does not appear, stop the smoke test and use the troubleshooting section. Do not change narrative prompts or time settings to guess around an installation fault.

## Optional advanced setup: choose the starting date

For a known fictional starting timestamp, pre-create the configuration card at the Scenario level before starting an Adventure:

1. Open the Scenario's **Details → Story Cards** editor, not the Story Cards list of a running Adventure.
2. Add a card named **Configure Chronicle** with type **Class**.
3. Put the following in its **Entry** field:

```
Chronicle Enabled: true

# Choose your starting mode before playing the first turn:
Initialization Mode: Manual

# Used only when Initialization Mode is Manual:
Start Year: 2026
Start Month: 9
Start Day: 16
Start Hour: 18
Start Minute: 0
Start Second: 0

AI Temporal Signal: true
Repair Chronicle Card: false
```

4. Save the Scenario, then start a fresh Adventure from it.
5. On the first eligible turn, check that **Chronicle Temporal State** shows exactly:

```text
[Chronicle]
Current story time: 2026/09/16 18:00:00.
Time of day: evening.
```

The Entry field is the configuration source. Notes are help text only. `Initialization Mode` and all `Start ...` fields are read once, when the timeline is first initialized; editing them later never reseeds an active story clock.

### Configuration reference

| Field | Behavior |
|---|---|
| `Chronicle Enabled` | `true` enables processing; `false` pauses it without deleting the runtime state. |
| `Initialization Mode` | `Automatic` uses the runtime's current New York civil time; `Manual` reads the six Start fields. It is one-shot at initialization. |
| `Start Year` through `Start Second` | Used only by Manual mode, once. Blank components fall back to the current runtime component. |
| `AI Temporal Signal` | `true` enables the optional narrator-provided signal; `false` uses the deterministic reasoner only. It can be changed while playing. |
| `Repair Chronicle Card` | Leave `false` normally. Set `true` only to explicitly remove duplicate temporal-state cards, then set it back to `false`. |

The current automatic-time behavior and the Scenario-to-Adventure Story Card handoff are part of Phase 8 validation; the Manual path above avoids using the automatic-time default during the first smoke test.

## Troubleshooting

### “Unexpected end of input” in Input, Context, or Output

This is a script parse error before Chronicle can run.

1. Reopen the tab named in the error.
2. Reopen that tab's matching linked `.js` file above.
3. Use the GitHub file page's **Copy** button, replace the tab completely, and save.
4. Repeat the smoke test.

A stray Markdown fence was one locally reproduced mechanism for this exact message. This guide avoids that route by never embedding the script source. A repeated error after re-copying the canonical file is Phase 8 evidence of a platform incompatibility or another installation problem, not proof that the narrative reasoner failed.

### No Chronicle cards appear

Confirm all of the following before reinstalling:

- **Scripts Enabled** is on for this Scenario.
- Every file went into its matching tab.
- **Library** was saved before Input, Context, and Output.
- The Scenario/Adventure was actually started after the last save.

Chronicle's three modifiers safely pass text through if Library was not available. That prevents a broken turn, but can make Chronicle look inactive. The actual Library load order remains an in-app validation item.

### Only Configure Chronicle appears

Expected on the first turn of the recovery path. Play a second ordinary turn. If you want initialization on the first turn, pre-create the configuration card in the Scenario as described above.

### Configure Chronicle exists but Chronicle Temporal State does not

Check `Chronicle Enabled: true` in the card Entry, then play the next eligible turn. If the card still does not appear, capture the exact UI error and Script Test result before changing any Chronicle configuration. That evidence is needed to distinguish configuration, platform, and lifecycle failures.

### Scripts appear installed but Story Cards never update

Do not assume that the Story Card API is working merely because local tests pass. Record the exact four artifact revision, UI/app version, Script Test output, and observed Story Cards; this belongs in the Phase 8 investigation.

## Scope and validation status

Chronicle's four committed artifacts are the sole manually installable package. The project does not yet publish a ready-made Scenario; a future **Chronicle Demo Scenario** should preinstall these scripts, include a `Configure Chronicle` card with the Manual smoke-test timestamp, and offer a short opening scene. It must be tested as a Scenario artifact before being presented as an easier path.

The next step is the in-app Phase 8 playbook: validate script installation, Library load order, configuration-card lifecycle, title/Notes behavior, context injection, retry/undo/reload, and AI Temporal Signal behavior. Until those observations exist, Chronicle is ready to install and test — not confirmed operational in AI Dungeon.
