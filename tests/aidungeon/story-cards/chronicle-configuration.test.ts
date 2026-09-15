import { describe, expect, it } from "vitest";
import { CHRONICLE_CONFIGURATION_NOTES_TEMPLATE, readChronicleConfiguration, runtimeDateTime } from "../../../src/aidungeon/story-cards/index.js";
import type { AiDungeonStoryCard } from "../../../src/aidungeon/story-cards/index.js";

const card = (description: string): AiDungeonStoryCard => ({ keys: "chronicle-configuration", entry: "", type: "story", description });

describe("Chronicle Configuration Story Card", () => {
  it("is disabled when the configuration card is absent", () => {
    expect(readChronicleConfiguration([])).toEqual({ enabled: false, mode: "automatic", repairChronicleCard: false });
  });
  it("reads the friendly manual fields", () => {
    expect(readChronicleConfiguration([card("Chronicle Enabled: true\nInitialization Mode: Manual\nStart Year: 1342\nStart Month: 9\nStart Day: 17\nStart Hour: 8")], { year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 45 })).toMatchObject({ enabled: true, mode: "manual", initialDateTime: { year: 1342, month: 9, day: 17, hour: 8, minute: 32, second: 45 } });
  });
  it("completes blank Manual fields from the current runtime datetime", () => {
    expect(readChronicleConfiguration([card("Initialization Mode: Manual\nStart Year: 1434")], { year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 45 })).toMatchObject({
      initialDateTime: { year: 1434, month: 4, day: 13, hour: 19, minute: 32, second: 45 }
    });
  });
  it("reports an invalid Manual value instead of silently changing the requested date", () => {
    expect(readChronicleConfiguration([card("Initialization Mode: Manual\nStart Year: long ago")], { year: 2026, month: 4, day: 13, hour: 19, minute: 32, second: 45 })).toMatchObject({
      mode: "manual", error: "Manual Chronicle configuration has an invalid start year value."
    });
  });
  it("defaults an existing card to enabled automatic mode and allows pause", () => {
    expect(readChronicleConfiguration([card("")])).toEqual({ enabled: true, mode: "automatic", repairChronicleCard: false });
    expect(readChronicleConfiguration([card("Chronicle Enabled: false")])).toEqual({ enabled: false, mode: "automatic", repairChronicleCard: false });
  });
  it("reads an explicit duplicate-card repair request and provides a safety comment in the template", () => {
    expect(readChronicleConfiguration([card("Repair Chronicle Card: true")])).toMatchObject({ repairChronicleCard: true });
    expect(CHRONICLE_CONFIGURATION_NOTES_TEMPLATE).toContain("do not change initialization fields during an active story");
    expect(CHRONICLE_CONFIGURATION_NOTES_TEMPLATE).toContain("Repair Chronicle Card: false");
  });
  it("uses New York civil time for automatic and blank Manual components", () => {
    expect(runtimeDateTime(new Date("2026-03-08T06:59:00Z"))).toEqual({ year: 2026, month: 3, day: 8, hour: 1, minute: 59, second: 0 });
    expect(runtimeDateTime(new Date("2026-03-08T07:00:00Z"))).toEqual({ year: 2026, month: 3, day: 8, hour: 3, minute: 0, second: 0 });
    expect(runtimeDateTime(new Date("2026-11-01T06:00:00Z"))).toEqual({ year: 2026, month: 11, day: 1, hour: 1, minute: 0, second: 0 });
  });
});
