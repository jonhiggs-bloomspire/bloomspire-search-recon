import {
  CHUNK_SIZE_ERROR,
  normalizeFilters,
  normalizePage,
  normalizePitKeepAlive,
  normalizeRecordTypes,
  normalizeSetups,
  normalizeStartOverrides,
  normalizeTolerance,
  PIT_KEEP_ALIVE_ERROR,
  ReconApiError,
  SETUP_REQUIRED_ERROR,
} from "./contract";

test("passes record type tokens through without a fixed list", () => {
  expect(normalizeRecordTypes(["Opportunity", "Individual", "Individual"])).toEqual([
    "Opportunity",
    "Individual",
  ]);
  expect(normalizeRecordTypes("Account, Contact")).toEqual(["Account", "Contact"]);
  expect(normalizeRecordTypes([])).toEqual([]);
  expect(normalizeRecordTypes(null)).toEqual([]);
  expect(normalizeRecordTypes(["Case"])).toEqual(["Case"]);
});

test("normalizes tolerance, filters, and pages", () => {
  expect(normalizeTolerance()).toBe(0);
  expect(normalizeTolerance({ toleranceSeconds: 60 })).toBe(60);
  expect(() => normalizeTolerance({ toleranceSeconds: 1.5 })).toThrow(/Tolerance/);
  expect(normalizeFilters({ recordType: "Entity", check: "stale", id: " ab " })).toEqual({
    recordType: "Entity",
    check: "stale",
    id: "ab",
  });
  expect(normalizeFilters({ recordType: "Case" }).recordType).toBe("Case");
  expect(() => normalizeFilters({ check: "other" })).toThrow(/Unknown check/);
  expect(normalizePage(2)).toEqual({ page: 2, pageSize: 10 });
  expect(normalizePage({ page: "3", pageSize: "5" })).toEqual({ page: 3, pageSize: 5 });
  expect(() => normalizePage({ page: 0 })).toThrow(/Page/);
});

test("validates setup rows, defaults, and duplicates", () => {
  expect(normalizePitKeepAlive("")).toBe("10m");
  expect(normalizePitKeepAlive("2d")).toBe("2d");
  expect(() => normalizePitKeepAlive("10")).toThrow(PIT_KEEP_ALIVE_ERROR);
  expect(() => normalizePitKeepAlive("10M")).toThrow(PIT_KEEP_ALIVE_ERROR);
  expect(() => normalizePitKeepAlive("1234567890m")).toThrow(PIT_KEEP_ALIVE_ERROR);

  const inserted = normalizeSetups([
    {
      busComp: "Contact",
      recordType: "Individual",
      busObj: "BSPRE ES Individual",
      intObj: "BSPRE ES Individual",
      esTypePath: "record_type",
      esTypeValue: "Individual",
      esUpdatedPath: "individual.last_updated",
      chunkSize: "",
      pitKeepAlive: "",
      searchSpec: "  ",
      typeSeq: "",
    },
  ]);
  expect(inserted[0]).toMatchObject({
    busComp: "Contact",
    chunkSize: 500,
    pitKeepAlive: "10m",
    searchSpec: null,
    esIdPath: "_id",
    active: true,
    typeSeq: 0,
  });

  expect(() => normalizeSetups([{ busComp: "Contact" }])).toThrow(SETUP_REQUIRED_ERROR);
  expect(() => normalizeSetups([{ recordType: "Individual" }])).toThrow(/busComp/);
  expect(() => normalizeSetups([])).toThrow(ReconApiError);
  expect(() =>
    normalizeSetups([
      { busComp: "Contact", recordType: "A", busObj: "B", intObj: "C", esTypePath: "p", esTypeValue: "v", esUpdatedPath: "u", chunkSize: 0 },
    ])
  ).toThrow(CHUNK_SIZE_ERROR);
  expect(() =>
    normalizeSetups(
      [
        {
          busComp: "Contact",
          chunkSize: 5001,
        },
      ],
      ["Contact"]
    )
  ).toThrow(CHUNK_SIZE_ERROR);

  const updated = normalizeSetups([{ busComp: "Contact", searchSpec: '[Last Name] = "Doe"', active: false }], ["Contact"]);
  expect(updated[0]).toEqual({
    busComp: "Contact",
    searchSpec: '[Last Name] = "Doe"',
    active: false,
  });

  expect(() =>
    normalizeSetups([
      {
        busComp: "Contact",
        recordType: "Individual",
        busObj: "BO",
        intObj: "IO",
        esTypePath: "record_type",
        esTypeValue: "Individual",
        esUpdatedPath: "individual.last_updated",
      },
      {
        busComp: "Contact",
        recordType: "Individual",
        busObj: "BO",
        intObj: "IO",
        esTypePath: "record_type",
        esTypeValue: "Individual",
        esUpdatedPath: "individual.last_updated",
      },
    ])
  ).toThrow("Setups has a duplicate busComp: Contact.");
});

test("validates start overrides and drops blank ones", () => {
  expect(normalizeStartOverrides(null)).toEqual([]);
  expect(
    normalizeStartOverrides([
      { busComp: "Contact" },
      { recordType: "Entity", searchSpec: '[Name] = "North"', chunkSize: "3", pitKeepAlive: "5m" },
    ])
  ).toEqual([
    { recordType: "Entity", searchSpec: '[Name] = "North"', chunkSize: 3, pitKeepAlive: "5m" },
  ]);
  expect(() => normalizeStartOverrides([{ searchSpec: "x" }])).toThrow(/recordType or busComp/);
  expect(() => normalizeStartOverrides([{ busComp: "Contact", chunkSize: 9000 }])).toThrow(CHUNK_SIZE_ERROR);
  expect(() => normalizeStartOverrides("nope")).toThrow(ReconApiError);
});
