import { describe, expect, it } from "vitest";
import { readChronicleConfiguration } from "../../../src/aidungeon/story-cards/index.js";
import type { AiDungeonStoryCard } from "../../../src/aidungeon/story-cards/index.js";

const card = (description: string): AiDungeonStoryCard => ({ keys: "chronicle-configuration", entry: "", type: "story", description });

describe("Chronicle Configuration Story Card", () => {
  it("is disabled when the configuration card is absent", () => {
    expect(readChronicleConfiguration([])).toEqual({ enabled: false, mode: "automatic" });
  });
  it("reads the friendly manual fields", () => {
    expect(readChronicleConfiguration([card("Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 1342\nStart Month: 9\nStart Day: 17\nStart Hour: 8")])).toMatchObject({ enabled: true, mode: "manual", initialDateTime: { year: 1342, month: 9, day: 17, hour: 8, minute: 0, second: 0 } });
  });
  it("defaults an existing card to enabled automatic mode and allows pause", () => {
    expect(readChronicleConfiguration([card("")])).toEqual({ enabled: true, mode: "automatic" });
    expect(readChronicleConfiguration([card("Chronicle Enabled: false")])).toEqual({ enabled: false, mode: "automatic" });
  });
});
