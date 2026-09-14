import { passthroughRuntime } from "./runtime.js";

declare global {
  // AI Dungeon evaluates Library before the other script tabs.
  // This deliberately small global is the only Phase 0 shared runtime surface.
  var ChronicleAIDungeon: typeof passthroughRuntime | undefined;
}

globalThis.ChronicleAIDungeon = passthroughRuntime;
