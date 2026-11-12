export function parseHash(hash) {
  const raw = String(hash || "").replace(/^#/, "");
  const [path, queryString] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const query = Object.fromEntries(new URLSearchParams(queryString || ""));
  if (parts[0] === "history") {
    return { name: "history" };
  }
  if (parts[0] === "runs" && parts[1] && parts[2] === "findings") {
    return { name: "findings", runId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === "runs" && parts[1]) {
    return { name: "summary", runId: decodeURIComponent(parts[1]) };
  }
  if (parts[0] === "compare") {
    return {
      name: "compare",
      baselineId: query.baseline || "",
      currentId: query.current || "",
    };
  }
  return { name: "setup" };
}

export function hashFor(route) {
  if (!route || route.name === "setup") {
    return "#/setup";
  }
  if (route.name === "history") {
    return "#/history";
  }
  if (route.name === "summary" && route.runId) {
    return `#/runs/${encodeURIComponent(route.runId)}`;
  }
  if (route.name === "findings" && route.runId) {
    return `#/runs/${encodeURIComponent(route.runId)}/findings`;
  }
  if (route.name === "compare") {
    const params = new URLSearchParams();
    if (route.baselineId) {
      params.set("baseline", route.baselineId);
    }
    if (route.currentId) {
      params.set("current", route.currentId);
    }
    const query = params.toString();
    return query ? `#/compare?${query}` : "#/compare";
  }
  return "#/setup";
}

export function navigate(hash) {
  const next = hash.startsWith("#") ? hash : `#${hash}`;
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  window.location.hash = next;
}
