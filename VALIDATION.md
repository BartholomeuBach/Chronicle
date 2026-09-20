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

## Observed issue — temporal inference quality

The live ledger recorded two fallback activity-prior decisions (`signalStatus: "absent"`):

* 15 minutes, low confidence;
* 5 minutes, medium confidence after player-action corroboration.

Neither record used the narrator temporal signal, and the observed action intended to establish a 30-minute passage was not recorded as a 30-minute explicit duration. This proves that persistence and recording work, but **does not validate the quality of elapsed-time inference**.

The exact player-action/output transcript for each `beatId` must be captured before changing a matcher. Without it, the specific activity prior that matched is only an inference.

## Still to validate in AI Dungeon

* Automatic initialization bootstrap: the first Context requests `<<chronicle:start:HH:MM,...>>` without exposing a provisional clock; the first Output should remove that tag, retain the automatic date, and use its hour/minute.
* Automatic initialization fallback: when the bootstrap tag is absent, direct and figurative kickstart cues should choose a coherent clock; no cue should preserve the automatic hour/minute.
* The narrator reliably emits the temporal protocol on ordinary turns.
* Explicit time skips produce the specified delta.
* Pure observations (checking a clock, reading a screen, looking around) remain at zero elapsed time.
* Memory, dream, quotation, and hypothetical guards reject non-current time language.
* Retry, Undo, reload, and Continue do not double-count a beat.
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
