import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "@/components/game/desktop/desktop-shell.css";

export const metadata: Metadata = {
  title: "Ghostrank",
  description: "Hardcore hacker-life simulation",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
