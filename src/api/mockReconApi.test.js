import { findingKey } from "../compareFindings";
import { parseSiebelDateTime } from "../dates";
import { RUN_IDS, createSeedState } from "./fixtures";
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

  test("starts from the active setup, pauses, and resumes without sharing state", async () => {
    const api = createMockReconApi();
    await expect(api.startRun({ options: { toleranceSeconds: 15 } })).rejects.toThrow(/running or paused/);

    const state = createSeedState();
    state.runs.forEach((run) => {
      if (run.status === "running" || run.status === "paused") {
        run.status = "done";
        run.partial = false;
        run.endedAt = run.startedAt;
      }
    });
    const open = createMockReconApi(state);
    const other = createMockReconApi();
    const started = await open.startRun({
      recordTypes: ["Opportunity", "Entity"],
      options: { toleranceSeconds: 15 },
      setup: [{ busComp: "Account", chunkSize: 3, pitKeepAlive: "5m", searchSpec: '[Name] = "North"' }],
    });
    expect(started.status).toBe("running");
    expect(started.partial).toBe(true);
    expect(started.recordTypes).toEqual(["Entity", "Opportunity"]);
    expect(started.toleranceSeconds).toBe(15);
    expect(started.runConfig.map((row) => row.busComp)).toEqual(["Account", "Opportunity"]);
    expect(started.runConfig[0]).toMatchObject({
      chunkSize: 3,
      pitKeepAlive: "5m",
      searchSpec: '[Name] = "North"',
    });
    expect(parseSiebelDateTime(started.startedAt)).toBeInstanceOf(Date);

    const paused = await open.pauseRun(started.id);
    expect(paused.status).toBe("paused");
    const resumed = await open.resumeRun(started.id);
    expect(resumed.status).toBe("running");
    await expect(open.pauseRun(RUN_IDS.current)).rejects.toThrow(/running/);
    await expect(open.resumeRun(RUN_IDS.running)).rejects.toThrow(/paused/);
    await expect(other.getRun(started.id)).rejects.toThrow(/Run not found/);
    await expect(createMockReconApi(state).startRun({ recordTypes: ["Missing"] })).rejects.toThrow(
      /Unknown record type: Missing/
    );
  });

  test("lists seed setup, saves rows, and deactivates instead of deleting", async () => {
    const api = createMockReconApi();
    const seeded = await api.getSetup();
    expect(seeded.source).toBe("seed");
    expect(seeded.setups).toHaveLength(3);

    const saved = await api.saveSetup([
      {
        busComp: "Contact",
        searchSpec: '[Last Name] = "Doe"',
        chunkSize: 25,
      },
    ]);
    expect(saved.source).toBe("table");
    expect(saved.setups).toHaveLength(1);
    expect(saved.setups[0]).toMatchObject({
      recordType: "Individual",
      busComp: "Contact",
      searchSpec: '[Last Name] = "Doe"',
      chunkSize: 25,
      esUpdatedPath: "individual.last_updated",
    });

    const inactive = await api.saveSetup([{ busComp: "Contact", active: false }]);
    expect(inactive.setups[0].active).toBe(false);
    expect(await api.getSetup()).toEqual(inactive);

    const state = (await import("./fixtures")).createSeedState();
    state.runs.forEach((run) => {
      if (run.status === "running" || run.status === "paused") {
        run.status = "done";
        run.partial = false;
      }
    });
    state.setups = inactive.setups.map((row) => ({ ...row, searchSpec: row.searchSpec || null }));
    state.setupSource = "table";
    state.setups[0].active = false;
    const idle = createMockReconApi(state);
    const started = await idle.startRun({});
    expect(started.recordTypes).toEqual(["Individual", "Entity", "Opportunity"]);
    expect(started.runConfig.every((row) => row.active)).toBe(true);

    await expect(api.saveSetup([{ chunkSize: 10 }])).rejects.toThrow(/busComp/);
    await expect(api.saveSetup([{ busComp: "Contact", chunkSize: 9000 }])).rejects.toThrow(/1 to 5000/);
    await expect(
      api.saveSetup([
        { busComp: "Contact", pitKeepAlive: "10m" },
        { busComp: "Contact", pitKeepAlive: "1h" },
      ])
    ).rejects.toThrow(/duplicate busComp: Contact/);
  });
});
