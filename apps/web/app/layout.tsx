import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aqyl MVP",
  description: "Teacher dashboard MVP for lesson planning and analytics.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
