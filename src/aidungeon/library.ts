import type { ChronicleRuntime } from "./runtime.js";
import { ruleBasedTemporalReasoner } from "../chronicle/reasoning/rule-based-temporal-reasoner.js";
import { createPlayerActionCorroboratedReasoner } from "../chronicle/reasoning/player-action-corroboration.js";
import { createChronicleRuntime } from "./runtime.js";

declare global {
  // AI Dungeon evaluates Library before the other script tabs.
  // This deliberately small global is the only Phase 0 shared runtime surface.
  //
  // Typed directly against the ChronicleRuntime interface rather than
  // `typeof` an eagerly-constructed value (a `passthroughRuntime` export
  // this replaced, 2026-09-16): that export's only purpose was this type,
  // but constructing it at module scope (`createChronicleRuntime()`, a
  // side effect esbuild cannot tree-shake away) forced Input/Context/
  // Output -- which only ever import the unrelated one-line `nonEmptyText`
  // helper from this same module -- to bundle Chronicle's entire domain
  // engine along with it. Confirmed by direct measurement: those three
  // dist files were ~980 lines each before this change, nearly as large
  // as Library.js itself, for tabs whose own source is two import lines
  // and a five-line modifier. A type-only import has no such cost.
  var ChronicleAIDungeon: ChronicleRuntime | undefined;
}

globalThis.ChronicleAIDungeon = createChronicleRuntime(createPlayerActionCorroboratedReasoner(ruleBasedTemporalReasoner));
