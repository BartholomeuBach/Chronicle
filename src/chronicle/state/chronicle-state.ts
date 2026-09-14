/** Components supplied when Chronicle is initialized. */
export interface ChronicleDateTimeInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** A normalized fictional datetime in the Gregorian D0 calendar. */
export interface ChronicleDateTime extends Readonly<ChronicleDateTimeInput> {}

/** The canonical D0 state, including a bounded idempotency boundary. */
export interface ChronicleState {
  readonly currentDateTime: ChronicleDateTime;
  readonly processedBeatIds: readonly string[];
}
