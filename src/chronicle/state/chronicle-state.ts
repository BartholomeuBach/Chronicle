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

/** The minimal canonical Chronicle state for the first domain slice. */
export interface ChronicleState {
  readonly currentDateTime: ChronicleDateTime;
}
