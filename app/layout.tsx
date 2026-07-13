import type { Metadata } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "ガチャドコヤ｜欲しいガチャの目撃マップ",
  description: "ガチャガチャの最新目撃情報をみんなで伝え残す地図。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
