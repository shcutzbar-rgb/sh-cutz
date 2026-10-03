export function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function Flash({ ok, error, denied }: { ok?: string; error?: string; denied?: boolean }) {
  const errorText = error ?? (denied ? "Du saknar behörighet för den sidan." : undefined);
  return (
    <>
      {ok && (
        <p role="status" className="mb-4 rounded-lg border border-accent/40 p-3 text-sm text-accent">
          {ok}
        </p>
      )}
      {errorText && (
        <p role="alert" className="mb-4 rounded-lg border border-red-400/40 p-3 text-sm text-red-400">
          {errorText}
        </p>
      )}
    </>
  );
}

export const ui = {
  input: "mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-foreground",
  label: "text-sm font-medium",
  primary:
    "rounded-full bg-accent px-4 py-2 text-sm font-semibold text-black hover:bg-accent/90 disabled:opacity-50",
  secondary: "rounded-full border border-white/20 px-4 py-2 text-sm font-medium hover:bg-white/10",
  danger: "rounded-full border border-red-400/50 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-400/10",
  card: "rounded-xl border border-white/10 p-4",
} as const;
