import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "飞机日报编辑器",
  description: "飞机日报在线编辑与导出工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
