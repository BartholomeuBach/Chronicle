import { createElapsedTime, type ElapsedTime } from "../calendar/elapsed-time.js";

/**
 * Optional evidence channel (D-026): lets the AI Dungeon narrator itself
 * report elapsed time for the completed beat, using a reserved delimiter
 * that is vanishingly unlikely to appear in ordinary prose. Unlike the
 * community pattern this adapts (Inner Self's blanket parenthesis
 * stripping), only this exact directive is ever removed from narrative
 * text — legitimate prose containing parentheses is never touched.
 */
export const MODEL_TEMPORAL_SIGNAL_KEY = "chronicle";

/** Self-reported confidence the narrator attaches to its own estimate. */
export type ModelSignalConfidence = "high" | "medium" | "low";

/**
 * Used when the narrator's directive omits a confidence token. Deliberately
 * the middle tier: not as strong as an explicit "high", but not dismissed
 * as "low" either, since the narrator did provide a concrete estimate.
 */
export const DEFAULT_MODEL_SIGNAL_CONFIDENCE: ModelSignalConfidence = "medium";

export type ModelTemporalSignalRejectionReason = "absent" | "malformed";

export interface ModelTemporalSignalAccepted {
  readonly status: "accepted";
  readonly elapsedTime: ElapsedTime;
  readonly confidence: ModelSignalConfidence;
}

export interface ModelTemporalSignalRejected {
  readonly status: "rejected";
  readonly reason: ModelTemporalSignalRejectionReason;
}

export type ModelTemporalSignalResult = ModelTemporalSignalAccepted | ModelTemporalSignalRejected;

// Bounded digit widths keep every captured number a small, unambiguously safe integer.
// There is deliberately no upper bound on the resulting magnitude (D-026 Cenário 1):
// a fantasy narrative can legitimately skip months or years, and Chronicle trusts the
// narrator's own judgment on magnitude, gated only by the non-current-frame cross-check.
// "W" (weeks) is accepted alongside the ISO-8601 date part as a natural unit for a
// narrative time skip / montage.
const DURATION_PATTERN = /^P(?:(\d{1,4})W)?(?:(\d{1,4})D)?(?:T(?:(\d{1,3})H)?(?:(\d{1,3})M)?(?:(\d{1,3})S)?)?$/i;
// Lenient fallback for a narrator that drops the ISO "P"/"T" markers while still
// giving unambiguous unit-suffixed numbers (e.g. "2h30m", "9h15m", "3d"). Tried only
// when the strict ISO form above does not match, so it never weakens strict parsing —
// it only rescues a close variant that would otherwise be discarded as malformed.
const LENIENT_DURATION_PATTERN = /^(?:(\d{1,4})w)?(?:(\d{1,4})d)?(?:(\d{1,3})h)?(?:(\d{1,3})m)?(?:(\d{1,3})s)?$/i;
const CONFIDENCE_TOKENS: readonly ModelSignalConfidence[] = ["high", "medium", "low"];

function directivePattern(): RegExp {
  // A fresh RegExp per call avoids any shared-lastIndex statefulness across exec/replace.
  // Captures anything up to the next ">>" (not just an allow-listed character set) so a
  // near-miss attempt (stray punctuation, an unrecognized confidence word, ...) is still
  // found and classified as malformed, instead of silently vanishing as "absent".
  return /<<chronicle:([^>]{1,60})>>/g;
}

/** ES2018-safe equivalent of String.prototype.matchAll (added in ES2020). */
function findAllDirectives(narrative: string): readonly string[] {
  const pattern = directivePattern();
  const values: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(narrative)) !== null) {
    values.push(match[1].replace(/\s+/g, ""));
    if (match[0].length === 0) pattern.lastIndex += 1; // guard against a zero-width match looping forever
  }
  return values;
}

/**
 * Reads the narrator-authored temporal directive from a completed beat, if
 * any: an elapsed duration or "none", each optionally followed by a comma
 * and a self-reported confidence (e.g. "PT9H15M,medium"). If the narrator
 * emits more than one directive in the same beat, the last one is taken as
 * its final intent (D-026 Cenário 1: a plausible self-correction, not
 * treated as a hard error). An absent or malformed value is the only
 * remaining case treated as untrustworthy — the caller is expected to fall
 * back to Chronicle's deterministic reasoner then.
 */
export function readModelTemporalSignal(narrative: string): ModelTemporalSignalResult {
  const matches = findAllDirectives(narrative);
  if (matches.length === 0) return Object.freeze({ status: "rejected", reason: "absent" });

  const [rawValue, rawConfidence] = matches[matches.length - 1].split(",");
  const confidence = parseConfidence(rawConfidence);
  if (rawConfidence !== undefined && confidence === undefined) {
    return Object.freeze({ status: "rejected", reason: "malformed" });
  }

  if (/^none$/i.test(rawValue)) {
    return Object.freeze({
      status: "accepted",
      elapsedTime: createElapsedTime({ days: 0, hours: 0, minutes: 0, seconds: 0 }),
      confidence: confidence ?? DEFAULT_MODEL_SIGNAL_CONFIDENCE
    });
  }

  const parsed = parseDuration(rawValue);
  if (parsed === undefined) return Object.freeze({ status: "rejected", reason: "malformed" });

  return Object.freeze({
    status: "accepted",
    elapsedTime: createElapsedTime(parsed),
    confidence: confidence ?? DEFAULT_MODEL_SIGNAL_CONFIDENCE
  });
}

/** Tries the strict ISO-8601-like form first, then the lenient no-punctuation fallback. */
function parseDuration(rawValue: string): { days: number; hours: number; minutes: number; seconds: number } | undefined {
  const strict = DURATION_PATTERN.exec(rawValue);
  if (strict !== null && [strict[1], strict[2], strict[3], strict[4], strict[5]].some((group) => group !== undefined)) {
    return componentsFrom(strict);
  }
  const lenient = LENIENT_DURATION_PATTERN.exec(rawValue);
  if (lenient !== null && [lenient[1], lenient[2], lenient[3], lenient[4], lenient[5]].some((group) => group !== undefined)) {
    return componentsFrom(lenient);
  }
  return undefined;
}

function componentsFrom(match: RegExpExecArray): { days: number; hours: number; minutes: number; seconds: number } {
  const weeks = Number(match[1] ?? 0);
  const days = Number(match[2] ?? 0);
  return {
    days: weeks * 7 + days,
    hours: Number(match[3] ?? 0),
    minutes: Number(match[4] ?? 0),
    seconds: Number(match[5] ?? 0)
  };
}

function parseConfidence(raw: string | undefined): ModelSignalConfidence | undefined {
  if (raw === undefined) return undefined;
  const normalized = raw.toLowerCase();
  return (CONFIDENCE_TOKENS as readonly string[]).includes(normalized) ? (normalized as ModelSignalConfidence) : undefined;
}

/**
 * Removes every occurrence of the directive syntax before text reaches the
 * player, regardless of whether it was valid or malformed, and regardless
 * of how many occurrences were present (multiple no longer count as a
 * rejection reason — the last is trusted as final intent; see
 * readModelTemporalSignal). Runs unconditionally on Chronicle's Output text
 * so a stray or rejected directive can never leak into what the player reads.
 */
export function stripModelTemporalSignal(narrative: string): string {
  // Identity pass-through in the common case (no directive at all) so this
  // never trims or reformats ordinary narrative text unnecessarily.
  if (!directivePattern().test(narrative)) return narrative;
  return narrative.replace(directivePattern(), "").replace(/[ \t]{2,}/g, " ").trim();
}
