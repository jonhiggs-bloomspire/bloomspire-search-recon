import { buildCounts, emptyCounts, findingCount, overallCounts } from "./counts";

test("builds population counts from matched rows plus findings", () => {
  const counts = buildCounts(
    ["Individual", "Entity", "Opportunity"],
    [
      { recordType: "Individual", check: "siebel_only" },
      { recordType: "Individual", check: "stale" },
      { recordType: "Opportunity", check: "es_only" },
    ],
    { Individual: 10, Entity: 4, Opportunity: 2 }
  );
  expect(counts.Individual).toEqual({
    siebel: 12,
    es: 11,
    matched: 10,
    siebelOnly: 1,
    esOnly: 0,
    stale: 1,
  });
  expect(counts.Entity.siebel).toBe(4);
  expect(counts.Entity.es).toBe(4);
  expect(counts.Opportunity).toMatchObject({ siebel: 2, es: 3, esOnly: 1 });
  expect(findingCount(counts.Individual)).toBe(2);
  expect(findingCount(null)).toBe(0);
});

test("sums overall counts for the types on the run", () => {
  const run = {
    recordTypes: ["Individual", "Entity"],
    counts: {
      Individual: { ...emptyCounts(), siebel: 2, matched: 1, siebelOnly: 1 },
      Entity: { ...emptyCounts(), siebel: 3, es: 3, matched: 3 },
      Opportunity: { ...emptyCounts(), siebel: 9 },
    },
  };
  expect(overallCounts(run).siebel).toBe(5);
  expect(overallCounts(null).siebel).toBe(0);
});
