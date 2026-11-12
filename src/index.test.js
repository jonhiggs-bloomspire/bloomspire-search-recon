import { act, screen } from "@testing-library/react";
import { createMockReconApi } from "./api/mockReconApi";
import { mount } from "./index";

test("mount renders into the host and unmount clears it", async () => {
  window.location.hash = "#/setup";
  const host = document.createElement("div");
  document.body.appendChild(host);
  let unmount = () => {};
  await act(async () => {
    unmount = mount(host, {
      api: createMockReconApi(),
      config: { api: "mock", pageSize: 5, siebelAppBase: "" },
    });
  });
  expect(host.classList.contains("bspre-recon-host")).toBe(true);
  expect(await screen.findByRole("heading", { name: "Bloomspire Search Recon" })).toBeInTheDocument();
  expect(window.BloomspireSearchRecon.mount).toBe(mount);
  await act(async () => {
    unmount();
  });
  expect(host.innerHTML).toBe("");
  host.remove();
});

test("mount requires an element", () => {
  expect(() => mount(null)).toThrow(/host element/);
});
