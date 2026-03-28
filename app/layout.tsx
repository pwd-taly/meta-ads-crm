import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { initializeJobScheduler } from "@/lib/jobs/schedule-jobs";

const inter = Inter({ subsets: ["latin"] });

// Initialize job scheduler on server startup
if (typeof window === "undefined") {
  initializeJobScheduler();
}

export const metadata: Metadata = {
  title: "Meta Ads CRM",
  description: "CRM dedicated to Meta Ads lead management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
