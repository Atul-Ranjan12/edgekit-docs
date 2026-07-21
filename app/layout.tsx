import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { TopNav } from "@/components/TopNav";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const DESC =
  "edgekit is a systematic-trading research toolkit: load, backtest, and prove-or-kill an edge, then size it and ship it to a live bot.";
// Deployed site URL — used to make the OpenGraph/Twitter image an absolute URL so
// LinkedIn/X can fetch it. Defaults to the live domain; override via NEXT_PUBLIC_SITE_URL.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://edgekit-docs.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "edgekit — prove the edge",
    template: "%s · edgekit docs",
  },
  description: DESC,
  keywords: ["quant", "backtesting", "trading", "permutation test", "validation", "python"],
  openGraph: {
    title: "edgekit — prove the edge",
    description: DESC,
    siteName: "edgekit",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "edgekit — prove the edge",
    description: DESC,
  },
};

// runs before paint — no flash of the wrong theme
const themeScript = `try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme:dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full antialiased">
        <TopNav />
        {children}
      </body>
    </html>
  );
}
