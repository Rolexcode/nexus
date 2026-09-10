export default function Loading() {
  return (
    <main
      aria-label="Loading Nexus"
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f6f6f3",
        color: "#171715",
        padding: 24,
      }}
    >
      <div style={{ display: "grid", justifyItems: "center", gap: 14, textAlign: "center" }}>
        <div style={{
          width: 54,
          height: 54,
          display: "grid",
          placeItems: "center",
          border: "1px solid #cfcfc8",
          borderRadius: "50%",
          background: "white",
          fontWeight: 900,
          fontSize: 20,
        }}>N</div>
        <div style={{ display: "grid", gap: 4 }}>
          <strong style={{ fontSize: 18 }}>Loading Nexus…</strong>
          <span style={{ color: "#696963", fontSize: 13 }}>Opening the right campus workspace.</span>
        </div>
      </div>
    </main>
  );
}
