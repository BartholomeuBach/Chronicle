import { describe, expect, it } from "vitest";
import { isPlainObject, usableStoryCardGlobals } from "../../src/aidungeon/runtime-guards.js";

describe("runtime-guards: defensive checks for AI Dungeon's injected globals", () => {
  describe("isPlainObject", () => {
    it("accepts a plain object", () => {
      expect(isPlainObject({})).toBe(true);
      expect(isPlainObject({ a: 1 })).toBe(true);
    });
    it("rejects arrays, null, and primitives", () => {
      expect(isPlainObject([])).toBe(false);
      expect(isPlainObject(null)).toBe(false);
      expect(isPlainObject(undefined)).toBe(false);
      expect(isPlainObject("state")).toBe(false);
      expect(isPlainObject(42)).toBe(false);
    });
  });

  describe("usableStoryCardGlobals", () => {
    const addStoryCard = () => 0 as const;
    const updateStoryCard = () => undefined;

    it("returns a usable runtime when every required global is present and well-typed", () => {
      const result = usableStoryCardGlobals([], addStoryCard, updateStoryCard, undefined);
      expect(result).toBeDefined();
      expect(result?.storyCards).toEqual([]);
      expect(result?.removeStoryCard).toBeUndefined();
    });

    it("includes removeStoryCard only when it is actually a function", () => {
      const removeStoryCard = () => undefined;
      expect(usableStoryCardGlobals([], addStoryCard, updateStoryCard, removeStoryCard)?.removeStoryCard).toBe(removeStoryCard);
      expect(usableStoryCardGlobals([], addStoryCard, updateStoryCard, "not a function")?.removeStoryCard).toBeUndefined();
    });

    it("returns undefined when storyCards is not an array", () => {
      expect(usableStoryCardGlobals(undefined, addStoryCard, updateStoryCard, undefined)).toBeUndefined();
      expect(usableStoryCardGlobals({}, addStoryCard, updateStoryCard, undefined)).toBeUndefined();
      expect(usableStoryCardGlobals(null, addStoryCard, updateStoryCard, undefined)).toBeUndefined();
    });

    it("returns undefined when addStoryCard or updateStoryCard is missing or not a function", () => {
      expect(usableStoryCardGlobals([], undefined, updateStoryCard, undefined)).toBeUndefined();
      expect(usableStoryCardGlobals([], addStoryCard, undefined, undefined)).toBeUndefined();
      expect(usableStoryCardGlobals([], "nope", updateStoryCard, undefined)).toBeUndefined();
    });
  });
});
