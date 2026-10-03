export function PagePlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-4 text-foreground/70">{description}</p>
    </section>
  );
}
