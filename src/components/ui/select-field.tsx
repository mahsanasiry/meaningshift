import { useId, type ComponentProps } from "react";

type SelectFieldProps = ComponentProps<"select"> & {
  label: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  error?: string;
};

export function SelectField({ label, options, error, id, ...rest }: SelectFieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <select
        {...rest}
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="border border-border bg-background px-3 py-2 text-base aria-[invalid=true]:border-danger"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
