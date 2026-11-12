import { labelForCheck, labelForRecordType, labelForStatus } from "../config";

export function RecordTypeBadge({ recordType }) {
  const label = labelForRecordType(recordType);
  const kind = String(recordType || "unknown").toLowerCase();
  return <span className={`bspre-badge bspre-badge-${kind}`}>{label}</span>;
}

export function CheckLabel({ check }) {
  return <span>{labelForCheck(check)}</span>;
}

export function StatusBadge({ status, partial }) {
  return (
    <span className="bspre-status-wrap">
      <span className={`bspre-badge bspre-status-${status}`}>{labelForStatus(status)}</span>
      {partial ? <span className="bspre-badge bspre-badge-partial">Partial</span> : null}
    </span>
  );
}
