import { render, screen } from "@testing-library/react";
import { ErrorNote, LoadingNote } from "./notices";

test("notices expose status and alert roles", () => {
  render(
    <div>
      <LoadingNote>Loading runs…</LoadingNote>
      <ErrorNote>Something failed.</ErrorNote>
      <ErrorNote>{""}</ErrorNote>
    </div>
  );
  expect(screen.getByRole("status")).toHaveTextContent("Loading runs…");
  expect(screen.getByRole("alert")).toHaveTextContent("Something failed.");
});
