import { createSiebelReconApi, SIEBEL_SERVICE_NAME, siebelServiceUrl } from "./siebelReconApi";

function client(payload, status = 200, config = {}) {
  const calls = [];
  const fetchImpl = jest.fn(async (url, options) => {
    calls.push({ url, options });
    if (payload instanceof Error) {
      throw payload;
    }
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => payload,
    };
  });
  const api = createSiebelReconApi(
    {
      siebelBaseUrl: "/siebel/v1.0",
      siebelUsername: "demo-user",
      siebelPassword: "redacted-value",
      ...config,
    },
    { fetchImpl }
  );
  return { api, calls, fetchImpl };
}

function bodyOf(call) {
  return JSON.parse(call.options.body);
}

test("builds a same-origin service URL", () => {
  expect(siebelServiceUrl("/siebel/v1.0/", "ListRuns")).toBe(
    `/siebel/v1.0/service/${encodeURIComponent(SIEBEL_SERVICE_NAME)}/ListRuns`
  );
  expect(siebelServiceUrl("/siebel/v1.0/", "ListRuns")).not.toMatch(/https?:\/\//);
});

test("posts ListRuns with Basic auth and a body wrapper", async () => {
  const { api, calls } = client({ Runs: JSON.stringify([{ id: "RUN-1", errorMessage: "" }]) });
  const runs = await api.listRuns();
  expect(runs[0].errorMessage).toBeNull();
  expect(calls[0].url).toContain("/service/BSPRE%20Elasticsearch%20Recon/ListRuns");
  expect(calls[0].options.method).toBe("POST");
  expect(calls[0].options.credentials).toBe("same-origin");
  expect(bodyOf(calls[0])).toEqual({ body: {} });
  expect(calls[0].options.headers.Authorization).toBe(`Basic ${btoa("demo-user:redacted-value")}`);
  expect(calls[0].url).not.toContain("_search");
});

test("omits Basic auth when no username is configured", async () => {
  const { api, calls } = client({ body: { Runs: [] } }, 200, {
    siebelUsername: "",
    siebelPassword: "",
  });
  expect(await api.listRuns()).toEqual([]);
  expect(calls[0].options.headers.Authorization).toBeUndefined();
});

test("maps start, pause, resume, findings, compare, and export", async () => {
  const run = { id: "RUN-9", errorMessage: null, endedAt: null };
  const responses = [
    { Run: JSON.stringify(run) },
    { Run: run },
    { Run: { ...run, status: "paused" } },
    {
      Findings: JSON.stringify([{ id: "1-IND10", recordType: "Individual", check: "siebel_only" }]),
      Total: "1",
      Page: "1",
      PageSize: "5",
    },
    {
      Compare: JSON.stringify({
        new: [{ id: "1-NEW" }],
        resolved: [{ id: "1-OLD" }],
        stillOpen: [],
      }),
    },
    { Filename: "recon-RUN-9.csv", Csv: "id\r\n1-IND10" },
  ];
  const calls = [];
  const fetchImpl = jest.fn(async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => responses.shift() };
  });
  const api = createSiebelReconApi(
    { siebelBaseUrl: "/siebel/v1.0", siebelUsername: "demo-user", siebelPassword: "redacted-value" },
    { fetchImpl }
  );

  expect((await api.startRun({ recordTypes: ["Opportunity", "Entity"], options: { toleranceSeconds: 5 } })).id).toBe(
    "RUN-9"
  );
  expect(bodyOf(calls[0]).body).toEqual({
    RecordTypes: "Entity,Opportunity",
    ToleranceSeconds: "5",
  });
  await api.getRun("RUN-9");
  expect(bodyOf(calls[1]).body).toEqual({ RunId: "RUN-9" });
  expect((await api.pauseRun("RUN-9")).status).toBe("paused");
  expect(calls[2].url).toContain("/PauseRun");
  const findings = await api.getFindings("RUN-9", {
    filters: { recordType: "Individual", check: "siebel_only", id: "IND" },
    page: { page: 1, pageSize: 5 },
  });
  expect(findings.total).toBe(1);
  expect(bodyOf(calls[3]).body).toEqual({
    RunId: "RUN-9",
    RecordType: "Individual",
    Check: "siebel_only",
    IdQuery: "IND",
    Page: "1",
    PageSize: "5",
  });
  const compared = await api.compareRuns("RUN-1", "RUN-9");
  expect(compared.newFindings[0].id).toBe("1-NEW");
  expect(compared.resolved[0].id).toBe("1-OLD");
  expect(bodyOf(calls[4]).body).toEqual({ BaselineId: "RUN-1", CurrentId: "RUN-9" });
  const file = await api.exportCsv("RUN-9", { filters: { id: "1-IND10" } });
  expect(file).toEqual({ filename: "recon-RUN-9.csv", csv: "id\r\n1-IND10" });
  expect(calls.every((call) => call.url.includes("/service/") && !call.url.includes(":9200"))).toBe(true);
});

test("surfaces HTTP failures and Siebel ERROR text", async () => {
  const failed = client({}, 503);
  await expect(failed.api.getRun("RUN-1")).rejects.toThrow(/GetRun failed \(503\)/);
  const errored = client({ ERROR: "The run is locked." });
  await expect(errored.api.resumeRun("RUN-1")).rejects.toThrow("The run is locked.");
  const dropped = client(new Error("socket closed"));
  await expect(dropped.api.listRuns()).rejects.toThrow(/could not be reached/);
});
