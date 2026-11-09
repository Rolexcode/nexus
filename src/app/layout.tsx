import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: "Nexus — LASU Epe Campus",
  description:
    "Find places, services and trusted campus information at LASU Epe.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}<Analytics /></body>
    </html>
  );
}
