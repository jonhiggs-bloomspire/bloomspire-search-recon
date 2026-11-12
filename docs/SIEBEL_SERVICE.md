# BSPRE Elasticsearch Recon

Proposed Siebel business service. The React app is already written against this contract. The service does not exist yet.

The browser calls Siebel REST only. It does not call Elasticsearch.

- Service: `BSPRE Elasticsearch Recon`
- URL: `/siebel/v1.0/service/BSPRE%20Elasticsearch%20Recon/<Method>`
- Verb: `POST`
- Header: `Content-Type: application/json`
- Header: `Authorization: Basic ...` when the bundle was built with `BSPRE_SIEBEL_USERNAME`
- Credentials: `same-origin`
- Body: `{"body": { ...property set fields... }}`

Property set fields are strings. Lists and records travel as JSON strings. The client also accepts an already-parsed object, and a response wrapped once in `body`, so a prototype can return either shape. Set the property `ERROR` to a short message to fail the call without an HTTP error.

Dates use Siebel clock time: `M/D/YYYY h:mm:ss AM/PM`, for example `11/5/2025 11:41:37 AM`. Do not send ISO-8601. There is no zone offset. Compare the clock times as-is. Siebel and the index must use the same time zone.

## Index shape the service reads

Alias: `bloomspire`.

```json
{
  "record_type": "Opportunity",
  "opportunity": {
    "id": "1-OPP07",
    "last_updated": "11/1/2026 8:01:44 AM"
  }
}
```

`record_type` is `Individual`, `Entity`, or `Opportunity`. The nested object for that type has `id` and `last_updated`. `id` is the Siebel ROW_ID and the Elasticsearch `_id`. The UI label for Opportunity is Lead. The service and the CSV keep `Opportunity`.

## Check rules

For each selected record type:

- In Siebel, not in the index: `siebel_only`. Set `siebelLastUpdated`. `esLastUpdated` is null.
- In the index, not in Siebel: `es_only`. Set `esLastUpdated`. `siebelLastUpdated` is null.
- In both, and Siebel's last updated time is newer than the index `last_updated` by more than `ToleranceSeconds`: `stale`. Set both timestamps.
- In both, and within the tolerance: matched. Count it. Do not return it as a finding.

`ToleranceSeconds` is a whole number, zero or more. Zero means any later Siebel time is stale.

Name is included when the service knows it. Proposed Siebel sources: Contact full name, Account name, and Opportunity name. Return null when it is not known.

## Run object

JSON stored in the `Run` property.

```json
{
  "id": "RUN-1042",
  "status": "done",
  "partial": false,
  "startedAt": "11/10/2026 9:15:00 AM",
  "endedAt": "11/10/2026 9:41:12 AM",
  "startedBy": "A. Okonkwo",
  "recordTypes": ["Individual", "Entity", "Opportunity"],
  "toleranceSeconds": 60,
  "chunksDone": 24,
  "chunksTotal": 24,
  "lastCheckpoint": "Opportunity 1-OPP21",
  "errorMessage": null,
  "counts": {
    "Individual": {
      "siebel": 131,
      "es": 130,
      "matched": 128,
      "siebelOnly": 2,
      "esOnly": 1,
      "stale": 1
    }
  }
}
```

`status` is `running`, `paused`, `done`, or `error`. `partial` is true until every chunk has finished. An error run stays partial. `endedAt` is null while the run is running or paused. `lastCheckpoint` is plain text the UI can show, proposed as `<record type> <ROW_ID>`. `counts` includes only the selected record types. Counts must match the finding rows: Siebel count = matched + siebelOnly + stale, and ES count = matched + esOnly + stale.

Chunking is part of the service. After each chunk, update `chunksDone`, `chunksTotal`, and `lastCheckpoint`. Pause takes effect on the next chunk boundary: set `status` to `paused` and leave `partial` true. Resume continues from the checkpoint and sets `status` back to `running`. A failed chunk sets `status` to `error`, `partial` true, `errorMessage`, and `endedAt`. The UI does not requeue.

## Finding object

```json
{
  "id": "1-IND10",
  "recordType": "Individual",
  "check": "siebel_only",
  "siebelLastUpdated": "11/5/2025 11:41:37 AM",
  "esLastUpdated": null,
  "name": "Jordan Hale"
}
```

`check` is `siebel_only`, `es_only`, or `stale`.

## Methods

### ListRuns

Input body: `{}`

Output: `Runs` = JSON array of run objects, newest `startedAt` first.

### GetRun

Input: `RunId`

Output: `Run` = JSON run object.

### StartRun

Input:

- `RecordTypes`: comma-separated values in the set Individual, Entity, Opportunity. Example: `Entity,Opportunity`
- `ToleranceSeconds`: whole number as a string, for example `60`

Output: `Run` for the new running, partial run.

### PauseRun

Input: `RunId`

Output: `Run` with `status` `paused`. Reject a run that is not running.

### ResumeRun

Input: `RunId`

Output: `Run` with `status` `running`. Reject a run that is not paused.

### GetFindings

Input:

- `RunId`
- `RecordType`: empty for all, or one of the three values
- `Check`: empty for all, or `siebel_only`, `es_only`, `stale`
- `IdQuery`: case-insensitive substring of the row id, or empty
- `Page`: 1-based page number as a string
- `PageSize`: page size as a string

Output:

- `Findings`: JSON array for that page
- `Total`: count of filtered rows, as a string
- `Page`
- `PageSize`

Stable order: record type (Individual, Entity, Opportunity), then check (siebel_only, es_only, stale), then id.

### CompareRuns

Input: `BaselineId`, `CurrentId`

Both runs must be `done` and not `partial`, and the ids must differ. Otherwise set `ERROR`.

Output: `Compare` = JSON object:

```json
{
  "new": [],
  "resolved": [],
  "stillOpen": []
}
```

The key is `recordType + id + check`. `new` is only in the current run. `resolved` is only in the baseline. `stillOpen` is in both; return the current finding. The UI maps `new` to its new-findings list.

### ExportCsv

Input: `RunId`, `RecordType`, `Check`, `IdQuery` using the same filter rules as GetFindings. There is no page. Return every matching row.

Output:

- `Filename`: for example `recon-RUN-1042.csv`
- `Csv`: the file text

Header:

```text
id,record_type,check,siebel_last_updated,es_last_updated,name
```

`record_type` is the stored value (`Opportunity`, not Lead). Quote fields that contain commas or quotes. The UI can also build this CSV from finding rows when it is using the mock.

## Errors

Use HTTP 4xx or 5xx for transport failures, or `ERROR` on a 200 response for a rule failure such as "Partial runs cannot be compared." Do not put credentials in the error text.
