"use client";
// ═══════════════════════════════════════════════════════════════
// 全局 Provider 包装 — Auth + Settings + NavBar
// Global Provider Wrapper — Auth + Settings + NavBar
// ═══════════════════════════════════════════════════════════════

import { type ReactNode } from "react";
import { SettingsProvider } from "@/lib/settings";
import { AuthProvider } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import NavBar from "@/components/NavBar";
import CookieConsent from "@/components/CookieConsent";

function AppContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login";

  return (
    <>
      {!isAuthPage && <NavBar />}
      {children}
      <CookieConsent />
    </>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SettingsProvider>
      <AuthProvider>
        <AppContent>{children}</AppContent>
      </AuthProvider>
    </SettingsProvider>
  );
}