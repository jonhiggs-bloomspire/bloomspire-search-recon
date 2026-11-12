# Bloomspire Search Recon

React admin view for Siebel Open UI. It reconciles Siebel, the system of record, with the Bloomspire search index. The screen is **Administration - Elasticsearch**. Recon is the first view tab, before Job Runs and Bulk Jobs. It renders inside that tab and does not take over the Siebel screen.

The browser never calls Elasticsearch. It calls the Siebel business service `BSPRE Elasticsearch Recon` over Siebel REST. Local development uses an in-memory mock.

Record types are Individual, Entity, and Opportunity. The screen labels Opportunity as **Lead**. The stored `record_type` stays `Opportunity`.

## Quick start

Node.js 22 or newer.

```bash
npm install
npm start
```

Open the dev server (port 3000). It uses the mock client and shows a MOCK DATA tag. It does not call Siebel.

```bash
npm test
npm run build
```

`npm run build` writes `dist/bspre-recon-bundle.js`. Production defaults to the Siebel client. Dev defaults to the mock. Set `BSPRE_RECON_API=mock` to build a bundle that still uses the mock.

## Build and deploy

The Siebel server needs two files in the custom scripts folder `scripts/siebel/custom/`:

- `BloomspireSearchReconPR.js`
- `dist/bspre-recon-bundle.js`

Build credentials are read from the environment. Nothing is hardcoded. Do not commit them.

```bash
BSPRE_SIEBEL_USERNAME=SADMIN BSPRE_SIEBEL_PASSWORD=<password> npm run build
scp BloomspireSearchReconPR.js dist/bspre-recon-bundle.js <user>@<server>:<siebel-root>/scripts/siebel/custom/
```

`<password>`, `<user>`, `<server>`, and `<siebel-root>` are placeholders. Leave `BSPRE_SIEBEL_APP_BASE` unset so View detail stays on the same-origin path `/siebel/app/callcenter/enu`.

Siebel Tools steps, the business service contract, and the manifest registration are in [docs/SIEBEL_SETUP.md](docs/SIEBEL_SETUP.md) and [docs/SIEBEL_SERVICE.md](docs/SIEBEL_SERVICE.md).

## Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Business service contract](docs/SIEBEL_SERVICE.md)
- [Siebel setup](docs/SIEBEL_SETUP.md)
- [Development](docs/DEVELOPMENT.md)
- [Testing](docs/TESTING.md)
- [Open questions](docs/OPEN_QUESTIONS.md)
