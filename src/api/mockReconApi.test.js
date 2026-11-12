import { findingKey } from "../compareFindings";
import { parseSiebelDateTime } from "../dates";
import { RUN_IDS } from "./fixtures";
import { createMockReconApi } from "./mockReconApi";

function keys(findings) {
  return findings.map(findingKey);
}

describe("mock recon API", () => {
  test("lists runs newest first and returns one run", async () => {
    const api = createMockReconApi();
    const runs = await api.listRuns();
    expect(runs.map((run) => run.id)).toEqual([
      RUN_IDS.running,
      RUN_IDS.paused,
      RUN_IDS.current,
      RUN_IDS.baseline,
      RUN_IDS.error,
    ]);
    const run = await api.getRun(RUN_IDS.paused);
    expect(run.status).toBe("paused");
    expect(run.partial).toBe(true);
    await expect(api.getRun("RUN-missing")).rejects.toThrow(/Run not found/);
  });

  test("filters, pages, and exports the full filtered set", async () => {
    const api = createMockReconApi();
    const leads = await api.getFindings(RUN_IDS.current, {
      filters: { recordType: "Opportunity" },
      page: { page: 1, pageSize: 10 },
    });
    expect(leads.total).toBe(3);
    expect(leads.findings.every((finding) => finding.recordType === "Opportunity")).toBe(true);

    const byId = await api.getFindings(RUN_IDS.current, {
      filters: { id: "ind10" },
      page: 1,
    });
    expect(byId.total).toBe(1);
    expect(byId.findings[0].id).toBe("1-IND10");

    const page = await api.getFindings(RUN_IDS.current, { page: { page: 1, pageSize: 5 } });
    expect(page.findings).toHaveLength(5);
    expect(page.total).toBe(11);
    const second = await api.getFindings(RUN_IDS.current, { page: { page: 2, pageSize: 5 } });
    expect(second.findings[0].id).toBe("1-ENT03");

    const file = await api.exportCsv(RUN_IDS.current, { filters: { id: "1-IND10" } });
    expect(file.filename).toBe("recon-RUN-1042.csv");
    expect(file.csv).toContain("1-IND10");
    expect(file.csv).not.toContain("1-IND21");
    const all = await api.exportCsv(RUN_IDS.current, {});
    expect(all.csv.split("\r\n")).toHaveLength(12);
  });

  test("compares completed runs and rejects partial or identical runs", async () => {
    const api = createMockReconApi();
    const result = await api.compareRuns(RUN_IDS.baseline, RUN_IDS.current);
    expect(keys(result.newFindings)).toEqual([
      "Individual|1-IND21|siebel_only",
      "Individual|1-IND22|es_only",
      "Individual|1-IND20|stale",
      "Entity|1-ENT20|siebel_only",
      "Entity|1-ENT22|es_only",
      "Entity|1-ENT21|stale",
      "Opportunity|1-OPP20|es_only",
      "Opportunity|1-OPP21|stale",
    ]);
    expect(keys(result.resolved)).toEqual([
      "Individual|1-IND11|es_only",
      "Entity|1-ENT04|stale",
      "Opportunity|1-OPP08|siebel_only",
    ]);
    expect(keys(result.stillOpen)).toEqual([
      "Individual|1-IND10|siebel_only",
      "Entity|1-ENT03|es_only",
      "Opportunity|1-OPP07|stale",
    ]);
    await expect(api.compareRuns(RUN_IDS.paused, RUN_IDS.current)).rejects.toThrow(/Partial/);
    await expect(api.compareRuns(RUN_IDS.current, RUN_IDS.current)).rejects.toThrow(/different/);
  });

  test("starts, pauses, and resumes without sharing state across clients", async () => {
    const api = createMockReconApi();
    const other = createMockReconApi();
    const started = await api.startRun({
      recordTypes: ["Opportunity", "Entity"],
      options: { toleranceSeconds: 15 },
    });
    expect(started.status).toBe("running");
    expect(started.partial).toBe(true);
    expect(started.recordTypes).toEqual(["Entity", "Opportunity"]);
    expect(started.toleranceSeconds).toBe(15);
    expect(parseSiebelDateTime(started.startedAt)).toBeInstanceOf(Date);

    const paused = await api.pauseRun(started.id);
    expect(paused.status).toBe("paused");
    const resumed = await api.resumeRun(started.id);
    expect(resumed.status).toBe("running");
    await expect(api.pauseRun(RUN_IDS.current)).rejects.toThrow(/running/);
    await expect(api.resumeRun(RUN_IDS.running)).rejects.toThrow(/paused/);
    await expect(other.getRun(started.id)).rejects.toThrow(/Run not found/);
    await expect(api.startRun({ recordTypes: [] })).rejects.toThrow(/at least one/);
  });
});
