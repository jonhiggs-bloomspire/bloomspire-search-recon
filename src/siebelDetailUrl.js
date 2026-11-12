export const SIEBEL_APP_PATH = "/siebel/app/callcenter/enu";

/**
 * Standard detail view and applet for each recon record type.
 * The stored record type for a lead is Opportunity.
 */
export const SIEBEL_DETAIL_VIEWS = {
  Individual: {
    view: "Contact Detail View",
    applet: "Contact Form Applet",
  },
  Entity: {
    view: "Account Detail View",
    applet: "Account Form Applet",
  },
  Opportunity: {
    view: "Opportunity Detail View",
    applet: "Opportunity Form Applet",
  },
};

/**
 * Same-origin Open UI link for a Siebel row. appBase is a path or origin
 * prefix from BSPRE_SIEBEL_APP_BASE. Leave it empty when Siebel serves the page.
 */
export function siebelDetailUrl(recordType, rowId, appBase) {
  const spec = SIEBEL_DETAIL_VIEWS[recordType];
  if (!spec || rowId == null || String(rowId).trim() === "") {
    return null;
  }
  const prefix = appBase == null ? "" : String(appBase).replace(/\/$/, "");
  const base = `${prefix}${SIEBEL_APP_PATH}`;
  const params = new URLSearchParams({
    SWECmd: "GotoView",
    SWEView: spec.view,
    SWEApplet: spec.applet,
    SWERowId: String(rowId),
  });
  return `${base}?${params.toString()}`;
}
