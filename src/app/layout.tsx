import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI将棋",
  description: "LLMと対局できる将棋アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
