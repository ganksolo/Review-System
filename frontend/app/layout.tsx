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
      <body>
        <QueryProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="ml-60 flex-1 p-6">{children}</main>
          </div>
        </QueryProvider>
      </body>
    </html>
  );
}
