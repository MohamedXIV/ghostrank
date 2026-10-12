import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "flexlayout-react/style/combined.css";
import "@/components/game/desktop/desktop-shell.css";
import "@/components/game/desktop/docking-workspace.css";
import "@/presentation/distro-theme-modes.css";
import "@/components/game/market/hardware-catalog.css";
import "@/components/game/market/software-market.css";
import "@/components/game/market/housing-market.css";
import "@/components/game/market/machine-market.css";
import "@/components/game/market/model-market.css";
import "@/components/game/market/authored-tools.css";
import "@/components/game/recon/recon-workstation.css";

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
