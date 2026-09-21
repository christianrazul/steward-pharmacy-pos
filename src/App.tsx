import { useEffect, useState } from "react";
import { readDatabaseVersion } from "./lib/database";

type DatabaseStatus =
  | { state: "opening" }
  | { state: "ready"; version: string }
  | { state: "failed"; message: string };

const STATUS_LABELS: Record<DatabaseStatus["state"], string> = {
  opening: "Opening local database",
  ready: "Local database ready",
  failed: "Local database unavailable",
};

export default function App() {
  const [status, setStatus] = useState<DatabaseStatus>({ state: "opening" });

  useEffect(() => {
    let active = true;

    readDatabaseVersion()
      .then((version) => {
        if (active) setStatus({ state: "ready", version });
      })
      .catch((error: unknown) => {
        if (active) setStatus({ state: "failed", message: String(error) });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 px-6 py-4">
        <h1 className="text-lg font-semibold">Steward</h1>
        <p className="text-sm text-slate-500">Counter terminal</p>
      </header>

      <section className="flex flex-1 items-center justify-center">
        <p className="text-sm text-slate-400">No sale in progress</p>
      </section>

      <footer className="border-t border-slate-200 px-6 py-3 text-xs text-slate-500">
        {STATUS_LABELS[status.state]}
        {status.state === "ready" && ` · SQLite ${status.version}`}
        {status.state === "failed" && ` · ${status.message}`}
      </footer>
    </main>
  );
}
