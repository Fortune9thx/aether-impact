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
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium text-text-primary">
          {label}
        </label>
        {hint && (
          <p className="mt-1 text-sm text-text-secondary">{hint}</p>
        )}
      </div>
      {children}
    </div>
  );
}
