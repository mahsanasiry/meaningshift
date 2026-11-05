import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

type ButtonProps = ComponentProps<"button"> & {
  loading?: boolean;
  variant?: "primary" | "secondary";
};

const variantClasses = {
  primary: "bg-accent text-accent-foreground",
  secondary: "border border-border bg-background text-foreground",
};

export function Button({
  loading = false,
  variant = "primary",
  disabled,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex items-center justify-center px-4 py-2 text-sm font-medium",
        "disabled:cursor-not-allowed disabled:opacity-60",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
