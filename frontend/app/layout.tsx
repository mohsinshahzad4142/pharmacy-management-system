import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pharmacy Management System",
  description: "Manage medicines, sales, purchases, and suppliers efficiently.",
  manifest: "/manifest.json", // <-- Yeh line PWA manifest ke liye add ki gayi hai
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}