import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RUN_IDS } from "../api/fixtures";
import { createMockReconApi } from "../api/mockReconApi";
import { RunSummary } from "./RunSummary";

test("shows completed counts and hides compare for a partial run", async () => {
  render(<RunSummary api={createMockReconApi()} runId={RUN_IDS.current} />);
  expect(await screen.findByRole("columnheader", { name: "Siebel count" })).toBeInTheDocument();
  expect(screen.getByRole("row", { name: /Lead/ })).toHaveTextContent("43");
  expect(screen.getByRole("row", { name: /Overall/ })).toHaveTextContent("262");
  expect(screen.getByText(/time zones must match/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "View findings" })).toHaveAttribute(
    "href",
    "#/runs/RUN-1042/findings"
  );
  expect(screen.getByRole("link", { name: "Compare this run" })).toBeInTheDocument();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.queryByText(/Partial run/)).not.toBeInTheDocument();
});

test("shows progress for a paused run and resumes it", async () => {
  const user = userEvent.setup();
  const api = createMockReconApi();
  render(<RunSummary api={api} runId={RUN_IDS.paused} />);
  const progress = await screen.findByRole("progressbar");
  expect(progress).toHaveAttribute("aria-valuenow", "9");
  expect(progress).toHaveAttribute("aria-valuemax", "24");
  expect(screen.getByText("Chunks 9 of 24. Last checkpoint Entity 1-ENT30.")).toBeInTheDocument();
  expect(screen.getByText(/Partial run/)).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: "Compare this run" })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Resume" }));
  expect(await screen.findByRole("button", { name: "Pause" })).toBeInTheDocument();
  expect((await api.getRun(RUN_IDS.paused)).status).toBe("running");
});

test("shows an error run message", async () => {
  render(<RunSummary api={createMockReconApi()} runId={RUN_IDS.error} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("checkpoint could not be saved");
  expect(screen.getByText(/Partial run/)).toBeInTheDocument();
});
