import type { Metadata } from "next";
import type { ReactNode } from "react";
import { QueryProvider } from "@/lib/query/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "MeaningShift",
    template: "%s · MeaningShift",
  },
  description:
    "A research tool for tracking how the meaning of a claim changes when it is translated or republished.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" dir="ltr">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
