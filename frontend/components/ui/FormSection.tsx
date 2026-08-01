export function FormSection({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
          {label}
        </label>
        {hint && (
          <p className="mt-2 text-sm text-text-secondary">{hint}</p>
        )}
      </div>
      {children}
    </div>
  );
}
