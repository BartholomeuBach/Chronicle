import { describe, expect, it } from "vitest";
import { renderChronicleTimeNotification } from "../../src/aidungeon/chronicle-time-notification.js";
import { initializeChronicleState } from "../../src/chronicle/state/index.js";

const dateTime = (hour: number, minute = 0) => initializeChronicleState({ year: 1434, month: 9, day: 18, hour, minute, second: 0 }).currentDateTime;

describe("Chronicle time-period notification", () => {
  it("does not notify when time advances inside the same period", () => {
    expect(renderChronicleTimeNotification(dateTime(19, 32), dateTime(19, 47))).toBeUndefined();
  });

  it("renders a concise icon notification when night begins", () => {
    expect(renderChronicleTimeNotification(dateTime(20, 55), dateTime(21, 3))).toBe("🌙 Chronicle — Nightfall\nStory time: 1434/09/18 21:03:00.");
  });

  it("renders the correct labels at the remaining period transitions", () => {
    expect(renderChronicleTimeNotification(dateTime(4, 59), dateTime(5))).toContain("🌅 Chronicle — Dawn");
    expect(renderChronicleTimeNotification(dateTime(8, 59), dateTime(9))).toContain("☀️ Chronicle — Morning");
    expect(renderChronicleTimeNotification(dateTime(11, 59), dateTime(12))).toContain("🌤️ Chronicle — Afternoon");
    expect(renderChronicleTimeNotification(dateTime(17, 59), dateTime(18))).toContain("🌆 Chronicle — Evening");
    expect(renderChronicleTimeNotification(dateTime(23, 59), dateTime(0))).toContain("🌙 Chronicle — Late night");
  });
});
