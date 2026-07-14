import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ガチャドコヤ",
  description: "欲しいガチャの目撃情報を探して共有できるWebアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
