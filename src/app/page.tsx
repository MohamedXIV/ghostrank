const boundaries = [
  "Simulation Core",
  "Next.js UI",
  "Phaser Room",
  "TinyBase Projection",
  "SQLite Persistence",
];

export default function Home() {
  return (
    <main className="foundation-shell">
      <section className="foundation-panel">
        <p className="eyebrow">GHOSTRANK // FOUNDATION</p>
        <h1>Production architecture online.</h1>
        <p className="lede">
          Rank is reputation, not power. Every consequential action will
          pass through the same deterministic simulation command layer.
        </p>

        <div className="boundary-grid" aria-label="Architecture boundaries">
          {boundaries.map((boundary) => (
            <div className="boundary-card" key={boundary}>
              {boundary}
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
