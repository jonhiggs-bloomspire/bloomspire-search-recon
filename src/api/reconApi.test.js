import { createReconApi, ReconApiError } from "./reconApi";

test("selects the mock client by default and the Siebel client from config", async () => {
  const mock = createReconApi({ api: "mock" });
  const runs = await mock.listRuns();
  expect(runs.length).toBeGreaterThan(0);

  const fetchImpl = jest.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ Runs: "[]" }),
  }));
  const siebel = createReconApi(
    { api: "siebel", siebelBaseUrl: "/siebel/v1.0", siebelUsername: "", siebelPassword: "" },
    { fetchImpl }
  );
  expect(await siebel.listRuns()).toEqual([]);
  expect(fetchImpl.mock.calls[0][0]).toContain("/service/BSPRE%20Elasticsearch%20Recon/ListRuns");
});

test("rejects an unknown client name", () => {
  expect(() => createReconApi({ api: "direct" })).toThrow(ReconApiError);
});
