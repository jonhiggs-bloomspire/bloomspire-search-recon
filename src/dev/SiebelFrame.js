import { useState } from "react";

const TABS = [
  { id: "recon", label: "Recon" },
  { id: "job-runs", label: "Job Runs" },
  { id: "bulk-jobs", label: "Bulk Jobs" },
];

export function SiebelFrame({ children }) {
  const [tab, setTab] = useState("recon");
  const active = TABS.find((item) => item.id === tab) || TABS[0];

  return (
    <div className="siebel-frame">
      <header className="siebel-top">
        <span>Siebel Open UI</span>
        <span>Call Center</span>
      </header>
      <div className="siebel-screen">Administration - Elasticsearch</div>
      <div className="siebel-tabs" role="tablist" aria-label="Administration - Elasticsearch">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`siebel-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls="siebel-view"
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div
        className="siebel-view"
        id="siebel-view"
        role="tabpanel"
        aria-labelledby={`siebel-tab-${active.id}`}
      >
        {tab === "recon" ? (
          children
        ) : (
          <p className="siebel-placeholder">{active.label} is a separate view on this screen.</p>
        )}
      </div>
    </div>
  );
}
