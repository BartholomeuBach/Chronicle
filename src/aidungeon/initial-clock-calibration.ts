import type { ChronicleDateTime } from "../chronicle/state/chronicle-state.js";

export const CHRONICLE_INITIAL_CLOCK_CALIBRATION_STATE_KEY = "chronicleInitialClockCalibration";

export type InitialClockCalibrationSource = "model-signal" | "scenario-context-rule" | "automatic-clock";
export type InitialBootstrapInstructionStatus = "appended" | "omitted-context-limit" | "not-requested";
export type InitialBootstrapSignalStatus = "accepted" | "absent" | "malformed" | "not-requested";
export type InitialBootstrapProtocolVariant = "header" | "prefill";

export interface InitialClockCalibration {
  readonly pending: boolean;
  readonly source?: InitialClockCalibrationSource;
  readonly evidence?: string;
  readonly hour?: number;
  readonly minute?: number;
  readonly contextCue?: string;
  readonly bootstrapInstructionStatus?: InitialBootstrapInstructionStatus;
  readonly bootstrapSignalStatus?: InitialBootstrapSignalStatus;
  readonly bootstrapProtocolVariant?: InitialBootstrapProtocolVariant;
}

export function createPendingInitialClockCalibration(): InitialClockCalibration {
  return Object.freeze({ pending: true });
}

export function isInitialClockCalibration(value: unknown): value is InitialClockCalibration {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<InitialClockCalibration>;
  if (typeof candidate.pending !== "boolean") return false;
  if (candidate.source === undefined) return candidate.pending;
  return (candidate.source === "model-signal" || candidate.source === "scenario-context-rule" || candidate.source === "automatic-clock") &&
    typeof candidate.evidence === "string" && isClockPart(candidate.hour, 23) && isClockPart(candidate.minute, 59) &&
    (candidate.contextCue === undefined || typeof candidate.contextCue === "string") &&
    (candidate.bootstrapInstructionStatus === undefined || isInstructionStatus(candidate.bootstrapInstructionStatus)) &&
    (candidate.bootstrapSignalStatus === undefined || isSignalStatus(candidate.bootstrapSignalStatus)) &&
    (candidate.bootstrapProtocolVariant === undefined || candidate.bootstrapProtocolVariant === "header" || candidate.bootstrapProtocolVariant === "prefill");
}

export function inferInitialClockFromContext(context: string, automatic: ChronicleDateTime): InitialClockCalibration {
  const text = context.toLowerCase();
  const explicit = findExplicitClock(text);
  if (explicit !== undefined) return complete("scenario-context-rule", explicit.hour, explicit.minute, explicit.evidence);

  const matched = INITIAL_TIME_CUES.find((cue) => cue.pattern.test(text));
  if (matched !== undefined) return complete("scenario-context-rule", matched.hour, matched.minute, matched.evidence);
  return complete("automatic-clock", automatic.hour, automatic.minute, "No reliable time-of-day cue in scenario context.");
}

export function readInitialClockSignal(text: string): InitialClockCalibration | undefined {
  return inspectInitialClockSignal(text).calibration;
}

export function inspectInitialClockSignal(text: string): { readonly status: InitialBootstrapSignalStatus; readonly calibration?: InitialClockCalibration } {
  const pattern = /<<chronicle:start:([^>]{1,24})>>/gi;
  let latest: string | undefined;
  let directive: RegExpExecArray | null;
  while ((directive = pattern.exec(text)) !== null) latest = directive[1];
  if (latest === undefined) return inspectInitialClockPrefill(text);
  const raw = latest.replace(/\s+/g, "");
  if (/^none(?:,(?:high|medium|low))?$/i.test(raw)) return Object.freeze({ status: "absent" });
  const parsed = /^(?:([01]?\d|2[0-3]):([0-5]\d))(?:,(high|medium|low))?$/i.exec(raw);
  if (parsed === null) return Object.freeze({ status: "malformed" });
  return Object.freeze({ status: "accepted", calibration: complete("model-signal", Number(parsed[1]), Number(parsed[2]), `Narrator bootstrap signal (${(parsed[3] ?? "medium").toLowerCase()} confidence).`) });
}

export function stripInitialClockSignal(text: string): string {
  return text.replace(/<<chronicle:start:[^>]{1,24}>>/gi, "").replace(/^\s*\d{1,2}:\d{2}(?:,(?:high|medium|low))?>>\s*/i, "").replace(/[ \t]{2,}/g, " ").trim();
}

export function applyInitialClockCalibration(dateTime: ChronicleDateTime, calibration: InitialClockCalibration): ChronicleDateTime {
  if (calibration.hour === undefined || calibration.minute === undefined) return dateTime;
  return Object.freeze({ ...dateTime, hour: calibration.hour, minute: calibration.minute, second: 0 });
}

function complete(source: InitialClockCalibrationSource, hour: number, minute: number, evidence: string): InitialClockCalibration {
  return Object.freeze({ pending: false, source, hour, minute, evidence });
}

function findExplicitClock(text: string): { readonly hour: number; readonly minute: number; readonly evidence: string } | undefined {
  const twelveHour = /\b(?:at|around|about)?\s*(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)\b/.exec(text);
  if (twelveHour !== null) {
    const meridiem = twelveHour[3].startsWith("p") ? 12 : 0;
    const hour = (Number(twelveHour[1]) % 12) + meridiem;
    return { hour, minute: Number(twelveHour[2] ?? 0), evidence: `Explicit 12-hour clock: ${twelveHour[0].trim()}.` };
  }
  const twentyFourHour = /\b(?:at|around|about)\s+([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (twentyFourHour !== null) return { hour: Number(twentyFourHour[1]), minute: Number(twentyFourHour[2]), evidence: `Explicit 24-hour clock: ${twentyFourHour[0].trim()}.` };
  return undefined;
}

const INITIAL_TIME_CUES: readonly { readonly pattern: RegExp; readonly hour: number; readonly minute: number; readonly evidence: string }[] = [
  { pattern: /\b(?:deep|dead|middle) (?:in|of) (?:the )?night\b|\bwitching hour\b|\bwee hours\b/, hour: 2, minute: 0, evidence: "Deep-night cue." },
  { pattern: /\bmidnight\b|\bstroke of twelve\b/, hour: 0, minute: 0, evidence: "Midnight cue." },
  { pattern: /\b(?:first light|daybreak|break of day|dawn|sunrise)\b|\bfirst rays? of (?:the )?sun\b/, hour: 6, minute: 0, evidence: "Dawn/sunrise cue." },
  { pattern: /\bearly morning\b|\bdark morning\b|\bmorning mist\b/, hour: 7, minute: 0, evidence: "Early-morning cue." },
  { pattern: /\blate morning\b/, hour: 10, minute: 30, evidence: "Late-morning cue." },
  { pattern: /\b(?:noon|midday|high noon)\b/, hour: 12, minute: 0, evidence: "Noon cue." },
  { pattern: /\b(?:late afternoon|lengthening shadows|sun hangs? low|golden hour)\b/, hour: 17, minute: 30, evidence: "Late-afternoon figurative cue." },
  { pattern: /\b(?:sunset|dusk|twilight)\b|\bsky (?:burns|glows) (?:orange|red|gold)\b/, hour: 18, minute: 30, evidence: "Sunset/dusk cue." },
  { pattern: /\b(?:evening|nightfall|after dark)\b|\bstreets? (?:glow|shine) with neon\b/, hour: 20, minute: 0, evidence: "Evening cue." },
  { pattern: /\b(?:moonlight only|stars? (?:blanket|fill) the sky|moon hangs high)\b/, hour: 22, minute: 0, evidence: "Night-sky figurative cue." },
  { pattern: /\bafternoon\b/, hour: 15, minute: 0, evidence: "Afternoon cue." },
  { pattern: /\bmorning\b/, hour: 8, minute: 0, evidence: "Morning cue." },
  { pattern: /\bnight\b/, hour: 21, minute: 0, evidence: "Generic night cue." }
];

function isClockPart(value: unknown, maximum: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= maximum;
}

function isInstructionStatus(value: unknown): value is InitialBootstrapInstructionStatus {
  return value === "appended" || value === "omitted-context-limit" || value === "not-requested";
}

function isSignalStatus(value: unknown): value is InitialBootstrapSignalStatus {
  return value === "accepted" || value === "absent" || value === "malformed" || value === "not-requested";
}

/** Accepts the completion of a Context suffix ending in `<<chronicle:start:`. */
function inspectInitialClockPrefill(text: string): { readonly status: InitialBootstrapSignalStatus; readonly calibration?: InitialClockCalibration } {
  const parsed = /^\s*([01]?\d|2[0-3]):([0-5]\d)(?:,(high|medium|low))?>>/i.exec(text);
  if (parsed !== null) {
    return Object.freeze({ status: "accepted", calibration: complete("model-signal", Number(parsed[1]), Number(parsed[2]), `Narrator bootstrap prefill (${(parsed[3] ?? "medium").toLowerCase()} confidence).`) });
  }
  if (/^\s*\d{1,2}:\d{2}(?:,[a-z]+)?>>/i.test(text)) return Object.freeze({ status: "malformed" });
  return Object.freeze({ status: "absent" });
}
