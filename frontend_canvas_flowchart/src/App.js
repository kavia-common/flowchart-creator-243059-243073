import React, { useCallback, useEffect, useState } from "react";
import "./App.css";
import FlowCanvas from "./components/FlowCanvas";

/**
 * App shell for the retro flowchart creator.
 * This is intentionally minimal: header + full-screen canvas.
 */

// PUBLIC_INTERFACE
function App() {
  const [toast, setToast] = useState(null);

  const onToast = useCallback(({ title, message }) => {
    setToast({ title, message, ts: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <div className="App">
      <div className="retroGrid" aria-hidden="true" />

      <div className="appShell">
        <header className="header" role="banner">
          <div className="brand" aria-label="App branding">
            <div className="brandTitle">
              Retro<span className="accent">Flow</span>
            </div>
            <div className="brandSubtitle">type → enter → auto-connect</div>
          </div>

          <div className="toolbar" aria-label="Toolbar">
            <div className="pill" title="Persistence">
              Autosaves to <strong>localStorage</strong>
            </div>
            <div className="pill" title="Node keywords">
              Keywords: <strong>decision:</strong> <strong>input:</strong> <strong>output:</strong>
            </div>
          </div>

          <div className="rightTools">
            <div className="pill" title="Tips">
              Double-click a node to edit
            </div>
          </div>
        </header>

        <main className="main" role="main">
          {toast && (
            <div className="toast" role="status" aria-live="polite">
              <strong>{toast.title}:</strong> {toast.message}
            </div>
          )}
          <FlowCanvas onToast={onToast} />
        </main>
      </div>
    </div>
  );
}

export default App;
