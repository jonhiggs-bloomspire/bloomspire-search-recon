import { render, screen } from "@testing-library/react";
import { createMockReconApi } from "../api/mockReconApi";
import { RunHistory } from "./RunHistory";

test("renders seeded runs with status, owner, and per-type counts", async () => {
  render(<RunHistory api={createMockReconApi()} />);
  expect(await screen.findByRole("link", { name: "RUN-1042" })).toHaveAttribute("href", "#/runs/RUN-1042");
  expect(screen.getAllByText("A. Okonkwo").length).toBeGreaterThan(0);
  expect(screen.getByText("Paused")).toBeInTheDocument();
  expect(screen.getByText("Running")).toBeInTheDocument();
  expect(screen.getByText("Error")).toBeInTheDocument();
  expect(screen.getAllByText("Done").length).toBeGreaterThan(1);
  const row = screen.getByRole("row", { name: /RUN-1043/ });
  expect(row).toHaveTextContent("M. Patel");
  expect(row).toHaveTextContent("Partial");
});

test("shows an empty state and a load error", async () => {
  const { rerender } = render(<RunHistory api={{ listRuns: async () => [] }} />);
  expect(await screen.findByText("No runs yet.")).toBeInTheDocument();
  rerender(
    <RunHistory
      api={{
        listRuns: async () => {
          throw new Error("list failed");
        },
      }}
    />
  );
  expect(await screen.findByRole("alert")).toHaveTextContent("list failed");
});
