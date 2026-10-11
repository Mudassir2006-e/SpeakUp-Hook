import type { Metadata } from "next";
import { Hanken_Grotesk, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeContext";
import CmsPublishedHydrator from "@/components/CmsPublishedHydrator";
import ChatbotWidget from "@/components/ChatbotWidget";

const hankenGrotesk = Hanken_Grotesk({
  variable: "--font-hanken-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SpeakUp — Master the Art of Executive Communication",
  description:
    "Elevate your executive presence through bespoke linguistic training designed for the world's most discerning professionals.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${hankenGrotesk.variable} ${sourceSerif4.variable} scroll-smooth`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="antialiased selection:bg-[#d4af37]/20 selection:text-[#1a1a1a] dark:selection:text-[#f7f0e8]">
        <ThemeProvider>
          <CmsPublishedHydrator />
          {children}
          <ChatbotWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
