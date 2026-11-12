import { createRoot } from "react-dom/client";
import { createReconApi } from "./api/reconApi";
import { App } from "./App";
import { readConfig } from "./config";
import "./styles.css";

export function mount(host, options = {}) {
  if (!host || host.nodeType !== 1) {
    throw new Error("mount requires a host element");
  }
  host.classList.add("bspre-recon-host");
  const config = readConfig(options.config || {});
  const api = options.api || createReconApi(config);
  const root = createRoot(host);
  root.render(
    <App
      api={api}
      config={{
        api: config.api,
        pageSize: config.pageSize,
        siebelAppBase: config.siebelAppBase,
      }}
    />
  );
  return function unmount() {
    root.unmount();
  };
}

if (typeof window !== "undefined") {
  window.BloomspireSearchRecon = window.BloomspireSearchRecon || {};
  window.BloomspireSearchRecon.mount = mount;
}
