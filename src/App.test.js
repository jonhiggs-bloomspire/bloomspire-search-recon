import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMockReconApi } from "./api/mockReconApi";
import { App } from "./App";

const config = { api: "mock", pageSize: 5, siebelAppBase: "" };

async function go(hash) {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
}

test("renders setup, history, a completed summary, and a started run", async () => {
  const user = userEvent.setup();
  const api = createMockReconApi();
  window.location.hash = "#/setup";
  render(<App api={api} config={config} />);
  expect(screen.getByRole("heading", { name: "Bloomspire Search Recon" })).toBeInTheDocument();
  expect(screen.getByText("MOCK DATA")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Lead" })).toBeChecked();

  await user.click(screen.getByRole("button", { name: "Start run" }));
  expect(await screen.findByRole("heading", { name: "Run summary" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  expect(screen.getByText(/Partial run/)).toBeInTheDocument();

  await go("#/history");
  expect(await screen.findByRole("link", { name: "RUN-1042" })).toBeInTheDocument();

  await go("#/runs/RUN-1042");
  expect(await screen.findByRole("row", { name: /Overall/ })).toHaveTextContent("262");

  await go("#/runs/RUN-1042/findings");
  expect(await screen.findByRole("link", { name: /1-IND10/ })).toBeInTheDocument();

  await go("#/compare?baseline=RUN-1041&current=RUN-1042");
  expect(await screen.findByRole("table", { name: /Still open/ })).toHaveTextContent("Campus retrofit");
});
