import { compareFindings, findingKey } from "./compareFindings";

const row = (id, recordType, check, name) => ({
  id,
  recordType,
  check,
  name,
  siebelLastUpdated: null,
  esLastUpdated: null,
});

test("keys a finding by record type, id, and check", () => {
  expect(findingKey(row("1-A", "Opportunity", "stale"))).toBe("Opportunity|1-A|stale");
});

test("splits new, resolved, and still-open findings", () => {
  const baseline = [
    row("1-IND10", "Individual", "siebel_only", "Jordan Hale"),
    row("1-IND11", "Individual", "es_only", "Luis Ortega"),
    row("1-OPP08", "Opportunity", "siebel_only", "Westline renewal"),
  ];
  const current = [
    row("1-IND10", "Individual", "siebel_only", "Jordan Hale"),
    row("1-ENT20", "Entity", "siebel_only", "Lumen Fieldworks"),
    row("1-OPP07", "Opportunity", "stale", "Campus retrofit"),
  ];
  const result = compareFindings(baseline, current);
  expect(result.newFindings.map(findingKey)).toEqual([
    "Entity|1-ENT20|siebel_only",
    "Opportunity|1-OPP07|stale",
  ]);
  expect(result.resolved.map(findingKey)).toEqual([
    "Individual|1-IND11|es_only",
    "Opportunity|1-OPP08|siebel_only",
  ]);
  expect(result.stillOpen.map(findingKey)).toEqual(["Individual|1-IND10|siebel_only"]);
  expect(result.stillOpen[0].name).toBe("Jordan Hale");
});

test("treats the same id under a different check as a different finding", () => {
  const result = compareFindings(
    [row("1-A", "Entity", "stale", "Old")],
    [row("1-A", "Entity", "es_only", "Old")]
  );
  expect(result.newFindings).toHaveLength(1);
  expect(result.resolved).toHaveLength(1);
  expect(result.stillOpen).toHaveLength(0);
});

test("handles empty sets", () => {
  const result = compareFindings(null, []);
  expect(result).toEqual({ newFindings: [], resolved: [], stillOpen: [] });
});
