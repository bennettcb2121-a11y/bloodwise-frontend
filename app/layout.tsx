import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

import { DM_Sans } from "next/font/google";
import { ColorSchemeScript, MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { AuthProvider } from "@/src/contexts/AuthContext";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Clarion Labs",
  description: "Interpret your bloodwork clearly. Optimize your health and save money.",
};

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={dmSans.variable}>
      <head>
        <ColorSchemeScript />
      </head>
      <body className={dmSans.className}>
        <MantineProvider defaultColorScheme="light">
          <Notifications />
          <AuthProvider>
            {children}
          </AuthProvider>
        </MantineProvider>
        <Analytics />
      </body>
    </html>
  );
}