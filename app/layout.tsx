import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Commit Agent",
  description: "Generate commit messages from git diffs using AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
