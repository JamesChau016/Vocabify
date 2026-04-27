import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vocabify",
  description: "Build and manage your vocabulary lists",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen w-full bg-cream text-ink font-sans">
        <AuthProvider>
          <div className="w-full max-w-4xl mx-auto">{children}</div>
        </AuthProvider>
      </body>
    </html>
  );
}
