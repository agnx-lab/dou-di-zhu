import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "幻局｜可解释斗地主辅助智能体",
  description: "会读懂牌势、比较合法走法、解释推荐依据并持续成长的斗地主 AI 辅助智能体",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
