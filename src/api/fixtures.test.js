import { CHECKS } from "../config";
import { isStale, parseSiebelDateTime } from "../dates";
import { buildCounts } from "../counts";
import { RUN_IDS, createSeedState } from "./fixtures";

const CHECK_VALUES = CHECKS.map((check) => check.value);

test("seeded runs use the three record types and parseable Siebel timestamps", () => {
  const state = createSeedState();
  expect(Object.values(RUN_IDS)).toEqual(expect.arrayContaining(state.runs.map((run) => run.id)));
  state.runs.forEach((run) => {
    expect(["running", "paused", "done", "error"]).toContain(run.status);
    expect(run.partial).toBe(run.status !== "done");
    expect(run.runConfig.map((row) => row.recordType)).toEqual(expect.arrayContaining(run.recordTypes));
    expect(run.runConfig.every((row) => row.busComp && row.chunkSize && row.pitKeepAlive)).toBe(true);
    expect(parseSiebelDateTime(run.startedAt)).not.toBeNull();
    if (run.endedAt) {
      expect(parseSiebelDateTime(run.endedAt)).not.toBeNull();
    }
    const findings = state.findings[run.id];
    expect(run.counts).toEqual(
      buildCounts(
        run.recordTypes,
        findings,
        Object.fromEntries(
          run.recordTypes.map((type) => [type, run.counts[type].matched])
        )
      )
    );
    findings.forEach((finding) => {
      expect(run.recordTypes).toContain(finding.recordType);
      expect(CHECK_VALUES).toContain(finding.check);
      if (finding.siebelLastUpdated) {
        expect(parseSiebelDateTime(finding.siebelLastUpdated)).not.toBeNull();
      }
      if (finding.esLastUpdated) {
        expect(parseSiebelDateTime(finding.esLastUpdated)).not.toBeNull();
      }
      if (finding.check === "stale") {
        expect(isStale(finding.siebelLastUpdated, finding.esLastUpdated, run.toleranceSeconds)).toBe(
          true
        );
      }
    });
  });
  const current = state.findings[RUN_IDS.current];
  expect(current.some((finding) => finding.siebelLastUpdated === "11/5/2025 11:41:37 AM")).toBe(true);
  const currentRun = state.runs.find((run) => run.id === RUN_IDS.current);
  expect(currentRun.runConfig.find((row) => row.busComp === "Contact")).toMatchObject({
    searchSpec: '[Last Name] = "Hale"',
    chunkSize: 250,
    pitKeepAlive: "5m",
  });
  expect(state.setupSource).toBe("seed");
  expect(state.setups.map((row) => row.busComp)).toEqual(["Contact", "Account", "Opportunity"]);
});

test("seed copies do not share nested state", () => {
  const first = createSeedState();
  const second = createSeedState();
  first.runs[0].status = "done";
  first.findings[RUN_IDS.current][0].name = "Changed";
  expect(second.runs[0].status).not.toBe("done");
  expect(second.findings[RUN_IDS.current][0].name).not.toBe("Changed");
});
