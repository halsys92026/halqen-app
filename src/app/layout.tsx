import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Halqen — Identity. Verified. Trusted.",
  description: "A code-gated digital identity card with verified credentials.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
