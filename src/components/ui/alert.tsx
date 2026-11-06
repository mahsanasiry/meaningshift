import type { ReactNode } from "react";

type AlertTone = "error" | "success";

const toneClasses: Record<AlertTone, string> = {
  error: "border-danger bg-danger-surface text-danger",
  success: "border-success bg-success-surface text-success",
};

const toneLabels: Record<AlertTone, string> = {
  error: "Error.",
  success: "Done.",
};

export function Alert({ tone, children }: Readonly<{ tone: AlertTone; children: ReactNode }>) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`border-s-4 p-3 text-sm ${toneClasses[tone]}`}
    >
      <strong className="font-semibold">{toneLabels[tone]}</strong> {children}
    </div>
  );
}
