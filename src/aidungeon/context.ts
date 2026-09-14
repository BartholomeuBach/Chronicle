import { nonEmptyText } from "./runtime.js";

declare const text: string;

const modifier = (value: string) => ({
  text: globalThis.ChronicleAIDungeon?.onContext(value) ?? nonEmptyText(value)
});

modifier(text);
