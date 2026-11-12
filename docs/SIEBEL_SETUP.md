# Siebel setup

Recon is the first view on the **Administration - Elasticsearch** screen, before the existing Job Runs and Bulk Jobs views. It is content under that view tab. The physical renderer hides the applet placeholder and shows the React host in its place.

Copy these files to `scripts/siebel/custom/` on the Siebel server before the manifest steps:

- `BloomspireSearchReconPR.js`
- `bspre-recon-bundle.js` (the file written to `dist/` by `npm run build`)

The renderer define name is `siebel/custom/BloomspireSearchReconPR`. The bundle URL it requests is `/siebel/scripts/siebel/custom/bspre-recon-bundle.js`.

## Applet

In Siebel Tools or Web Tools, create an applet the view can instantiate. The renderer replaces its contents.

- Name: `BSPRE Elasticsearch Recon Applet`
- Project: the Bloomspire admin project used by the other Elasticsearch admin applets
- Class: `CSSSWEFrame`
- Title: `Search Recon`
- Business component: a small component that returns a row so Open UI can build the applet frame. A dedicated component `BSPRE Elasticsearch Recon` with one placeholder field is enough. The React app does not read applet fields.

The applet div id Siebel generates is `#s_<GetFullId>_div`. The renderer inserts the host after that div.

## View

- Name: `BSPRE Elasticsearch Recon View`
- Title / viewbar text: `Recon`
- Business object: the same one used by the other views on Administration - Elasticsearch
- Web template: a standard view template with one applet
- Applet: `BSPRE Elasticsearch Recon Applet`

## Screen

On the screen `Administration - Elasticsearch`, add a screen view:

- View: `BSPRE Elasticsearch Recon View`
- Menu text and viewbar text: `Recon`
- Sequence: lower than the Job Runs and Bulk Jobs screen views, so the tab is first
- Display in page: checked, same as the other views on that screen
- Display in site map: checked if those views are in the site map

Type, parent category, and sequence should otherwise match the existing views on that screen. Confirm the sequence numbers already used by Job Runs and Bulk Jobs before saving. See [open questions](OPEN_QUESTIONS.md).

## Manifest Administration

1. Log in as an administrator.
2. Go to Administration - Application, Manifest Files.
3. Add `siebel/custom/bspre-recon-bundle.js`.
4. Add `siebel/custom/BloomspireSearchReconPR.js`.
5. Go to Manifest Administration.
6. Create a UI object:
   - Type: Applet
   - Usage type: Physical Renderer
   - Name: `BSPRE Elasticsearch Recon Applet`
7. Add an object expression for Desktop.
8. Under Files, add `siebel/custom/bspre-recon-bundle.js` first, then `siebel/custom/BloomspireSearchReconPR.js`. The renderer also requests the bundle if `mount` is not registered yet. Loading the bundle first lets the UMD factory register `BloomspireSearchRecon.mount`.
9. Clear the browser cache and log in again.

## Responsibilities

Add `BSPRE Elasticsearch Recon View` to every responsibility that already shows Job Runs and Bulk Jobs on Administration - Elasticsearch. Siebel Administrator is the usual starting point. Users without the view do not see the Recon tab.

## After deployment

Open Administration - Elasticsearch. The first tab is Recon. Job Runs and Bulk Jobs stay on the screen. Starting a run calls `BSPRE Elasticsearch Recon`. Until that service is deployed, build the bundle with `BSPRE_RECON_API=mock` only for a local demo. A production bundle should use the default Siebel client.
