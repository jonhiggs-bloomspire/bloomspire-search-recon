# Open questions

These need a Siebel-side answer before the business service and the repository objects are built. The UI and the contract in [SIEBEL_SERVICE.md](SIEBEL_SERVICE.md) are the current proposal.

1. **View detail names.** Global Search keeps view and applet names in `SIEBEL_DETAIL_VIEWS`. This repo could not read that file. The helper currently uses Contact Detail View / Contact Form Applet, Account Detail View / Account Form Applet, and Opportunity Detail View / Opportunity Form Applet. Replace those strings if Global Search uses different ones. The URL shape stays `/siebel/app/callcenter/enu?SWECmd=GotoView`.

2. **Property set shape.** The contract puts JSON strings in flat property set fields (`Run`, `Runs`, `Findings`, `Compare`, `Csv`), matching the way Global Search wraps `SearchParams`. Confirm the service will do that rather than child property sets. The client accepts a string or an object.

3. **Name fields.** The finding `name` is optional. The proposal is Contact full name, Account name, and Opportunity name. Confirm the fields the service should read, and leave `name` null when the index orphan has no name.

4. **Chunk size and checkpoint text.** The UI shows `chunksDone`, `chunksTotal`, and `lastCheckpoint` as the service sends them. The sample checkpoint is `Opportunity 1-OPP21`. Confirm the real chunk size and the checkpoint string.

5. **Pause boundary.** The proposal is that pause and resume take effect on the next chunk boundary, not in the middle of a chunk. Confirm that the service can stop there and continue from `lastCheckpoint`.

6. **Authentication.** Global Search inlines Basic credentials at build time. This app does the same, and it omits the Authorization header when `BSPRE_SIEBEL_USERNAME` is empty so an existing Siebel session can be used. Confirm which of those the Administration - Elasticsearch view should use.

7. **Screen sequence.** The Recon screen view must sort before Job Runs and Bulk Jobs. The sequence numbers already stored on those screen views were not available here. Set Recon lower than both when the screen is edited.

8. **Responsibilities.** The view should be added to every responsibility that already shows Job Runs and Bulk Jobs. Confirm that list. Siebel Administrator is the usual first one.

9. **Placeholder business component.** The applet still has to instantiate so Open UI creates `#s_<GetFullId>_div`. The proposal is a small component that returns one row. Confirm which business object and component the other Elasticsearch admin views use, and whether Recon should share them.

10. **Finished but incomplete.** A run is comparable only when `status` is `done` and `partial` is false. If the service can finish early and still mark `done`, it must set `partial` true so the UI refuses compare.

11. **Page size.** The UI asks for 10 rows at a time and exports through `ExportCsv`, not by walking pages. Confirm the maximum `PageSize` and the maximum CSV the service will return.

12. **Tolerance default.** The setup form defaults to 0 seconds, so any later Siebel timestamp is stale. Say if new runs should default to a different tolerance. The value is per run and is stored on the run.
