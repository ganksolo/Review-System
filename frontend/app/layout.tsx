import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import QueryProvider from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "交易复盘系统",
  description: "基于输入-计算-反馈范式的智能交易复盘平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body>
        <QueryProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 p-4 pt-16 md:ml-60 md:p-6 md:pt-6">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
