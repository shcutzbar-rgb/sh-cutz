export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function Flash({ ok, error, denied }: { ok?: string; error?: string; denied?: boolean }) {
  const errorText = error ?? (denied ? "Du saknar behörighet för den sidan." : undefined);
  return (
    <>
      {ok && (
        <p role="status" className="mb-4 rounded-sm border border-accent/40 bg-accent/5 p-3 text-sm text-accent">
          {ok}
        </p>
      )}
      {errorText && (
        <p role="alert" className="mb-4 rounded-sm border border-red-400/40 bg-red-400/5 p-3 text-sm text-red-400">
          {errorText}
        </p>
      )}
    </>
  );
}

export const ui = {
  input: "mt-1 w-full min-h-11 rounded-sm border border-line bg-surface px-3 py-2 text-sm text-foreground focus:border-accent",
  label: "text-sm font-medium",
  primary: "btn btn-primary btn-sm",
  secondary: "btn btn-secondary btn-sm",
  danger: "btn btn-sm border-red-400/50 text-red-400 hover:bg-red-400/10",
  card: "card p-4",
} as const;
