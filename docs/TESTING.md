# Testing

```bash
npm test
```

Jest runs every `*.test.js` file in jsdom with Babel and Testing Library. `npm test` is not a watch. CI (`.github/workflows/ci.yml`) runs `npm ci`, `npm test`, and `npm run build` on Node 22.

## What is covered

- Siebel datetime parsing and formatting, including `11/5/2025 11:41:37 AM`, noon, midnight, and invalid calendar dates. ISO strings are rejected.
- Stale tolerance: Siebel newer than the index by more than the tolerance, including a boundary equal to the gap.
- Mock client: list order, filters, paging, CSV export of the full filter, compare keys, partial and identical compare refusals, pause and resume, and isolated client state.
- Compare rule: new, resolved, and still open, keyed by record type, id, and check. A different check on the same id is a different finding.
- CSV builder: commas, quotes, empty cells, and a leading formula character. `record_type` stays `Opportunity`.
- Siebel client: service URL, `{"body": ...}` wrapper, Basic header only when a username is set, method property sets, compare `new` mapping, HTTP errors, and the `ERROR` property. URLs stay on the Siebel REST path.
- Physical renderer: one host inserted after `#s_<GetFullId>_div`, applet hidden, ShowUI and BindData refresh reuse that host, EndLife unmounts and restores the applet display, stale host replacement, script reload when `mount` is missing, window `BloomspireSearchRecon.mount`, and a load that finishes after EndLife.
- Screens with the mock: setup, history, completed summary, paused summary with progress and resume, findings filters and paging, View detail links, CSV export, and compare.
- CSS selectors in `src/styles.css` include `.bspre-recon-host`. The production entry does not import the dev frame stylesheet.

## Renderer tests

`src/pr/BloomspireSearchReconPR.test.js` loads the root renderer with stubbed `SiebelAppFacade`, `SiebelJS.Extend`, and `define`. That is the same approach as the Global Search renderer tests: the AMD factory is captured and called with a fake bundle module. The applet node is `#s_<GetFullId>_div`.

## Running one file

```bash
npx jest src/dates.test.js --watchAll=false
```
