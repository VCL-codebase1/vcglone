import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  applicationName: "vcglOne",
  title: "vcglOne",
  description: "Internal workforce operations platform for attendance, leave, employee records, reporting, and audit logs.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/brand/vcgl-logo.jpg", type: "image/jpeg" }
    ],
    apple: [{ url: "/brand/vcgl-logo.jpg" }]
  },
  appleWebApp: {
    capable: true,
    title: "vcglOne",
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": "#102B74"
  }
};

export const viewport: Viewport = {
  themeColor: "#102B74",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}




