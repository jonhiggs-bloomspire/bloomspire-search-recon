# Development

## Scripts

| Script | What it does |
| --- | --- |
| `npm start` | webpack-dev-server, mock client, fake Siebel tab frame |
| `npm test` | Jest once, jsdom, Testing Library |
| `npm run build` | UMD bundle `dist/bspre-recon-bundle.js` |

The dev server listens on port 3000. If that port is taken:

```bash
npm start -- --port 3001
```

Routes in the dev server:

- `#/setup`
- `#/history`
- `#/runs/<id>`
- `#/runs/<id>/findings`
- `#/compare?baseline=<id>&current=<id>`

Seeded mock runs include `RUN-1042` (done), `RUN-1041` (done, for compare), `RUN-1043` (paused), `RUN-1044` (running), and `RUN-1038` (error).

## Configuration

Webpack inlines these at build time with `DefinePlugin`. Read them as `process.env.<NAME>` so the replacement works. Do not commit secret values.

| Variable | Role |
| --- | --- |
| `BSPRE_RECON_API` | `mock` or `siebel`. Dev defaults to mock. Production defaults to siebel. |
| `BSPRE_SIEBEL_BASE_URL` | REST prefix. Default `/siebel/v1.0`. |
| `BSPRE_SIEBEL_APP_BASE` | Optional prefix for View detail links. Empty means `/siebel/app/callcenter/enu`. |
| `BSPRE_SIEBEL_USERNAME` | Basic auth user. Empty sends no Authorization header. |
| `BSPRE_SIEBEL_PASSWORD` | Basic auth secret. Supplied only through the environment. |

To point the dev server at the business service:

```bash
BSPRE_RECON_API=siebel BSPRE_SIEBEL_USERNAME=SADMIN BSPRE_SIEBEL_PASSWORD=<password> npm start
```

`<password>` is a placeholder. The mock client ignores the credentials. `npm start` does not need them.

## Layout

- `BloomspireSearchReconPR.js` is plain ES5 so Siebel can load it without Babel.
- `src/index.js` exports `mount` for the bundle.
- `src/devIndex.js` is the dev entry only. It is not imported by `src/index.js`.
- `src/api/reconApi.js` picks mock or Siebel. Shared validation is in `src/api/contract.js`.
- `src/api/fixtures.js` is synthetic data for the mock.
- `src/styles.css` is scoped to `.bspre-recon-host`. `src/dev/siebelFrame.css` is the dev chrome only.

## Mock behavior

Pause and resume change the in-memory status. They do not move `chunksDone`. `startRun` adds a running partial run with empty counts. Seeded findings were already classified with that run's tolerance. The stale rule itself is `isStale` in `src/dates.js`.

## Out of scope

Do not add record types. Do not add requeue or failure-correlation controls. Do not call Elasticsearch from the browser.
