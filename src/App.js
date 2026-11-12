import { useEffect, useState } from "react";
import { CompareScreen } from "./components/CompareScreen";
import { FindingsDetail } from "./components/FindingsDetail";
import { RunHistory } from "./components/RunHistory";
import { RunSummary } from "./components/RunSummary";
import { SetupScreen } from "./components/SetupScreen";
import { parseHash } from "./router";

export function App({ api, config }) {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  const [lastRunId, setLastRunId] = useState("");

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    if (route.runId) {
      setLastRunId(route.runId);
    }
  }, [route.runId]);

  const runId = route.runId || lastRunId;
  const summaryHref = runId ? `#/runs/${encodeURIComponent(runId)}` : "";
  const findingsHref = runId ? `#/runs/${encodeURIComponent(runId)}/findings` : "";
  const nav = [
    { name: "setup", label: "Setup", href: "#/setup" },
    { name: "history", label: "Run history", href: "#/history" },
    { name: "summary", label: "Summary", href: summaryHref },
    { name: "findings", label: "Findings", href: findingsHref },
    { name: "compare", label: "Compare", href: "#/compare" },
  ];

  return (
    <div className="bspre-app">
      <header className="bspre-header">
        <div>
          <h1>Bloomspire Search Recon</h1>
          <p>Reconcile Siebel with the bloomspire search index.</p>
        </div>
        {config.api === "mock" ? <span className="bspre-mock">MOCK DATA</span> : null}
      </header>
      <nav className="bspre-nav" aria-label="Recon">
        {nav.map((item) =>
          item.href ? (
            <a key={item.name} href={item.href} aria-current={route.name === item.name ? "page" : undefined}>
              {item.label}
            </a>
          ) : (
            <span key={item.name} className="bspre-nav-disabled" aria-disabled="true">
              {item.label}
            </span>
          )
        )}
      </nav>
      {route.name === "setup" ? <SetupScreen api={api} /> : null}
      {route.name === "history" ? <RunHistory api={api} /> : null}
      {route.name === "summary" ? <RunSummary api={api} runId={route.runId} /> : null}
      {route.name === "findings" ? (
        <FindingsDetail
          api={api}
          runId={route.runId}
          pageSize={config.pageSize}
          appBase={config.siebelAppBase}
        />
      ) : null}
      {route.name === "compare" ? (
        <CompareScreen
          api={api}
          initialBaseline={route.baselineId}
          initialCurrent={route.currentId}
          appBase={config.siebelAppBase}
        />
      ) : null}
    </div>
  );
}
