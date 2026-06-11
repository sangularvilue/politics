import type { Metadata } from "next";
import { Fraunces, Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  axes: ["opsz", "SOFT", "WONK"],
  display: "swap",
});
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Politics — Aristotle, tr. Jowett",
  description:
    "The complete text of Aristotle's Politics in Benjamin Jowett's translation — read, highlight, and discuss, passage by passage.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // set theme before paint to avoid flash
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pol-theme')||'ink';document.documentElement.dataset.theme=t;}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${fraunces.variable} ${manrope.variable} ${mono.variable}`}>
        <SiteHeader />
        <main>{children}</main>
      </body>
    </html>
  );
}
