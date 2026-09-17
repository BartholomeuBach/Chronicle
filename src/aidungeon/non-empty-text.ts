/**
 * AI Dungeon treats empty Input and Output text as a script error. A zero-width
 * placeholder keeps the Phase 0 adapter safe without altering non-empty prose.
 */
export function nonEmptyText(text: string): string {
  return text === "" ? "\u200B" : text;
}
