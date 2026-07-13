export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="eyebrow">404</p>
      <h1 className="font-serif text-3xl text-[var(--color-ink)]">Page not found</h1>
      <a href="/" className="text-sm underline">
        Back to Hakeems
      </a>
    </main>
  );
}
