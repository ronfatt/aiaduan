import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/app/providers";
import { TopNav } from "@/components/TopNav";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800", "900"] });

export const metadata: Metadata = {
  title: "e-Aduan Tawau AI Demo",
  description: "Demo prototype for municipal complaints triage in Tawau",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="app-shell">
          <Providers>
            <TopNav />
            <main className="main-shell mx-auto w-full max-w-7xl px-4 py-5">{children}</main>
          </Providers>
        </div>
      </body>
    </html>
  );
}
