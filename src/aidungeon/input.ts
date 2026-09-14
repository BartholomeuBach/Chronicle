import { nonEmptyText } from "./runtime.js";

declare const text: string;

const modifier = (value: string) => ({
  text: globalThis.ChronicleAIDungeon?.onInput(value) ?? nonEmptyText(value)
});

modifier(text);
