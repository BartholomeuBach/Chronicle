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

/**
 * Removes every form of the bootstrap control line before the player reads it.
 * The prefill instruction itself tells the narrator to answer `none,high>>`
 * when uncertain, so that completion must be stripped exactly like `HH:MM,...>>`
 * (verified against the built Output script: it previously reached the player).
 */
export function stripInitialClockSignal(text: string): string {
  return text.replace(/<<chronicle:start:[^>]{1,24}>>/gi, "").replace(/^\s*(?:none|\d{1,2}:\d{2})(?:\s*,\s*[a-z]{1,10})?\s*>>\s*/i, "").replace(/[ \t]{2,}/g, " ").trim();
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
  const clockReading = /\b(?:the )?(?:clock|watch|phone|computer|dashboard|display)\s+(?:reads?|shows?|says?)\s+([01]?\d|2[0-3]):([0-5]\d)\b/.exec(text);
  if (clockReading !== null) return { hour: Number(clockReading[1]), minute: Number(clockReading[2]), evidence: `Explicit clock reading: ${clockReading[0].trim()}.` };
  return undefined;
}

const INITIAL_TIME_CUES: readonly { readonly pattern: RegExp; readonly hour: number; readonly minute: number; readonly evidence: string }[] = [
  // Specific terms must stay before broad ones: the first match wins.
  { pattern: /\b(?:at|just after|just before|near|around) midnight\b|\bstroke of (?:midnight|twelve)\b|\btwelve o'?clock at night\b/, hour: 0, minute: 0, evidence: "Midnight cue." },
  { pattern: /\b(?:deep|dead|middle) (?:in|of) (?:the )?night\b|\bwitching hour\b|\bwee hours\b|\bsmall hours\b|\b(?:well )?past midnight\b|\bnocturnal hours\b/, hour: 2, minute: 0, evidence: "Deep-night cue." },
  { pattern: /\b(?:pre[- ]?dawn|before dawn|before daybreak|last watch|darkest (?:part|hour) of (?:the )?night)\b|\bnight (?:was )?at (?:its )?darkest\b|\bthe world (?:was )?still asleep\b/, hour: 4, minute: 30, evidence: "Pre-dawn cue." },
  { pattern: /\b(?:first light|daybreak|break of day|dawn|sunrise|sunup)\b|\bfirst (?:rays?|light) (?:of|from) (?:the )?sun\b|\bsun (?:breaks|break|peeks?|crests?|rises?|rose) (?:over|above|through)\b|\b(?:rooster|cock) (?:crows?|crowed)\b/, hour: 6, minute: 0, evidence: "Dawn/sunrise cue." },
  { pattern: /\b(?:early|dark|chilly|crisp|misty|foggy) morning\b|\bmorning (?:mist|fog|dew|chill)\b|\bthe day (?:has )?(?:barely |just )?begun\b|\b(?:shops?|cafes?|markets?) (?:are )?(?:just )?opening\b|\bcommuters? (?:begin|beginning|start|starting)\b/, hour: 7, minute: 0, evidence: "Early-morning cue." },
  { pattern: /\b(?:mid[- ]?morning|breakfast time|after breakfast)\b|\bmorning (?:sun|light) (?:spills?|streamed|filters?|filtered)\b|\b(?:school|work)day (?:has )?(?:just )?started\b/, hour: 9, minute: 30, evidence: "Mid-morning cue." },
  { pattern: /\b(?:late morning|nearing noon|approaching noon|almost noon)\b|\bthe morning (?:is|was) (?:nearly |almost )?over\b|\bbrunch time\b/, hour: 10, minute: 30, evidence: "Late-morning cue." },
  { pattern: /\b(?:just )?after noon\b|\bearly afternoon\b|\bthe heat of (?:the )?(?:day|afternoon)\b|\b(?:lunch|the midday meal) (?:is|was) over\b/, hour: 13, minute: 30, evidence: "Early-afternoon cue." },
  { pattern: /\b(?:late afternoon|late day|toward evening|close of day|end of (?:the )?day)\b|\b(?:lengthening|long|elongated) shadows\b|\bshadows? (?:stretch|stretched|creep|crept) (?:across|over)\b|\bthe sun (?:hangs?|hung|sits?|sat) low\b|\bthe sun (?:is|was) sinking\b|\b(?:golden|magic) hour\b|\bafternoon (?:is|was) waning\b/, hour: 17, minute: 30, evidence: "Late-afternoon figurative cue." },
  { pattern: /\b(?:noon|midday|high noon|twelve o'?clock)\b|\bthe sun (?:is|was) (?:directly )?(?:overhead|at its zenith)\b|\b(?:lunch|lunchtime)\b/, hour: 12, minute: 0, evidence: "Noon cue." },
  { pattern: /\b(?:mid[- ]?afternoon|afternoon)\b|\bthe day (?:drags?|wears?) on\b|\b(?:classes?|the workday) (?:are|is) (?:still )?in session\b/, hour: 15, minute: 0, evidence: "Afternoon cue." },
  { pattern: /\bblue hour\b|\bjust after sunset\b|\bearly evening\b|\b(?:streetlights?|lamps?|city lights?) (?:flicker|flickered|come|came) (?:on|alive)\b|\bthe sky (?:is|was) (?:deep )?blue\b/, hour: 19, minute: 30, evidence: "Early-evening cue." },
  { pattern: /\b(?:sunset|sundown|dusk|twilight|gloaming|eventide)\b|\bthe sun (?:sets?|set|dips?|dipped|slips?|slipped) (?:below|behind|under)\b|\bsky (?:burns?|burned|glows?|glowed|blushes?|blushed) (?:orange|red|gold|pink|purple)\b|\bdaylight (?:fades?|faded|bleeds? away)\b/, hour: 18, minute: 30, evidence: "Sunset/dusk cue." },
  { pattern: /\b(?:evening|nightfall|after dark|night has fallen)\b|\b(?:dinner|supper) time\b|\bthe (?:streets?|city) (?:glow|glows|shine|shines) with neon\b|\bwindows? (?:glow|glowed) warmly\b/, hour: 20, minute: 0, evidence: "Evening cue." },
  { pattern: /\b(?:nighttime|at night|the night)\b|\b(?:moonlight|moonlit)\b|\bstars? (?:blanket|fill|prick|studded|studded) the sky\b|\bthe moon (?:hangs?|hung|is|was) (?:high|low|overhead)\b|\bthe (?:streets?|roads?) (?:are|were) deserted\b/, hour: 22, minute: 0, evidence: "Night-sky cue." },
  { pattern: /\b(?:late night|near dawn|the night is young|after hours)\b|\bthe last train\b|\bbars? (?:are|were) closing\b|\bthe city (?:never sleeps|has gone quiet)\b/, hour: 23, minute: 0, evidence: "Late-night cue." },
  { pattern: /\b(?:morning)\b/, hour: 8, minute: 0, evidence: "Generic morning cue." },
  { pattern: /\b(?:night)\b/, hour: 21, minute: 0, evidence: "Generic night cue." }
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
