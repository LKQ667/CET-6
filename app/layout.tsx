import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Noto_Serif_SC } from "next/font/google";

import "./globals.css";

const displayFont = Bebas_Neue({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400"
});

const bodyFont = Noto_Serif_SC({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "600", "700"]
});

export const metadata: Metadata = {
  title: "CET-6 片场计划板",
  description: "六级私人备战网站：跨端同步、双提醒、真题词汇溯源",
  applicationName: "CET-6 片场计划板",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg"
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1115"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className={`${displayFont.variable} ${bodyFont.variable}`}>{children}</body>
    </html>
  );
}

