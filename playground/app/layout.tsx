import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slashkit playground",
  description:
    "Try the Slashkit editor and renderers. Nothing here talks to a server.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
