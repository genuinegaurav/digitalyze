import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Data Alchemist - AI Resource Allocation Configurator",
  description: "Transform your messy spreadsheets into clean, validated data with AI-powered insights and business rules.",
  keywords: "data validation, resource allocation, AI, spreadsheet, business rules",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 min-h-screen`}>
        <nav className="sticky top-0 z-30 bg-white shadow-md border-b border-gray-200 h-16 flex items-center px-6">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="#fff"/></svg>
            </span>
            <span className="font-bold text-lg text-black tracking-tight">Data Alchemist</span>
          </div>
          <div className="ml-auto text-xs text-black font-bold font-mono">AI Resource Allocation Configurator</div>
        </nav>
        <main>{children}</main>
        <footer className="w-full text-center py-4 text-xs text-black font-bold border-t border-gray-200 bg-white mt-12">
          Made with <span className="text-pink-500">♥</span> by Data Alchemist | <a href="https://github.com/your-repo" className="underline hover:text-blue-600">GitHub</a>
        </footer>
      </body>
    </html>
  );
}
