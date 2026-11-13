import type { Metadata } from "next";
import "./globals.css";
import { DateRangeProvider } from "@/lib/DateRangeProvider";
import ModeBanner from "@/components/ui/ModeBanner";

export const metadata: Metadata = {
  title: "NEAR Value Intelligence",
  description: "Follow the money. Verify the value.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen">
        <DateRangeProvider>
          <ModeBanner mode="snapshot" snapshotDate="2026-11-13" />
          <div className="pt-12 pb-8 px-4 md:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </div>
        </DateRangeProvider>
      </body>
    </html>
  );
}
