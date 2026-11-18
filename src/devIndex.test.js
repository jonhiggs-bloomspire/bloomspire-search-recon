import { act, screen } from "@testing-library/react";
import { startDevHarness } from "./devIndex";

test("dev harness mounts recon under the Administration - Elasticsearch tabs", async () => {
  document.body.innerHTML = '<div id="root"></div>';
  let stop = () => {};
  await act(async () => {
    stop = startDevHarness(document);
  });
  expect(await screen.findByRole("tab", { name: "Recon" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "Job Runs" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Bulk Jobs" })).toBeInTheDocument();
  expect(await screen.findByRole("heading", { name: "Bloomspire Search Recon" })).toBeInTheDocument();
  await act(async () => {
    stop();
  });
});
