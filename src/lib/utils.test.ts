import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { formatRelativeTime } from "./utils";

describe("formatRelativeTime", () => {
  beforeEach(() => {
    // Mock Date to have consistent test results
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-03T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("recent times (seconds)", () => {
    it("returns 'just now' for times less than 1 minute ago", () => {
      const thirtySecsAgo = new Date("2026-01-03T11:59:30Z");
      expect(formatRelativeTime(thirtySecsAgo)).toBe("just now");
    });

    it("returns 'just now' for current time", () => {
      const now = new Date("2026-01-03T12:00:00Z");
      expect(formatRelativeTime(now)).toBe("just now");
    });
  });

  describe("recent times (minutes)", () => {
    it("returns '1m ago' for 1 minute ago", () => {
      const oneMinAgo = new Date("2026-01-03T11:59:00Z");
      expect(formatRelativeTime(oneMinAgo)).toBe("1m ago");
    });

    it("returns '30m ago' for 30 minutes ago", () => {
      const thirtyMinsAgo = new Date("2026-01-03T11:30:00Z");
      expect(formatRelativeTime(thirtyMinsAgo)).toBe("30m ago");
    });

    it("returns '59m ago' for 59 minutes ago", () => {
      const fiftyNineMinsAgo = new Date("2026-01-03T11:01:00Z");
      expect(formatRelativeTime(fiftyNineMinsAgo)).toBe("59m ago");
    });
  });

  describe("older times (hours)", () => {
    it("returns '1h ago' for 1 hour ago", () => {
      const oneHourAgo = new Date("2026-01-03T11:00:00Z");
      expect(formatRelativeTime(oneHourAgo)).toBe("1h ago");
    });

    it("returns '12h ago' for 12 hours ago", () => {
      const twelveHoursAgo = new Date("2026-01-03T00:00:00Z");
      expect(formatRelativeTime(twelveHoursAgo)).toBe("12h ago");
    });

    it("returns '23h ago' for 23 hours ago", () => {
      const twentyThreeHoursAgo = new Date("2026-01-02T13:00:00Z");
      expect(formatRelativeTime(twentyThreeHoursAgo)).toBe("23h ago");
    });
  });

  describe("older times (days)", () => {
    it("returns '1d ago' for 1 day ago", () => {
      const oneDayAgo = new Date("2026-01-02T12:00:00Z");
      expect(formatRelativeTime(oneDayAgo)).toBe("1d ago");
    });

    it("returns '6d ago' for 6 days ago", () => {
      const sixDaysAgo = new Date("2025-12-28T12:00:00Z");
      expect(formatRelativeTime(sixDaysAgo)).toBe("6d ago");
    });
  });

  describe("older times (beyond 7 days)", () => {
    it("returns formatted date for 7 days ago", () => {
      const sevenDaysAgo = new Date("2025-12-27T12:00:00Z");
      const result = formatRelativeTime(sevenDaysAgo);
      // Should return formatted date like "Dec 27, 12:00 PM" (locale dependent)
      expect(result).toContain("Dec");
      expect(result).toContain("27");
    });

    it("returns formatted date for 30 days ago", () => {
      const thirtyDaysAgo = new Date("2025-12-04T10:30:00Z");
      const result = formatRelativeTime(thirtyDaysAgo);
      expect(result).toContain("Dec");
      expect(result).toContain("4");
    });
  });

  describe("edge cases", () => {
    it("handles string date input", () => {
      expect(formatRelativeTime("2026-01-03T11:59:00Z")).toBe("1m ago");
    });

    it("handles ISO date string", () => {
      expect(formatRelativeTime("2026-01-03T11:00:00.000Z")).toBe("1h ago");
    });
  });
});
