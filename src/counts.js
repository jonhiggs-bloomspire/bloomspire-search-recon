import { CHECKS } from "./config";

export const COUNT_KEYS = ["siebel", "es", "matched", "siebelOnly", "esOnly", "stale"];

export function emptyCounts() {
  return {
    siebel: 0,
    es: 0,
    matched: 0,
    siebelOnly: 0,
    esOnly: 0,
    stale: 0,
  };
}

export function buildCounts(recordTypes, findings, matchedByType) {
  const counts = {};
  recordTypes.forEach((type) => {
    const mine = (findings || []).filter((finding) => finding.recordType === type);
    const byCheck = {};
    CHECKS.forEach((check) => {
      byCheck[check.value] = mine.filter((finding) => finding.check === check.value).length;
    });
    const matched = (matchedByType && matchedByType[type]) || 0;
    counts[type] = {
      siebel: matched + byCheck.siebel_only + byCheck.stale,
      es: matched + byCheck.es_only + byCheck.stale,
      matched,
      siebelOnly: byCheck.siebel_only,
      esOnly: byCheck.es_only,
      stale: byCheck.stale,
    };
  });
  return counts;
}

export function overallCounts(run) {
  const totals = emptyCounts();
  const types = (run && run.recordTypes) || [];
  types.forEach((type) => {
    const counts = run.counts && run.counts[type];
    if (!counts) {
      return;
    }
    COUNT_KEYS.forEach((key) => {
      totals[key] += counts[key] || 0;
    });
  });
  return totals;
}

export function findingCount(counts) {
  if (!counts) {
    return 0;
  }
  return (counts.siebelOnly || 0) + (counts.esOnly || 0) + (counts.stale || 0);
}
