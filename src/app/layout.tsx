import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings";

export const metadata: Metadata = {
  title: "OmniMind Nexus — A2A Multi-Agent Platform",
  description:
    "全能型多智能体协作平台：32 Agent、A2A 互信协议、自我进化。你提需求，它自己组织一个 AI 团队来干。",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <head>
        {/* 鸿蒙字体 / HarmonyOS Sans */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/harmonyos-sans@1.0.1/HarmonyOS_Sans_SC/HarmonyOS_Sans_SC.css"
        />
      </head>
      <body className="antialiased">
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}