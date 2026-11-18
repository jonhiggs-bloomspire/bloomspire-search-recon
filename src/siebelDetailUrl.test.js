import { SIEBEL_APP_PATH, SIEBEL_DETAIL_VIEWS, siebelDetailUrl } from "./siebelDetailUrl";

test("builds a same-origin Open UI detail link", () => {
  const url = siebelDetailUrl("Individual", "1-IND10", "");
  expect(url.startsWith(`${SIEBEL_APP_PATH}?`)).toBe(true);
  expect(url).toContain("SWECmd=GotoView");
  expect(url).toContain("SWEView=Contact+Detail+View");
  expect(url).toContain("SWEApplet=Contact+Form+Applet");
  expect(url).toContain("SWERowId=1-IND10");
  expect(url).not.toContain("http://");
  expect(url).not.toContain("https://");
});

test("uses the Opportunity view for a lead row and prefixes an app base", () => {
  expect(SIEBEL_DETAIL_VIEWS.Opportunity.view).toBe("Opportunity Detail View");
  const url = siebelDetailUrl("Opportunity", "1-OPP07", "/portal");
  expect(url.startsWith(`/portal${SIEBEL_APP_PATH}?`)).toBe(true);
  expect(url).toContain("SWERowId=1-OPP07");
});

test("returns null without a known type or id", () => {
  expect(siebelDetailUrl("Other", "1-X", "")).toBeNull();
  expect(siebelDetailUrl("Entity", "  ", "")).toBeNull();
  expect(siebelDetailUrl("Entity", null, "")).toBeNull();
});
