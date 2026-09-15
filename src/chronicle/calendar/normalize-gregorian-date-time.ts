import type { ChronicleDateTime, ChronicleDateTimeInput } from "../state/chronicle-state.js";

const SECONDS_PER_DAY = 86_400;
const MIN_YEAR = 1;
const MAX_YEAR = 9_999;
const CUMULATIVE_DAYS_BEFORE_MONTH = [0, 0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

/**
 * Normalizes a fictional Gregorian datetime without relying on JavaScript Date.
 * Values outside ordinary component ranges carry into the next or previous unit.
 */
export function normalizeGregorianDateTime(input: ChronicleDateTimeInput): ChronicleDateTime {
  assertSafeIntegerComponents(input);

  const monthIndex = assertSafeInteger(input.month - 1, "month normalization");
  const yearFromMonth = floorDiv(monthIndex, 12);
  const normalizedYear = assertSafeInteger(input.year + yearFromMonth, "year normalization");
  const normalizedMonth = modulo(monthIndex, 12) + 1;

  const totalSeconds = assertSafeInteger(
    assertSafeInteger(input.hour * 3_600, "hour normalization") +
      assertSafeInteger(input.minute * 60, "minute normalization") +
      input.second,
    "time normalization"
  );
  const dayFromTime = floorDiv(totalSeconds, SECONDS_PER_DAY);
  const secondOfDay = modulo(totalSeconds, SECONDS_PER_DAY);
  const day = assertSafeInteger(input.day + dayFromTime, "day normalization");

  const ordinal = assertSafeInteger(
    daysBeforeYear(normalizedYear) + daysBeforeMonth(normalizedYear, normalizedMonth) + day - 1,
    "date normalization"
  );
  const normalizedDate = dateFromOrdinal(ordinal);

  return Object.freeze({
    ...normalizedDate,
    hour: floorDiv(secondOfDay, 3_600),
    minute: floorDiv(modulo(secondOfDay, 3_600), 60),
    second: modulo(secondOfDay, 60)
  });
}

/** Checks that persisted datetime components are already canonical D0 values. */
export function isNormalizedGregorianDateTime(value: unknown): value is ChronicleDateTime {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Partial<ChronicleDateTime>;
  if (Object.keys(candidate).length !== 6 || !Object.values(candidate).every(Number.isSafeInteger)) return false;
  try {
    const normalized = normalizeGregorianDateTime(candidate as ChronicleDateTimeInput);
    return normalized.year === candidate.year && normalized.month === candidate.month && normalized.day === candidate.day &&
      normalized.hour === candidate.hour && normalized.minute === candidate.minute && normalized.second === candidate.second;
  } catch {
    return false;
  }
}

function assertSafeIntegerComponents(input: ChronicleDateTimeInput): void {
  for (const [name, value] of Object.entries(input)) {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`${name} must be a finite safe integer.`);
    }
  }
}

function assertSafeInteger(value: number, operation: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${operation} cannot be represented safely.`);
  }
  return value;
}

function floorDiv(value: number, divisor: number): number {
  return Math.floor(value / divisor);
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysBeforeYear(year: number): number {
  const previousYear = assertSafeInteger(year - 1, "year calculation");
  return assertSafeInteger(
    365 * previousYear +
      floorDiv(previousYear, 4) -
      floorDiv(previousYear, 100) +
      floorDiv(previousYear, 400),
    "year calculation"
  );
}

function daysBeforeMonth(year: number, month: number): number {
  return CUMULATIVE_DAYS_BEFORE_MONTH[month] + (month > 2 && isLeapYear(year) ? 1 : 0);
}

function dateFromOrdinal(ordinal: number): Pick<ChronicleDateTime, "year" | "month" | "day"> {
  const firstSupportedDay = daysBeforeYear(MIN_YEAR);
  const firstUnsupportedDay = daysBeforeYear(MAX_YEAR + 1);

  if (ordinal < firstSupportedDay || ordinal >= firstUnsupportedDay) {
    throw new RangeError(`Normalized year must be between ${MIN_YEAR} and ${MAX_YEAR}.`);
  }

  let lowerYear = MIN_YEAR;
  let upperYear = MAX_YEAR;

  while (lowerYear < upperYear) {
    const middleYear = Math.ceil((lowerYear + upperYear) / 2);
    if (daysBeforeYear(middleYear) <= ordinal) {
      lowerYear = middleYear;
    } else {
      upperYear = middleYear - 1;
    }
  }

  const year = lowerYear;
  let dayOfYear = ordinal - daysBeforeYear(year);
  let month = 1;

  while (month < 12) {
    const nextMonthStart = daysBeforeMonth(year, month + 1);
    if (dayOfYear < nextMonthStart) {
      break;
    }
    month += 1;
  }

  return { year, month, day: dayOfYear - daysBeforeMonth(year, month) + 1 };
}
