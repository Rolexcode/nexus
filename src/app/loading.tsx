export default function Loading() {
  return (
    <main className="page-loading" aria-label="Loading Nexus">
      <div className="loading-brand skeleton" />
      <div className="loading-shell">
        <div className="loading-panel skeleton" />
        <div className="loading-map skeleton" />
      </div>
    </main>
  );
}
