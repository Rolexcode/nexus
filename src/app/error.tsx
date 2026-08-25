"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="error-page">
      <div className="error-card">
        <AlertCircle aria-hidden="true" size={28} />
        <h1>Nexus couldn’t load</h1>
        <p>Your work is safe. Try loading the campus experience again.</p>
        <button className="primary-button" type="button" onClick={reset}>
          <RotateCcw aria-hidden="true" size={18} />
          Try again
        </button>
      </div>
    </main>
  );
}
