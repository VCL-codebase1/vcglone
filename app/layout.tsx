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
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

const themeScript = `
(() => {
  try {
    const savedTheme = localStorage.getItem("vcgl-theme");
    const theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  } catch (_) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}




