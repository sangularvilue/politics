import type { Metadata } from "next";
import {
  Fraunces, Manrope, JetBrains_Mono,
  EB_Garamond, Crimson_Pro, Libre_Baskerville, Lora, Source_Serif_4,
} from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { PrefsProvider } from "@/components/PrefsProvider";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-serif", axes: ["opsz", "SOFT", "WONK"], display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

// Reading fonts (applied to prose via --reading-font)
const garamond = EB_Garamond({ subsets: ["latin"], variable: "--font-garamond", style: ["normal", "italic"], display: "swap" });
const crimson = Crimson_Pro({ subsets: ["latin"], variable: "--font-crimson", style: ["normal", "italic"], display: "swap" });
const baskerville = Libre_Baskerville({ subsets: ["latin"], variable: "--font-baskerville", weight: ["400", "700"], display: "swap" });
const lora = Lora({ subsets: ["latin"], variable: "--font-lora", style: ["normal", "italic"], display: "swap" });
const source = Source_Serif_4({ subsets: ["latin"], variable: "--font-source", style: ["normal", "italic"], display: "swap" });

export const metadata: Metadata = {
  title: "Aristotle's Politics",
  description: "The complete text of Aristotle's Politics in Benjamin Jowett's translation.",
};

const BOOT = `(function(){try{
  var d=document.documentElement, P={};
  try{P=JSON.parse(localStorage.getItem('politics-reading-prefs'))||{}}catch(e){}
  d.dataset.theme=P.theme||'ink';
  d.dataset.para=P.paraStyle||'numbered';
  d.dataset.progressbar=(P.progressBar===false)?'off':'on';
  var F={garamond:'var(--font-garamond)',crimson:'var(--font-crimson)',baskerville:'var(--font-baskerville)',lora:'var(--font-lora)',source:'var(--font-source)'};
  d.style.setProperty('--reading-font',(F[P.font]||F.garamond)+', Georgia, serif');
  d.style.setProperty('--reading-size',(P.fontSize||19)+'px');
  d.style.setProperty('--reading-leading',String(P.lineHeight||1.78));
  d.style.setProperty('--reading-measure',({narrow:'52ch',medium:'66ch',wide:'84ch'})[P.measureWidth||'medium']);
}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const fontVars = [fraunces, manrope, mono, garamond, crimson, baskerville, lora, source].map((f) => f.variable).join(" ");
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: BOOT }} /></head>
      <body className={fontVars}>
        <PrefsProvider>
          <SiteHeader />
          <main>{children}</main>
        </PrefsProvider>
      </body>
    </html>
  );
}
