import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RUN_IDS } from "../api/fixtures";
import { createMockReconApi } from "../api/mockReconApi";
import { FindingsDetail } from "./FindingsDetail";

function renderFindings(api = createMockReconApi()) {
  return render(<FindingsDetail api={api} runId={RUN_IDS.current} pageSize={5} appBase="" />);
}

test("pages findings and links each id to Siebel", async () => {
  const user = userEvent.setup();
  renderFindings();
  const link = await screen.findByRole("link", { name: /1-IND10/ });
  expect(link).toHaveTextContent("View detail");
  expect(link.getAttribute("href")).toContain("/siebel/app/callcenter/enu");
  expect(link.getAttribute("href")).toContain("SWERowId=1-IND10");
  expect(link.getAttribute("href")).not.toContain("http");
  expect(screen.getByRole("row", { name: /1-IND10/ })).toHaveTextContent("11/5/2025 11:41:37 AM");
  expect(screen.getByText("Showing 1–5 of 11")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Next" }));
  expect(await screen.findByRole("link", { name: /1-ENT03/ })).toBeInTheDocument();
  expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
});

test("filters by type, check, and id", async () => {
  const user = userEvent.setup();
  renderFindings();
  await screen.findByRole("link", { name: /1-IND10/ });
  await user.selectOptions(screen.getByLabelText("Record type"), "Individual");
  expect(await screen.findByText("Showing 1–4 of 4")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /1-ENT20/ })).not.toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Check"), "stale");
  expect(await screen.findByRole("link", { name: /1-IND20/ })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /1-IND10/ })).not.toBeInTheDocument();

  await user.selectOptions(screen.getByLabelText("Record type"), "");
  await user.selectOptions(screen.getByLabelText("Check"), "");
  await user.type(screen.getByLabelText("Id"), "opp07");
  await user.click(screen.getByRole("button", { name: "Apply" }));
  expect(await screen.findByRole("link", { name: /1-OPP07/ })).toBeInTheDocument();
  expect(screen.getByText("Showing 1–1 of 1")).toBeInTheDocument();
  expect(screen.getByRole("row", { name: /1-OPP07/ })).toHaveTextContent("Lead");
});

test("exports the applied filter", async () => {
  const user = userEvent.setup();
  const api = createMockReconApi();
  const exportCsv = jest.spyOn(api, "exportCsv");
  URL.createObjectURL = jest.fn(() => "blob:recon");
  URL.revokeObjectURL = jest.fn();
  renderFindings(api);
  await screen.findByRole("link", { name: /1-IND10/ });
  await user.type(screen.getByLabelText("Id"), "1-IND10");
  await user.click(screen.getByRole("button", { name: "Apply" }));
  await screen.findByText("Showing 1–1 of 1");
  await user.click(screen.getByRole("button", { name: "Export CSV" }));
  expect(exportCsv).toHaveBeenCalledWith(RUN_IDS.current, {
    filters: { recordType: "", check: "", id: "1-IND10" },
  });
});
