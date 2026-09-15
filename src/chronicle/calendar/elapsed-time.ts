/**
 * Component form of elapsed fictional time. It deliberately has no years or
 * months: those units do not have a fixed Gregorian duration.
 */
export interface ElapsedTimeInput {
  readonly days: number;
  readonly hours: number;
  readonly minutes: number;
  readonly seconds: number;
}

/** A normalized, immutable duration that can only advance time. */
export interface ElapsedTime extends Readonly<ElapsedTimeInput> {}

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3_600;
const SECONDS_PER_DAY = 86_400;

/**
 * Validates and normalizes a forward-only elapsed duration.
 *
 * Negative elapsed time is intentionally rejected: Chronicle D0 does not
 * rewind its canonical in-story clock.
 */
export function createElapsedTime(input: ElapsedTimeInput): ElapsedTime {
  assertNonNegativeSafeIntegers(input);

  const totalSeconds = assertSafeInteger(
    assertSafeInteger(input.days * SECONDS_PER_DAY, "days") +
      assertSafeInteger(input.hours * SECONDS_PER_HOUR, "hours") +
      assertSafeInteger(input.minutes * SECONDS_PER_MINUTE, "minutes") +
      input.seconds,
    "elapsed time"
  );

  const days = Math.floor(totalSeconds / SECONDS_PER_DAY);
  const secondsWithinDay = totalSeconds % SECONDS_PER_DAY;

  return Object.freeze({
    days,
    hours: Math.floor(secondsWithinDay / SECONDS_PER_HOUR),
    minutes: Math.floor((secondsWithinDay % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE),
    seconds: secondsWithinDay % SECONDS_PER_MINUTE
  });
}

/** Returns whether a normalized duration leaves the fictional clock unchanged. */
export function isZeroElapsedTime(elapsedTime: ElapsedTime): boolean {
  return elapsedTime.days === 0 && elapsedTime.hours === 0 && elapsedTime.minutes === 0 && elapsedTime.seconds === 0;
}

function assertNonNegativeSafeIntegers(input: ElapsedTimeInput): void {
  for (const [name, value] of Object.entries(input)) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new RangeError(`${name} must be a non-negative safe integer.`);
    }
  }
}

function assertSafeInteger(value: number, component: string): number {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(`${component} cannot be represented safely.`);
  }
  return value;
}
