import { CHECKS } from "./config";

const CHECK_ORDER = new Map(CHECKS.map((check, index) => [check.value, index]));

export function findingKey(finding) {
  return `${finding.recordType}|${finding.id}|${finding.check}`;
}

export function sortFindings(findings, typeOrder) {
  const order = new Map((typeOrder || []).map((type, index) => [type, index]));
  return [...(findings || [])].sort((a, b) => {
    const aKnown = order.has(a.recordType);
    const bKnown = order.has(b.recordType);
    const aRank = aKnown ? order.get(a.recordType) : 1000;
    const bRank = bKnown ? order.get(b.recordType) : 1000;
    if (aRank !== bRank) {
      return aRank - bRank;
    }
    if (!aKnown && !bKnown && a.recordType !== b.recordType) {
      return String(a.recordType).localeCompare(String(b.recordType));
    }
    const checkDelta = (CHECK_ORDER.get(a.check) ?? 99) - (CHECK_ORDER.get(b.check) ?? 99);
    if (checkDelta !== 0) {
      return checkDelta;
    }
    return String(a.id).localeCompare(String(b.id));
  });
}

/**
 * Compare two finding sets. The key is record type + id + check.
 * New rows are only in current. Resolved rows are only in baseline.
 * Still-open rows are in both. The current row is kept for still-open and new.
 */
export function compareFindings(baseline, current, typeOrder) {
  const baseMap = new Map();
  const currentMap = new Map();
  (baseline || []).forEach((finding) => {
    baseMap.set(findingKey(finding), finding);
  });
  (current || []).forEach((finding) => {
    currentMap.set(findingKey(finding), finding);
  });

  const added = [];
  const stillOpen = [];
  currentMap.forEach((finding, key) => {
    if (baseMap.has(key)) {
      stillOpen.push(finding);
    } else {
      added.push(finding);
    }
  });
  const resolved = [];
  baseMap.forEach((finding, key) => {
    if (!currentMap.has(key)) {
      resolved.push(finding);
    }
  });

  return {
    newFindings: sortFindings(added, typeOrder),
    resolved: sortFindings(resolved, typeOrder),
    stillOpen: sortFindings(stillOpen, typeOrder),
  };
}
