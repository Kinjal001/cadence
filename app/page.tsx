export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-screen bg-stone-50">
      <div className="text-center">
        <h1 className="text-6xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: "var(--font-geist-sans)" }}>
          Cadence
        </h1>
        <p className="mt-3 text-lg text-stone-400 tracking-wide" style={{ fontFamily: "var(--font-geist-sans)" }}>
          keep the rhythm
        </p>
      </div>
    </div>
  );
}
