import { createRoot } from "react-dom/client";
import { SiebelFrame } from "./dev/SiebelFrame";
import "./dev/siebelFrame.css";
import { mount } from "./index";

function HostSlot({ host }) {
  return (
    <div
      ref={(node) => {
        if (node && host.parentNode !== node) {
          node.appendChild(host);
        }
      }}
    />
  );
}

export function startDevHarness(doc = document) {
  const rootEl = doc.getElementById("root");
  if (!rootEl) {
    throw new Error("Dev harness requires a #root element");
  }
  const host = doc.createElement("div");
  host.className = "bspre-recon-host";
  const unmountApp = mount(host);
  const root = createRoot(rootEl);
  root.render(
    <SiebelFrame>
      <HostSlot host={host} />
    </SiebelFrame>
  );
  return function stop() {
    unmountApp();
    root.unmount();
  };
}

if (process.env.NODE_ENV !== "test") {
  startDevHarness();
}
