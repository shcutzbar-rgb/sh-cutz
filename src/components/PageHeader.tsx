export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: string }) {
  return (
    <header className="border-b border-line pb-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="display mt-4 text-5xl sm:text-6xl">{title}</h1>
      {intro && <p className="mt-4 max-w-xl leading-relaxed text-foreground/70">{intro}</p>}
    </header>
  );
}
