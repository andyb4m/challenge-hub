import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/auth-context";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const description =
  "Compete in fitness challenges with friends, powered by Strava";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"
  ),
  title: "Challenge Hub",
  description,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Challenge Hub",
  },
  openGraph: {
    title: "Challenge Hub",
    description,
    siteName: "Challenge Hub",
    type: "website",
    images: ["/icons/icon-512.png"],
  },
  twitter: {
    card: "summary",
    title: "Challenge Hub",
    description,
  },
};

export const viewport: Viewport = {
  themeColor: "#0f0f23",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Inter via runtime CDN link (not next/font) so builds never depend
            on fetching Google Fonts — see legacy design handoff */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        {/* eslint-disable-next-line @next/next/no-page-custom-font -- rule
            targets the Pages Router; the App Router root layout applies
            this link to every page */}
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <AuthProvider>
          <ServiceWorkerRegister />
          <SiteHeader />
          <div className="flex-1">{children}</div>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
