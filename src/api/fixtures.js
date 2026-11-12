import { buildCounts } from "../counts";

export const RUN_IDS = {
  running: "RUN-1044",
  paused: "RUN-1043",
  current: "RUN-1042",
  baseline: "RUN-1041",
  error: "RUN-1038",
};

const ALL_TYPES = ["Individual", "Entity", "Opportunity"];

function finding(fields) {
  return {
    siebelLastUpdated: null,
    esLastUpdated: null,
    name: null,
    ...fields,
  };
}

function makeRun({
  id,
  status,
  partial,
  startedAt,
  endedAt,
  startedBy,
  toleranceSeconds,
  chunksDone,
  chunksTotal,
  lastCheckpoint,
  errorMessage,
  findings,
  matchedByType,
  recordTypes = ALL_TYPES,
}) {
  return {
    run: {
      id,
      status,
      partial,
      startedAt,
      endedAt,
      startedBy,
      recordTypes,
      toleranceSeconds,
      chunksDone,
      chunksTotal,
      lastCheckpoint,
      errorMessage: errorMessage || null,
      counts: buildCounts(recordTypes, findings, matchedByType),
    },
    findings,
  };
}

const baselineFindings = [
  finding({
    id: "1-IND10",
    recordType: "Individual",
    check: "siebel_only",
    siebelLastUpdated: "11/5/2025 11:41:37 AM",
    name: "Jordan Hale",
  }),
  finding({
    id: "1-IND11",
    recordType: "Individual",
    check: "es_only",
    esLastUpdated: "11/2/2026 6:12:40 PM",
    name: "Luis Ortega",
  }),
  finding({
    id: "1-ENT03",
    recordType: "Entity",
    check: "es_only",
    esLastUpdated: "10/2/2026 4:18:05 PM",
    name: "Northwind Atelier",
  }),
  finding({
    id: "1-ENT04",
    recordType: "Entity",
    check: "stale",
    siebelLastUpdated: "11/7/2026 11:41:37 AM",
    esLastUpdated: "11/7/2026 10:41:37 AM",
    name: "Harbor & Pine, LLC",
  }),
  finding({
    id: "1-OPP07",
    recordType: "Opportunity",
    check: "stale",
    siebelLastUpdated: "11/9/2026 8:01:44 AM",
    esLastUpdated: "11/1/2026 8:01:44 AM",
    name: "Campus retrofit",
  }),
  finding({
    id: "1-OPP08",
    recordType: "Opportunity",
    check: "siebel_only",
    siebelLastUpdated: "11/8/2026 1:11:02 PM",
    name: "Westline renewal",
  }),
];

const currentFindings = [
  finding({
    id: "1-IND10",
    recordType: "Individual",
    check: "siebel_only",
    siebelLastUpdated: "11/5/2025 11:41:37 AM",
    name: "Jordan Hale",
  }),
  finding({
    id: "1-IND21",
    recordType: "Individual",
    check: "siebel_only",
    siebelLastUpdated: "11/10/2026 8:14:22 AM",
    name: "Elena Voss",
  }),
  finding({
    id: "1-IND22",
    recordType: "Individual",
    check: "es_only",
    esLastUpdated: "9/14/2026 2:03:11 PM",
    name: "Samir Adeyemi",
  }),
  finding({
    id: "1-IND20",
    recordType: "Individual",
    check: "stale",
    siebelLastUpdated: "11/10/2026 9:00:00 AM",
    esLastUpdated: "11/10/2026 8:00:00 AM",
    name: "Priya Nair",
  }),
  finding({
    id: "1-ENT20",
    recordType: "Entity",
    check: "siebel_only",
    siebelLastUpdated: "11/9/2026 3:40:18 PM",
    name: "Lumen Fieldworks",
  }),
  finding({
    id: "1-ENT03",
    recordType: "Entity",
    check: "es_only",
    esLastUpdated: "10/2/2026 4:18:05 PM",
    name: "Northwind Atelier",
  }),
  finding({
    id: "1-ENT22",
    recordType: "Entity",
    check: "es_only",
    esLastUpdated: "8/19/2026 11:05:44 AM",
    name: null,
  }),
  finding({
    id: "1-ENT21",
    recordType: "Entity",
    check: "stale",
    siebelLastUpdated: "11/4/2026 3:12:18 PM",
    esLastUpdated: "11/4/2026 3:10:00 PM",
    name: "Cedar Mutual",
  }),
  finding({
    id: "1-OPP20",
    recordType: "Opportunity",
    check: "es_only",
    esLastUpdated: "10/30/2026 9:44:27 AM",
    name: "Harbor expansion",
  }),
  finding({
    id: "1-OPP07",
    recordType: "Opportunity",
    check: "stale",
    siebelLastUpdated: "11/9/2026 8:01:44 AM",
    esLastUpdated: "11/1/2026 8:01:44 AM",
    name: "Campus retrofit",
  }),
  finding({
    id: "1-OPP21",
    recordType: "Opportunity",
    check: "stale",
    siebelLastUpdated: "10/28/2026 1:15:00 PM",
    esLastUpdated: "10/20/2026 1:15:00 PM",
    name: "Field kit renewal",
  }),
];

const pausedFindings = [
  finding({
    id: "1-IND30",
    recordType: "Individual",
    check: "siebel_only",
    siebelLastUpdated: "11/11/2026 2:02:17 PM",
    name: "Nora Bennett",
  }),
  finding({
    id: "1-ENT30",
    recordType: "Entity",
    check: "stale",
    siebelLastUpdated: "11/11/2026 4:00:00 PM",
    esLastUpdated: "11/11/2026 1:00:00 PM",
    name: "Kindred Loft",
  }),
];

const runningFindings = [
  finding({
    id: "1-OPP40",
    recordType: "Opportunity",
    check: "siebel_only",
    siebelLastUpdated: "11/12/2026 7:55:03 AM",
    name: "River clinic",
  }),
];

const errorFindings = [
  finding({
    id: "1-IND50",
    recordType: "Individual",
    check: "es_only",
    esLastUpdated: "11/6/2026 9:14:52 AM",
    name: null,
  }),
];

const seeded = [
  makeRun({
    id: RUN_IDS.running,
    status: "running",
    partial: true,
    startedAt: "11/12/2026 8:02:14 AM",
    endedAt: null,
    startedBy: "A. Okonkwo",
    toleranceSeconds: 0,
    chunksDone: 3,
    chunksTotal: 24,
    lastCheckpoint: "Individual 1-IND44",
    findings: runningFindings,
    matchedByType: { Individual: 18, Entity: 0, Opportunity: 4 },
  }),
  makeRun({
    id: RUN_IDS.paused,
    status: "paused",
    partial: true,
    startedAt: "11/11/2026 4:18:41 PM",
    endedAt: null,
    startedBy: "M. Patel",
    toleranceSeconds: 120,
    chunksDone: 9,
    chunksTotal: 24,
    lastCheckpoint: "Entity 1-ENT30",
    findings: pausedFindings,
    matchedByType: { Individual: 40, Entity: 22, Opportunity: 15 },
  }),
  makeRun({
    id: RUN_IDS.current,
    status: "done",
    partial: false,
    startedAt: "11/10/2026 9:15:00 AM",
    endedAt: "11/10/2026 9:41:12 AM",
    startedBy: "A. Okonkwo",
    toleranceSeconds: 60,
    chunksDone: 24,
    chunksTotal: 24,
    lastCheckpoint: "Opportunity 1-OPP21",
    findings: currentFindings,
    matchedByType: { Individual: 128, Entity: 86, Opportunity: 41 },
  }),
  makeRun({
    id: RUN_IDS.baseline,
    status: "done",
    partial: false,
    startedAt: "11/8/2026 2:05:33 PM",
    endedAt: "11/8/2026 2:28:50 PM",
    startedBy: "M. Patel",
    toleranceSeconds: 60,
    chunksDone: 24,
    chunksTotal: 24,
    lastCheckpoint: "Opportunity 1-OPP08",
    findings: baselineFindings,
    matchedByType: { Individual: 120, Entity: 80, Opportunity: 36 },
  }),
  makeRun({
    id: RUN_IDS.error,
    status: "error",
    partial: true,
    startedAt: "11/6/2026 10:22:09 AM",
    endedAt: "11/6/2026 10:31:44 AM",
    startedBy: "R. Singh",
    toleranceSeconds: 60,
    chunksDone: 5,
    chunksTotal: 24,
    lastCheckpoint: "Individual 1-IND50",
    errorMessage: "The checkpoint could not be saved after chunk 5.",
    findings: errorFindings,
    matchedByType: { Individual: 11, Entity: 4, Opportunity: 0 },
  }),
];

export function createSeedState() {
  return JSON.parse(
    JSON.stringify({
      runs: seeded.map((entry) => entry.run),
      findings: Object.fromEntries(seeded.map((entry) => [entry.run.id, entry.findings])),
    })
  );
}
