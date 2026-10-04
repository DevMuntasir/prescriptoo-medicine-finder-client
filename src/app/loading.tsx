export default function Loading() {
  return (
    <main className="page" aria-busy="true">
      <p role="status" className="muted">
        Loading preview…
      </p>
      <div className="medicine-grid" style={{ marginTop: 25 }}>
        {[1, 2, 3].map((i) => (
          <div className="skeleton-card" key={i} />
        ))}
      </div>
    </main>
  );
}
