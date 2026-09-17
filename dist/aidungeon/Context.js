// Chronicle — paste this file into the AI Dungeon Context script tab.
"use strict";
(() => {
  // src/aidungeon/non-empty-text.ts
  function nonEmptyText(text2) {
    return text2 === "" ? "\u200B" : text2;
  }

  // src/aidungeon/context.ts
  var modifier = (value) => {
    var _a, _b;
    return {
      text: (_b = (_a = globalThis.ChronicleAIDungeon) == null ? void 0 : _a.onContext(value, { state, actionCount: info.actionCount, maxChars: info.maxChars, memoryLength: info.memoryLength, storyCards: { storyCards, addStoryCard, updateStoryCard, removeStoryCard: typeof removeStoryCard === "function" ? removeStoryCard : void 0 } })) != null ? _b : nonEmptyText(value)
    };
  };
  modifier(text);
})();
