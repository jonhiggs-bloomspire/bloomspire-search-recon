import { render, screen } from "@testing-library/react";
import { CheckLabel, RecordTypeBadge, StatusBadge } from "./badges";

test("badges use the record type text and status text", () => {
  render(
    <div>
      <RecordTypeBadge recordType="Opportunity" />
      <RecordTypeBadge recordType="Case" />
      <CheckLabel check="es_only" />
      <StatusBadge status="paused" partial />
    </div>
  );
  expect(screen.getByText("Opportunity")).toBeInTheDocument();
  expect(screen.getByText("Case")).toHaveClass("bspre-badge-other");
  expect(screen.getByText("ES only")).toBeInTheDocument();
  expect(screen.getByText("Paused")).toBeInTheDocument();
  expect(screen.getByText("Partial")).toBeInTheDocument();
});
