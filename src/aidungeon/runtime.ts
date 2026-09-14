/**
 * Minimal AI Dungeon hook boundary for Phase 0.
 *
 * Chronicle domain behavior is intentionally not implemented here. The initial
 * adapters preserve text and give later phases one replaceable integration seam.
 */
export interface ChronicleRuntime {
  onInput(text: string): string;
  onContext(text: string): string;
  onOutput(text: string): string;
}

/**
 * AI Dungeon treats empty Input and Output text as a script error. A zero-width
 * placeholder keeps the Phase 0 adapter safe without altering non-empty prose.
 */
export function nonEmptyText(text: string): string {
  return text === "" ? "\u200B" : text;
}

export const passthroughRuntime: ChronicleRuntime = Object.freeze({
  onInput: nonEmptyText,
  onContext: nonEmptyText,
  onOutput: nonEmptyText
});
