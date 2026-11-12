import { hashFor, navigate, parseHash } from "./router";

test("parses setup, history, summary, findings, and compare hashes", () => {
  expect(parseHash("")).toEqual({ name: "setup" });
  expect(parseHash("#/setup")).toEqual({ name: "setup" });
  expect(parseHash("#/history")).toEqual({ name: "history" });
  expect(parseHash("#/runs/RUN-1042")).toEqual({ name: "summary", runId: "RUN-1042" });
  expect(parseHash("#/runs/RUN-1042/findings")).toEqual({ name: "findings", runId: "RUN-1042" });
  expect(parseHash("#/compare?baseline=RUN-1041&current=RUN-1042")).toEqual({
    name: "compare",
    baselineId: "RUN-1041",
    currentId: "RUN-1042",
  });
  expect(parseHash("#/compare")).toEqual({ name: "compare", baselineId: "", currentId: "" });
});

test("builds hashes and refires navigation when the hash is unchanged", () => {
  expect(hashFor({ name: "findings", runId: "RUN 1" })).toBe("#/runs/RUN%201/findings");
  expect(hashFor({ name: "compare", baselineId: "RUN-1041", currentId: "RUN-1042" })).toBe(
    "#/compare?baseline=RUN-1041&current=RUN-1042"
  );
  window.location.hash = "#/history";
  const listener = jest.fn();
  window.addEventListener("hashchange", listener);
  navigate("#/history");
  expect(listener).toHaveBeenCalled();
  window.removeEventListener("hashchange", listener);
});
