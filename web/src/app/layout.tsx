import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";
import { DateRangeProvider } from "@/lib/DateRangeProvider";
import ModeBanner from "@/components/ui/ModeBanner";
import Navbar from "@/components/ui/Navbar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "NEAR Value Intelligence — LedgerLight",
    template: "%s — LedgerLight",
  },
  description: "Follow the money. Verify the value.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen font-sans">
        <DateRangeProvider>
          <div className="min-h-screen">
            <Navbar />
            <div className="min-h-screen lg:pl-[252px]">
              <ModeBanner mode="live" />
              <main className="mx-auto max-w-content px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pt-8 xl:px-10">
                {children}
              </main>
              <footer className="mx-auto flex max-w-content flex-col gap-2 border-t border-line px-4 py-5 text-[11px] text-ink-faint sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8 xl:px-10">
                <p>LedgerLight · Evidence-first NEAR analytics. Follow the money. Verify the value.</p>
                <div className="flex items-center gap-4">
                  <Link href="/methodology" className="transition-colors hover:text-ink">
                    Metric registry
                  </Link>
                  <Link href="/thesis" className="transition-colors hover:text-ink">
                    Pre-registration
                  </Link>
                </div>
              </footer>
            </div>
          </div>
        </DateRangeProvider>
      </body>
    </html>
  );
}
