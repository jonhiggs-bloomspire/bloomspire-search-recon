import { readConfig } from "../config";
import { ReconApiError } from "./contract";
import { createMockReconApi } from "./mockReconApi";
import { createSiebelReconApi } from "./siebelReconApi";

/**
 * Recon API used by the UI. Implementations talk to in-memory fixtures
 * or to the Siebel business service. They do not call Elasticsearch.
 *
 * listRuns()
 * getRun(runId)
 * startRun({ recordTypes, options })
 * pauseRun(runId)
 * resumeRun(runId)
 * getFindings(runId, { filters, page })
 * compareRuns(baselineId, currentId)
 * exportCsv(runId, { filters })
 */

export { ReconApiError } from "./contract";

export function createReconApi(config = readConfig(), deps = {}) {
  if (config.api === "siebel") {
    return createSiebelReconApi(config, deps);
  }
  if (config.api === "mock" || config.api == null || config.api === "") {
    return createMockReconApi();
  }
  throw new ReconApiError(`Unknown recon API "${config.api}". Use mock or siebel.`);
}
