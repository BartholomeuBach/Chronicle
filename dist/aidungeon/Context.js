// Chronicle -- paste this file into the AI Dungeon Context script tab.
// @cache-compatible

// src/aidungeon/non-empty-text.ts
function nonEmptyText(text2) {
  return text2 === "" ? "\u200B" : text2;
}

// src/aidungeon/runtime-guards.ts
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function usableStoryCardGlobals(storyCards2, addStoryCard2, updateStoryCard2, removeStoryCard2) {
  if (!Array.isArray(storyCards2) || typeof addStoryCard2 !== "function" || typeof updateStoryCard2 !== "function") return void 0;
  return {
    storyCards: storyCards2,
    addStoryCard: addStoryCard2,
    updateStoryCard: updateStoryCard2,
    removeStoryCard: typeof removeStoryCard2 === "function" ? removeStoryCard2 : void 0
  };
}

// src/aidungeon/context.ts
var modifier = (value) => {
  const safeText = typeof value === "string" ? value : "";
  if (!isPlainObject(state)) return { text: nonEmptyText(safeText) };
  const runtime = globalThis.ChronicleAIDungeon;
  if (runtime === void 0) return { text: nonEmptyText(safeText) };
  const actionCount = info === void 0 ? void 0 : info.actionCount;
  const maxChars = info === void 0 ? void 0 : info.maxChars;
  const memoryLength = info === void 0 ? void 0 : info.memoryLength;
  const result = runtime.onContext(safeText, {
    state,
    actionCount,
    maxChars,
    memoryLength,
    storyCards: usableStoryCardGlobals(storyCards, addStoryCard, updateStoryCard, removeStoryCard)
  });
  return { text: result };
};
modifier(text);
