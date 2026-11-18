import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RUN_IDS } from "../api/fixtures";
import { createMockReconApi } from "../api/mockReconApi";
import { CompareScreen } from "./CompareScreen";

test("shows new, resolved, and still-open findings for two completed runs", async () => {
  render(
    <CompareScreen
      api={createMockReconApi()}
      initialBaseline={RUN_IDS.baseline}
      initialCurrent={RUN_IDS.current}
    />
  );
  expect(await screen.findByRole("table", { name: /New \(8\)/ })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: /Resolved \(3\)/ })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: /Still open \(3\)/ })).toBeInTheDocument();
  expect(screen.getByRole("table", { name: /New/ })).toHaveTextContent("Priya Nair");
  expect(screen.getByRole("table", { name: /Resolved/ })).toHaveTextContent("Luis Ortega");
  expect(screen.getByRole("table", { name: /Still open/ })).toHaveTextContent("Jordan Hale");
  expect(screen.queryByRole("option", { name: /RUN-1043/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("option", { name: /RUN-1044/ })).not.toBeInTheDocument();
  const detail = screen.getAllByRole("link", { name: /1-IND10/ })[0];
  expect(detail.getAttribute("href")).toContain("/siebel/app/callcenter/enu");
});

test("compare from the form navigates and rejects a partial id passed in the hash", async () => {
  const user = userEvent.setup();
  render(<CompareScreen api={createMockReconApi()} />);
  expect(await screen.findAllByRole("option", { name: /RUN-1041/ })).toHaveLength(2);
  await user.selectOptions(screen.getByLabelText("Baseline run"), RUN_IDS.baseline);
  await user.selectOptions(screen.getByLabelText("Current run"), RUN_IDS.current);
  await user.click(screen.getByRole("button", { name: "Compare" }));
  expect(window.location.hash).toContain("baseline=RUN-1041");
  expect(window.location.hash).toContain("current=RUN-1042");
});

test("reports an API refusal for a partial run", async () => {
  render(
    <CompareScreen
      api={createMockReconApi()}
      initialBaseline={RUN_IDS.paused}
      initialCurrent={RUN_IDS.current}
    />
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(/Partial/);
});
