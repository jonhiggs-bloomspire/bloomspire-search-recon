import { CSV_COLUMNS, csvEscape, findingsToCsv } from "./csv";

test("escapes commas, quotes, and formula characters", () => {
  expect(csvEscape("Harbor & Pine, LLC")).toBe('"Harbor & Pine, LLC"');
  expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  expect(csvEscape("=1+1")).toBe(`"'=1+1"`);
  expect(csvEscape(null)).toBe("");
  expect(csvEscape("Jordan Hale")).toBe("Jordan Hale");
});

test("builds a findings CSV and keeps the Opportunity record type", () => {
  const csv = findingsToCsv([
    {
      id: "1-OPP07",
      recordType: "Opportunity",
      check: "stale",
      siebelLastUpdated: "11/9/2026 8:01:44 AM",
      esLastUpdated: "11/1/2026 8:01:44 AM",
      name: "Campus retrofit",
    },
    {
      id: "1-ENT04",
      recordType: "Entity",
      check: "stale",
      siebelLastUpdated: "11/7/2026 11:41:37 AM",
      esLastUpdated: "11/7/2026 10:41:37 AM",
      name: "Harbor & Pine, LLC",
    },
  ]);
  const [header, first, second] = csv.split("\r\n");
  expect(header).toBe(CSV_COLUMNS.join(","));
  expect(first).toContain("Opportunity");
  expect(first).not.toContain("Lead");
  expect(second).toContain('"Harbor & Pine, LLC"');
});
