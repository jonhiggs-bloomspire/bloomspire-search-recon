import { CHECKS, RECORD_TYPES } from "./config";

const TYPE_ORDER = new Map(RECORD_TYPES.map((type, index) => [type.value, index]));
const CHECK_ORDER = new Map(CHECKS.map((check, index) => [check.value, index]));

export function findingKey(finding) {
  return `${finding.recordType}|${finding.id}|${finding.check}`;
}

export function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const typeDelta = (TYPE_ORDER.get(a.recordType) ?? 99) - (TYPE_ORDER.get(b.recordType) ?? 99);
    if (typeDelta !== 0) {
      return typeDelta;
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
export function compareFindings(baseline, current) {
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
    newFindings: sortFindings(added),
    resolved: sortFindings(resolved),
    stillOpen: sortFindings(stillOpen),
  };
}
