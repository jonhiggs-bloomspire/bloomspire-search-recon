import { searchSpecText } from "../setupRows";

const COLUMNS = [
  ["recordType", "Record type"],
  ["busComp", "Business component"],
  ["busObj", "Business object"],
  ["intObj", "Integration object"],
  ["active", "Active"],
  ["searchSpec", "Search spec"],
  ["chunkSize", "Chunk size"],
  ["pitKeepAlive", "PIT keep alive"],
  ["esTypePath", "ES type path"],
  ["esTypeValue", "ES type value"],
  ["esIdPath", "ES id path"],
  ["esUpdatedPath", "ES updated path"],
  ["siebelNameFields", "Siebel name fields"],
  ["esNamePaths", "ES name paths"],
  ["typeSeq", "Type order"],
];

function cellText(row, key) {
  if (key === "active") {
    return row.active ? "Yes" : "No";
  }
  if (key === "searchSpec") {
    return searchSpecText(row.searchSpec);
  }
  if (row[key] == null || row[key] === "") {
    return "—";
  }
  return String(row[key]);
}

export function RunConfigTable({ runConfig }) {
  const rows = Array.isArray(runConfig) ? runConfig : [];
  return (
    <div className="bspre-scroll">
      <table>
        <caption>Setup used by this run</caption>
        <thead>
          <tr>
            {COLUMNS.map(([key, label]) => (
              <th key={key} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length}>This run has no setup snapshot.</td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.busComp || row.recordType}>
                {COLUMNS.map(([key]) =>
                  key === "recordType" ? (
                    <th key={key} scope="row">
                      {cellText(row, key)}
                    </th>
                  ) : (
                    <td key={key} className={key === "chunkSize" || key === "typeSeq" ? "bspre-num" : undefined}>
                      {cellText(row, key)}
                    </td>
                  )
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
