import type { Metadata, Viewport } from "next";
import "@genlayer/transaction-kit-react/styles.css";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  metadataBase: new URL("https://quake-sla.pages.dev"),
  title: "QuakeSLA — Verifiable Seismic Service Credits",
  description: "USGS-backed earthquake SLA authorization validated by GenLayer consensus.",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/quake-sla-logo.png", type: "image/png" },
    ],
  },
  openGraph: {
    images: [{ url: "/quake-sla-logo.png", width: 1254, height: 1254, alt: "QuakeSLA logo" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#07111f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
