import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SiebelFrame } from "./SiebelFrame";

test("shows Recon as the first view tab and keeps the other views separate", async () => {
  const user = userEvent.setup();
  render(
    <SiebelFrame>
      <p>Recon content</p>
    </SiebelFrame>
  );
  const recon = screen.getByRole("tab", { name: "Recon" });
  const bulk = screen.getByRole("tab", { name: "Bulk Jobs" });
  expect(recon).toHaveAttribute("aria-selected", "true");
  expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
    "Recon",
    "Job Runs",
    "Bulk Jobs",
  ]);
  expect(screen.getByText("Administration - Elasticsearch")).toBeInTheDocument();
  expect(screen.getByText("Recon content")).toBeInTheDocument();
  await user.click(bulk);
  expect(bulk).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("Bulk Jobs is a separate view on this screen.")).toBeInTheDocument();
  expect(screen.queryByText("Recon content")).not.toBeInTheDocument();
});
