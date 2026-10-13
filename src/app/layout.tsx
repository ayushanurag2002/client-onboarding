import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { themeInitScript } from "@/components/layout/theme";
import { AppShell } from "@/components/layout/shell";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Allocations · Client Onboarding", template: "%s · Allocations Onboarding" },
  description: "Internal tool for onboarding fund managers onto Allocations – intake, KYB verification, agreements, setup and launch.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeInitScript }} /></head>
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
