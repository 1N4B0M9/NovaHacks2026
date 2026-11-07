import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
export const metadata: Metadata = {
  title: "Mise — Kitchen to supplier",
  description:
    "Review kitchen notes, supplier packs and prices before creating a simulated order.",
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff9f5" },
    { media: "(prefers-color-scheme: dark)", color: "#2a2024" },
  ],
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
