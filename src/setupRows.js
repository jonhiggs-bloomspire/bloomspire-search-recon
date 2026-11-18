export function presentSetupRow(row) {
  const source = row && typeof row === "object" ? row : {};
  const chunk = source.chunkSize == null || source.chunkSize === "" ? 500 : Number(source.chunkSize);
  const typeSeq = source.typeSeq == null || source.typeSeq === "" ? 0 : Number(source.typeSeq);
  return {
    recordType: source.recordType == null ? "" : String(source.recordType),
    busComp: source.busComp == null ? "" : String(source.busComp),
    busObj: source.busObj == null ? "" : String(source.busObj),
    intObj: source.intObj == null ? "" : String(source.intObj),
    active: source.active !== false && source.active !== "false" && source.active !== "N",
    searchSpec: source.searchSpec == null ? "" : String(source.searchSpec),
    chunkSize: Number.isFinite(chunk) ? chunk : source.chunkSize,
    pitKeepAlive: source.pitKeepAlive ? String(source.pitKeepAlive) : "10m",
    esTypePath: source.esTypePath == null ? "" : String(source.esTypePath),
    esTypeValue: source.esTypeValue == null ? "" : String(source.esTypeValue),
    esIdPath: source.esIdPath ? String(source.esIdPath) : "_id",
    esUpdatedPath: source.esUpdatedPath == null ? "" : String(source.esUpdatedPath),
    siebelNameFields: source.siebelNameFields == null ? "" : String(source.siebelNameFields),
    esNamePaths: source.esNamePaths == null ? "" : String(source.esNamePaths),
    typeSeq: Number.isFinite(typeSeq) ? typeSeq : 0,
  };
}

export function sortSetups(rows) {
  return [...(rows || [])].sort((a, b) => {
    const seq = (Number(a.typeSeq) || 0) - (Number(b.typeSeq) || 0);
    if (seq !== 0) {
      return seq;
    }
    return String(a.busComp || "").localeCompare(String(b.busComp || ""));
  });
}

export function presentSetups(rows) {
  return sortSetups((rows || []).map(presentSetupRow));
}

export function recordTypesFromRun(run) {
  const configs = Array.isArray(run && run.runConfig) ? run.runConfig : [];
  const types = [];
  sortSetups(configs).forEach((row) => {
    if (row.recordType && !types.includes(row.recordType)) {
      types.push(row.recordType);
    }
  });
  const listed = run && Array.isArray(run.recordTypes) ? run.recordTypes : [];
  listed.forEach((type) => {
    if (type && !types.includes(type)) {
      types.push(type);
    }
  });
  return types;
}

export function recordTypesFromRuns(runs) {
  const seq = new Map();
  (runs || []).forEach((run) => {
    const configs = Array.isArray(run.runConfig) ? run.runConfig : [];
    recordTypesFromRun(run).forEach((type, index) => {
      if (seq.has(type)) {
        return;
      }
      const row = configs.find((item) => item.recordType === type);
      const order = row && row.typeSeq != null && row.typeSeq !== "" ? Number(row.typeSeq) : 1000 + index;
      seq.set(type, Number.isFinite(order) ? order : 1000 + index);
    });
  });
  return [...seq.entries()]
    .sort((a, b) => a[1] - b[1] || String(a[0]).localeCompare(String(b[0])))
    .map(([type]) => type);
}

export function searchSpecText(value) {
  if (value == null || String(value).trim() === "") {
    return "All records";
  }
  return String(value);
}

export function emptySetupDraft() {
  return {
    recordType: "",
    busComp: "",
    busObj: "",
    intObj: "",
    active: true,
    searchSpec: "",
    chunkSize: "500",
    pitKeepAlive: "10m",
    esTypePath: "",
    esTypeValue: "",
    esIdPath: "_id",
    esUpdatedPath: "",
    siebelNameFields: "",
    esNamePaths: "",
    typeSeq: "0",
  };
}

export function draftFromSetup(row) {
  const presented = presentSetupRow(row);
  return {
    ...presented,
    chunkSize: String(presented.chunkSize),
    typeSeq: String(presented.typeSeq),
  };
}
