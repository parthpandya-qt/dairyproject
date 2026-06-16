import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css"; // Imports global styles across your entire project

// Enforce a professional font system across all components
const inter = Inter({ subsets: ["latin"] });

// Standard metadata configuration for SEO and Browser Tabs
export const metadata: Metadata = {
  title: "DairyFlow Pro - Farm Management System",
  description: "Enterprise management ledger for tracking customers and daily milk distribution logs.",
};

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-slate-50 text-slate-900 min-h-screen antialiased`}>
        {/* Everything renders inside here dynamically */}
        {children}
      </body>
    </html>
  );
}