// Chronicle — paste this file into the AI Dungeon Input script tab.
"use strict";
(() => {
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

  // src/aidungeon/input.ts
  var modifier = (value) => {
    var _a, _b;
    const safeText = typeof value === "string" ? value : "";
    return {
      text: isPlainObject(state) ? (_b = (_a = globalThis.ChronicleAIDungeon) == null ? void 0 : _a.onInput(safeText, {
        state,
        actionCount: info == null ? void 0 : info.actionCount,
        storyCards: usableStoryCardGlobals(storyCards, addStoryCard, updateStoryCard, removeStoryCard)
      })) != null ? _b : nonEmptyText(safeText) : nonEmptyText(safeText)
    };
  };
  modifier(text);
})();
