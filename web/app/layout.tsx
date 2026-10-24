import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "COR Outlook — cohort-level organ outlook (demo)",
  description:
    "Demo of cor-outlook-engine: cohort-level organ-parameter outlooks under clinical interventions. Decision support only, not an individual prediction.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
