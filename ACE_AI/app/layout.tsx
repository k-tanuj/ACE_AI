// app/layout.tsx — Root layout

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { SessionProvider } from "@/components/providers/session-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "ACE AI — Student Opportunity Ecosystem", template: "%s | ACE AI" },
  description: "AI-powered student opportunity discovery, personalization, and engagement platform. Find hackathons, internships, workshops, and more — tailored for you.",
  keywords: ["student opportunities", "hackathons", "internships", "AI recommendations", "AllCollegeEvent"],
  authors: [{ name: "ALGORHYTHM Team" }],
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  openGraph: {
    type: "website",
    title: "ACE AI — Student Opportunity Ecosystem",
    description: "Discover better opportunities. Powered by AI.",
    siteName: "ACE AI",
    images: [{ url: "/ace-ai-logo.png", width: 800, height: 300, alt: "ACE AI Logo" }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-background text-text-primary antialiased">
        <SessionProvider>
          {children}
          <Toaster />
        </SessionProvider>
      </body>
    </html>
  );
}
