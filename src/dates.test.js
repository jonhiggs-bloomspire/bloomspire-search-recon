import { formatSiebelDateTime, isStale, parseSiebelDateTime } from "./dates";

describe("parseSiebelDateTime", () => {
  test("parses the Siebel clock time used by the search index", () => {
    expect(parseSiebelDateTime("11/5/2025 11:41:37 AM").toISOString()).toBe("2025-11-05T11:41:37.000Z");
    expect(parseSiebelDateTime("11/5/2025 11:41:37 PM").toISOString()).toBe("2025-11-05T23:41:37.000Z");
    expect(parseSiebelDateTime("11/5/2025 12:00:00 AM").toISOString()).toBe("2025-11-05T00:00:00.000Z");
    expect(parseSiebelDateTime("11/5/2025 12:00:00 PM").toISOString()).toBe("2025-11-05T12:00:00.000Z");
    expect(parseSiebelDateTime("1/2/2024 1:02:03 AM").toISOString()).toBe("2024-01-02T01:02:03.000Z");
    expect(parseSiebelDateTime("  11/5/2025 11:41:37 am  ").toISOString()).toBe(
      "2025-11-05T11:41:37.000Z"
    );
  });

  test("rejects ISO strings and impossible calendar values", () => {
    expect(() => parseSiebelDateTime("2025-11-05T11:41:37Z")).toThrow(/Unrecognized Siebel datetime/);
    expect(() => parseSiebelDateTime("13/1/2025 1:00:00 AM")).toThrow(/Unrecognized/);
    expect(() => parseSiebelDateTime("2/29/2025 1:00:00 AM")).toThrow(/Unrecognized/);
    expect(() => parseSiebelDateTime("11/5/2025 13:00:00 PM")).toThrow(/Unrecognized/);
    expect(parseSiebelDateTime("2/29/2024 12:00:00 AM").toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });

  test("treats empty values as missing", () => {
    expect(parseSiebelDateTime("")).toBeNull();
    expect(parseSiebelDateTime("   ")).toBeNull();
    expect(parseSiebelDateTime(null)).toBeNull();
  });
});

describe("formatSiebelDateTime", () => {
  test("round-trips a parsed value", () => {
    const parsed = parseSiebelDateTime("11/5/2025 11:41:37 AM");
    expect(formatSiebelDateTime(parsed)).toBe("11/5/2025 11:41:37 AM");
    expect(formatSiebelDateTime(parseSiebelDateTime("11/5/2025 12:05:09 PM"))).toBe(
      "11/5/2025 12:05:09 PM"
    );
  });

  test("rejects an invalid date", () => {
    expect(() => formatSiebelDateTime(new Date("not-a-date"))).toThrow(/invalid date/);
  });
});

describe("isStale", () => {
  test("is true only when Siebel is newer than the index by more than the tolerance", () => {
    expect(isStale("11/10/2026 9:00:00 AM", "11/10/2026 8:00:00 AM", 60)).toBe(true);
    expect(isStale("11/4/2026 3:12:18 PM", "11/4/2026 3:10:00 PM", 60)).toBe(true);
    expect(isStale("11/4/2026 3:12:18 PM", "11/4/2026 3:10:00 PM", 138)).toBe(false);
    expect(isStale("11/4/2026 3:12:18 PM", "11/4/2026 3:10:00 PM", 200)).toBe(false);
    expect(isStale("11/10/2026 8:00:00 AM", "11/10/2026 9:00:00 AM", 0)).toBe(false);
    expect(isStale("11/10/2026 9:00:00 AM", "11/10/2026 9:00:00 AM", 0)).toBe(false);
    expect(isStale(null, "11/10/2026 9:00:00 AM", 0)).toBe(false);
  });

  test("rejects a negative tolerance", () => {
    expect(() => isStale("11/10/2026 9:00:00 AM", "11/10/2026 8:00:00 AM", -1)).toThrow(/Tolerance/);
  });
});
