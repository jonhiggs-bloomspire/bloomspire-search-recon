import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockReconApi } from "../api/mockReconApi";
import { createSeedState } from "../api/fixtures";
import { SetupScreen } from "./SetupScreen";

const contact = {
  recordType: "Individual",
  busComp: "Contact",
  busObj: "BSPRE ES Individual",
  intObj: "BSPRE ES Individual",
  active: true,
  searchSpec: "",
  chunkSize: 500,
  pitKeepAlive: "10m",
  esTypePath: "record_type",
  esTypeValue: "Individual",
  esIdPath: "_id",
  esUpdatedPath: "individual.last_updated",
  siebelNameFields: "First Name,Last Name",
  esNamePaths: "individual.first_name,individual.last_name",
  typeSeq: 1,
};

function setupApi(overrides = {}) {
  const saveSetup = jest.fn(async (rows) => ({ setups: rows, source: "table" }));
  const startRun = jest.fn(async () => ({ id: "RUN-2000" }));
  const api = {
    getSetup: jest.fn(async () => ({ setups: [contact], source: "seed" })),
    saveSetup,
    startRun,
    ...overrides,
  };
  return { api, saveSetup, startRun };
}

test("shows unsaved built-in defaults and the active rows for a run", async () => {
  const { api } = setupApi();
  render(<SetupScreen api={api} />);
  expect(await screen.findByText(/have not been saved yet/)).toBeInTheDocument();
  expect(screen.getByRole("row", { name: /Individual/ })).toHaveTextContent("Contact");
  expect(screen.getByRole("row", { name: /Individual/ })).toHaveTextContent("All records");
  expect(screen.getByRole("checkbox", { name: "Individual (Contact)" })).toBeChecked();
  expect(screen.getByLabelText("Stale tolerance in seconds")).toHaveValue(0);
  expect(screen.getByText(/time zones must match/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /delete/i })).not.toBeInTheDocument();
});

test("rejects a chunk size outside 1 to 5000 before saving", async () => {
  const user = userEvent.setup();
  const { api, saveSetup } = setupApi();
  render(<SetupScreen api={api} />);
  await screen.findByRole("button", { name: "Edit Contact" });
  await user.click(screen.getByRole("button", { name: "Edit Contact" }));
  const chunk = screen.getByLabelText("Chunk size");
  await user.clear(chunk);
  await user.type(chunk, "9000");
  await user.click(screen.getByRole("button", { name: "Save setup" }));
  expect(saveSetup).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("Chunk Size must be a whole number from 1 to 5000.");
  expect(chunk).toHaveAttribute("aria-invalid", "true");
});

test("shows a server error from SaveSetup", async () => {
  const user = userEvent.setup();
  const { api } = setupApi({
    saveSetup: jest.fn(async () => {
      throw new Error("Setups has a duplicate busComp: Contact.");
    }),
  });
  render(<SetupScreen api={api} />);
  await user.click(await screen.findByRole("button", { name: "Edit Contact" }));
  await user.click(screen.getByRole("button", { name: "Save setup" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Setups has a duplicate busComp: Contact.");
});

test("saves a new row and deactivates by clearing Active", async () => {
  const user = userEvent.setup();
  const { api, saveSetup } = setupApi({
    getSetup: jest.fn(async () => ({ setups: [contact], source: "table" })),
  });
  render(<SetupScreen api={api} />);
  await screen.findByRole("button", { name: "Edit Contact" });
  await user.click(screen.getByRole("button", { name: "Add business component" }));
  await user.type(screen.getByLabelText("Business component"), "Contact");
  await user.click(screen.getByRole("button", { name: "Save setup" }));
  expect(saveSetup).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent("Setups has a duplicate busComp: Contact.");

  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await user.click(screen.getByRole("button", { name: "Edit Contact" }));
  expect(screen.getByLabelText("Business component")).toHaveAttribute("readOnly");
  await user.clear(screen.getByLabelText("Record type"));
  await user.click(screen.getByRole("button", { name: "Save setup" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/recordType, busComp, busObj/);

  await user.type(screen.getByLabelText("Record type"), "Individual");
  await user.click(screen.getByRole("checkbox", { name: "Active" }));
  await user.click(screen.getByRole("button", { name: "Save setup" }));
  expect(saveSetup).toHaveBeenCalled();
  const [rows, options] = saveSetup.mock.calls[0];
  expect(options.existingBusComps).toEqual(["Contact"]);
  expect(rows[0].active).toBe(false);
  expect(rows[0].busComp).toBe("Contact");
});

test("starts with every active row and can send a per-component override", async () => {
  const user = userEvent.setup();
  const { api, startRun } = setupApi();
  render(<SetupScreen api={api} />);
  await screen.findByRole("checkbox", { name: "Individual (Contact)" });
  await user.click(screen.getByRole("button", { name: "Start run" }));
  expect(startRun).toHaveBeenCalledWith({
    recordTypes: [],
    options: { toleranceSeconds: 0 },
    setup: [],
  });

  startRun.mockClear();
  await user.click(screen.getByRole("checkbox", { name: "Individual (Contact)" }));
  expect(screen.getByRole("button", { name: "Start run" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one record type.");

  await user.click(screen.getByRole("checkbox", { name: "Individual (Contact)" }));
  await user.click(screen.getByText("Override search spec, chunk size, or PIT keep-alive for this run"));
  await user.type(screen.getByLabelText("Chunk size for Contact"), "3");
  await user.type(screen.getByLabelText("PIT keep alive for Contact"), "5m");
  await user.clear(screen.getByLabelText("Stale tolerance in seconds"));
  await user.type(screen.getByLabelText("Stale tolerance in seconds"), "-3");
  await user.click(screen.getByRole("button", { name: "Start run" }));
  expect(startRun).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(/whole number/);

  await user.clear(screen.getByLabelText("Stale tolerance in seconds"));
  await user.type(screen.getByLabelText("Stale tolerance in seconds"), "30");
  await user.click(screen.getByRole("button", { name: "Start run" }));
  expect(startRun).toHaveBeenCalledWith({
    recordTypes: [],
    options: { toleranceSeconds: 30 },
    setup: [{ busComp: "Contact", chunkSize: "3", pitKeepAlive: "5m" }],
  });
});

test("the mock client rejects a start while another run is active and persists a seed save", async () => {
  const user = userEvent.setup();
  const api = createMockReconApi();
  const first = render(<SetupScreen api={api} />);
  expect(await screen.findByText(/have not been saved yet/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Start run" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("A run is already running or paused.");
  first.unmount();

  const idle = createSeedState();
  idle.runs.forEach((run) => {
    if (run.status === "running" || run.status === "paused") {
      run.status = "done";
      run.partial = false;
      run.endedAt = run.startedAt;
    }
  });
  const open = createMockReconApi(idle);
  render(<SetupScreen api={open} />);
  await user.click(await screen.findByRole("button", { name: "Edit Contact" }));
  const chunk = screen.getByLabelText("Chunk size");
  await user.clear(chunk);
  await user.type(chunk, "40");
  await user.click(screen.getByRole("button", { name: "Save setup" }));
  expect(await screen.findByText("40")).toBeInTheDocument();
  const saved = await open.getSetup();
  expect(saved.source).toBe("table");
  expect(saved.setups.map((row) => row.busComp)).toEqual(["Contact", "Account", "Opportunity"]);
  expect(saved.setups[0].chunkSize).toBe(40);
});
