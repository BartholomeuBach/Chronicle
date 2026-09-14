import { nonEmptyText } from "./runtime.js";

declare const text: string;
declare const state: Record<string, unknown>;
declare const info: { actionCount?: number };

const modifier = (value: string) => ({
  text: globalThis.ChronicleAIDungeon?.onContext(value, { state, actionCount: info.actionCount }) ?? nonEmptyText(value)
});

modifier(text);
