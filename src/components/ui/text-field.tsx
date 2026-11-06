import { useId, type ComponentProps } from "react";

type TextFieldProps = ComponentProps<"input"> & {
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ label, error, hint, id, ...rest }: TextFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      {hint ? (
        <p id={hintId} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
      <input
        {...rest}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className="border border-border bg-background px-3 py-2 text-base aria-[invalid=true]:border-danger"
      />
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
