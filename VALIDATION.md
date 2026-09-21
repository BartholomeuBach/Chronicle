# Chronicle live validation log

This log records evidence observed in a real AI Dungeon Scenario. It is deliberately separate from unit-test results: a passing local test does not prove that the platform's hook lifecycle or Story Card UI behaves the same way.

## Observed — 2026-09-19

| Area | Result | Evidence |
|---|---|---|
| Script Test: Library + Input | Passed | The Kernel returned the original text, no error, created `Configure Chronicle`, and persisted the v1 Chronicle Authors Note instruction. |
| Recovery lifecycle | Passed | First live turn created `Configure Chronicle`; the following eligible turn created `Chronicle Temporal State`. |
| Story Card projection | Passed | The UI displayed both cards as `Class`; the temporal Entry displayed the current date, time, and time-of-day. |
| Name/Notes mapping | Passed | `Chronicle Temporal State` displayed its name and its Notes contained the `chronicleTemporalLedger` JSON. |
| Persistence | Passed | Both cards and the Notes ledger remained after leaving and returning to the Scenario. |
| Model-visible clock | Passed | The narrator correctly answered a player request to read the computer's current date and time. |
| Ledger write path | Passed | Live Notes contained accepted records with `before`, `elapsedTime`, `mode`, `confidence`, and `after`. |

## Pre-beta review — 2026-09-19

### Guarantees confirmed locally

* The runtime state retains only the last 64 processed turn identities and the last 100 ledger records; the Story Card Notes project only the most recent 20 records. A long adventure therefore does not grow Chronicle's own persisted structures without bound.
* A known `info.actionCount` is now the idempotency identity for an Output. Regenerating/Retrying a response for that same action cannot advance the clock a second time merely because the prose differs. When the platform omits `actionCount`, Chronicle falls back to a hash of the completed text; that fallback is less certain.
* The four published artifacts are bundled separately, parse as standalone modifier scripts, and have passed the Script Test kernel path previously observed in AI Dungeon.

### Heuristics, not guarantees

* `AI Temporal Signal` is advisory. The Context instruction can be appended and the narrator can still omit or malform the tag. In either case Chronicle continues through deterministic rules; a missing narrator tag must never be interpreted as a broken clock.
* Automatic initialization retains the automatic date, then chooses only an initial hour/minute. It prioritizes an explicit clock, then a ranked English cue from the scenario opening/history (including figurative cues such as dusk, long shadows, and blue hour), then the automatic clock. It cannot prove narrative intent: a time reference that is not the opening scene can still be a false positive.

### Long-scenario observation checklist

1. At turns 1, 10, 25, and after any Retry/Undo/reload, record the current card Entry plus the most recent Notes record.
2. For a deliberate time skip, save the player action, narrator reply, and ledger record together; do the same for a clock check or short dialogue that should not advance time.
3. If `chronicleSignalDiagnostic.outputSignalStatus` is repeatedly `absent`, leave the setting enabled only if the deterministic result remains useful; it is safe to set `AI Temporal Signal: false` to remove the unreliable prompt.
4. Treat `chronicleRuntimeError`, duplicate cards, a missing projection, or a changed time after Retry as stop-and-capture events before continuing the test.

## Observed issue — temporal inference quality

The live ledger recorded two fallback activity-prior decisions (`signalStatus: "absent"`):

* 15 minutes, low confidence;
* 5 minutes, medium confidence after player-action corroboration.

Neither record used the narrator temporal signal, and the observed action intended to establish a 30-minute passage was not recorded as a 30-minute explicit duration. This proves that persistence and recording work, but **does not validate the quality of elapsed-time inference**.

The exact player-action/output transcript for each `beatId` must be captured before changing a matcher. Without it, the specific activity prior that matched is only an inference.

## QA review — 2026-09-20 (simulator evidence, not live)

Method: the exact `dist/aidungeon/*.js` files were run hook by hook (Input, Context, Output) against fake sandbox globals. This is now a permanent gate, `npm run verify:dist:behavior`, part of `npm run check`. It models the platform; it cannot show how the real AI Dungeon treats Undo, Retry, or Continue.

### Fixed

* **Bootstrap answer leaked to the player.** The bootstrap prompt asks the narrator to write `none,high>>` when uncertain, but Output only stripped numeric clock answers, so `none,high>>` was shown on the first turn of an Automatic story. It is now stripped.
* **Near-miss control markers leaked.** `<<Chronicle:...>>`, single-bracket `<chronicle:...>`, and a directive truncated at the end of the output are now removed. They are never read as evidence: only the exact `<<chronicle:...>>` form is.
* **A descriptive time-of-day phrase could skip most of a day.** "woke up" and "morning came" (target 06:00), "at noon", "at sunset" and "night fell" resolved to the *next* occurrence of their hour. Observed: "You woke up" at 14:00 went to 06:00 the next day; "Night fell over the harbor" at 21:30 added 23.5h; "morning came" at 07:00 added 23h. This path stays active when the narrator omits its tag, which is the common live case. A named transition is now credited only when its target is at most 12h ahead (waking after a night's sleep, 23:00 to 06:00, is 7h). The 12h cap is a judgment, not a measurement. Residual limit: a plan such as "meet me at noon" at 07:00 still advances 5h.

### Observed, not fixed yet (each needs a real corpus before any rule changes)

* **The narrator tag is often discarded by the whole-beat guard.** A valid `<<chronicle:PT2H,high>>` was rejected in 6 of 9 realistic beats, because of `she says, "..."`, `might`, `plans`, "dreams" as a noun, `had finished`, or `The sign reads "..."`. The guard evaluates the whole beat, so common words silence a good signal.
* **Retry keeps the first duration.** Retry with the same `actionCount` is not counted twice, but the retry's own duration is ignored ("first one wins").
* **Undo followed by a new action may lose its time.** If AI Dungeon does not roll back `state` on Undo, the new action reuses the same `actionCount` and is rejected as a duplicate. Whether `state` is rolled back is not yet observed.
* **Explicit-duration false positives, credited at high confidence:** "the ritual lasts for three days" (+3 days), "open for 24 hours a day" (+24h), "has been waiting for two hours" (+2h), "an overnight bag" (+8h).
* **Context limit.** When the prompt is near `maxChars`, the clock and the signal request are omitted together, although the clock alone (about 75 characters) would fit. Frequency is unknown: check `chronicleSignalDiagnostic.protocolStatus` for `omitted-context-limit` in a long campaign before changing this.

## Still to validate in AI Dungeon

* Automatic initialization bootstrap: the first Context requests `<<chronicle:start:HH:MM,...>>` without exposing a provisional clock; the first Output should remove that tag, retain the automatic date, and use its hour/minute.
* Automatic initialization fallback: when the bootstrap tag is absent, direct and figurative kickstart cues should choose a coherent clock; when no defensible cue exists, it should preserve the automatic hour/minute.
* The narrator reliably emits the temporal protocol on ordinary turns.
* Explicit time skips produce the specified delta.
* Pure observations (checking a clock, reading a screen, looking around) remain at zero elapsed time.
* Memory, dream, quotation, and hypothetical guards reject non-current time language.
* Undo, reload, and Continue do not double-count a beat in the live AI Dungeon lifecycle. Retry is now covered by a local regression test and still needs live confirmation.
* `Chronicle Enabled: false` removes the narrator instruction and pauses updates.
* `Repair Chronicle Card: true` repairs duplicate temporal-state cards.

## Corrective work implemented — pending live validation

1. The temporal-report contract now appends beside the clock with a compact first-line tag. If the prior output omitted its tag, the next Context includes a concise corrective reminder.
2. Notes now expose `chronicleSignalDiagnostic`: protocol delivery status, reminder status, and the final model-signal status. It does not copy hidden instruction text or story prose.
3. A clock or screen observation now returns a zero delta before activity priors are considered.
4. Explicit English durations recognize number words and natural phrasing such as `For exactly twenty minutes`, `Twenty minutes later`, `half an hour`, and `Forty-five minutes later`.
5. The local regression suite covers the protocol, diagnostics, and the expanded duration parser. These changes still need live validation.

## Deferred corrective work

1. Capture paired player action, completed narrator output, and ledger record for a small regression corpus.
2. Reclassify activity priors as corroborating evidence, not independent evidence for advancing time; introduce a separately tested completion/summary gate before applying one.
3. Capture a small live corpus using `chronicleSignalDiagnostic` to measure model adherence by story model and context size.
