import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SetupScreen } from "./SetupScreen";

test("starts with every record type selected and explains the time zone rule", () => {
  render(<SetupScreen api={{ startRun: jest.fn() }} />);
  expect(screen.getByRole("checkbox", { name: "Individual" })).toBeChecked();
  expect(screen.getByRole("checkbox", { name: "Entity" })).toBeChecked();
  const lead = screen.getByRole("checkbox", { name: "Lead" });
  expect(lead).toBeChecked();
  expect(lead).toHaveAttribute("value", "Opportunity");
  expect(screen.getByLabelText("Stale tolerance in seconds")).toHaveValue(0);
  expect(screen.getByText(/time zones must match/)).toBeInTheDocument();
});

test("requires a record type and a whole-number tolerance", async () => {
  const user = userEvent.setup();
  const startRun = jest.fn();
  render(<SetupScreen api={{ startRun }} />);
  await user.click(screen.getByRole("checkbox", { name: "Individual" }));
  await user.click(screen.getByRole("checkbox", { name: "Entity" }));
  await user.click(screen.getByRole("checkbox", { name: "Lead" }));
  expect(screen.getByRole("button", { name: "Start run" })).toBeDisabled();
  expect(screen.getByRole("alert")).toHaveTextContent("Choose at least one record type.");

  await user.click(screen.getByRole("checkbox", { name: "Lead" }));
  await user.clear(screen.getByLabelText("Stale tolerance in seconds"));
  await user.type(screen.getByLabelText("Stale tolerance in seconds"), "-3");
  await user.click(screen.getByRole("button", { name: "Start run" }));
  expect(startRun).not.toHaveBeenCalled();
  expect(screen.getByRole("alert")).toHaveTextContent(/whole number/);
});
