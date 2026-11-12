import { render, screen } from "@testing-library/react";
import { CheckLabel, RecordTypeBadge, StatusBadge } from "./badges";

test("badges use the Lead label and status text", () => {
  render(
    <div>
      <RecordTypeBadge recordType="Opportunity" />
      <CheckLabel check="es_only" />
      <StatusBadge status="paused" partial />
    </div>
  );
  expect(screen.getByText("Lead")).toBeInTheDocument();
  expect(screen.getByText("ES only")).toBeInTheDocument();
  expect(screen.getByText("Paused")).toBeInTheDocument();
  expect(screen.getByText("Partial")).toBeInTheDocument();
});
