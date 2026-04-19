import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

import { Plus_Jakarta_Sans, Source_Sans_3, Libre_Baskerville } from "next/font/google";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { ThemeProvider } from "@/src/contexts/ThemeContext";
import { MantineThemeWrapper } from "@/src/components/MantineThemeWrapper";
import { ThemeIntroPopup } from "@/src/components/ThemeIntroPopup";
import { ClarionAssistant } from "@/src/components/ClarionAssistant";
import { SupportAssistant } from "@/src/components/SupportAssistant";
import Link from "next/link";
import { getSupportMailtoHref } from "@/src/lib/supportContact";
import { Analytics } from "@vercel/analytics/next";
import { themeScript } from "./theme-script";
import type { Viewport } from "next";

const TAGLINE = "The bloodwork coach that explains your numbers and your next steps.";

export const metadata = {
  title: "Clarion Labs",
  description: TAGLINE,
};

/** Device-width scaling + safe-area for notched phones; prevents odd mobile zoom/layout. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-source-sans",
});

const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-baskerville",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${plusJakarta.variable} ${sourceSans.variable} ${libreBaskerville.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={sourceSans.className}>
        <ThemeProvider>
          <MantineThemeWrapper>
            <AuthProvider>
              {children}
              <ThemeIntroPopup />
              <SupportAssistant />
              <ClarionAssistant />
              <footer className="clarion-global-footer" role="contentinfo">
                <p className="clarion-footer-disclaimer">Clarion is for education and decision support only. Not a substitute for professional medical advice.</p>
                <Link href="/faq">FAQ</Link>
                {" · "}
                <a href={getSupportMailtoHref()}>Support</a>
                {" · "}
                <Link href="/terms">Terms &amp; Disclaimer</Link>
                {" · "}
                <Link href="/legal/privacy">Privacy</Link>
              </footer>
            </AuthProvider>
          </MantineThemeWrapper>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}