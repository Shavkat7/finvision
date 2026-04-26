import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SQB OvozAI · Sanoat Qurilish Bank ovozli yordamchisi",
  description:
    "Real-time Uzbek voice assistant for Sanoat Qurilish Bank (SQB). Speak naturally, get instant grounded answers in pure O'zbek tili.",
  applicationName: "SQB OvozAI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SQB OvozAI",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#02060a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" className={`${inter.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
