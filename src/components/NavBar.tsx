"use client";
// ═══════════════════════════════════════════════════════════════
// 共享导航栏 — 含登录/用户菜单
// Shared NavBar — with login/user menu
// ═══════════════════════════════════════════════════════════════

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const NAV_LINKS = [
  { href: "/", label: "对话" },
  { href: "/dashboard", label: "仪表盘" },
  { href: "/debate", label: "辩论赛" },
  { href: "/cafe", label: "咖啡馆", className: "text-amber-600 hover:text-amber-700" },
  { href: "/canvas", label: "画布", className: "text-emerald-600 hover:text-emerald-700" },
  { href: "/topology", label: "拓扑图" },
  { href: "/knowledge-graph", label: "知识图谱", className: "text-blue-600 hover:text-blue-700" },
  { href: "/kb", label: "知识库" },
  { href: "/workspace", label: "工作区" },
  { href: "/settings", label: "设置" },
  { href: "/agents", label: "注册表 →", className: "font-semibold text-ink/70" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单 / Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push("/login");
  };

  return (
    <nav className="nav-bar">
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between">
        {/* 左侧 Logo + 导航 / Left: Logo + Nav */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <div className="w-6 h-6 bg-ink flex items-center justify-center">
              <span className="text-white text-[10px] font-bold tracking-tighter">OM</span>
            </div>
            <span className="pixel-text text-[10px] text-ink/50 uppercase tracking-[0.12em] hidden sm:inline">
              OmniMind Nexus
            </span>
          </Link>
        </div>

        {/* 中间导航链接 / Center: Nav links */}
        <div className="flex items-center gap-1 flex-wrap">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`nav-link ${link.className || ""} ${
                pathname === link.href ? "nav-link-active" : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* 右侧用户区 / Right: User area */}
        <div className="flex items-center gap-2 ml-3" ref={menuRef}>
          {loading ? (
            <div className="w-5 h-5 border border-ink/20 border-t-ink animate-spin" />
          ) : user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 px-2 py-1 border border-transparent hover:border-ink/20 transition-colors"
              >
                <span className="pixel-text text-[10px] text-ink/70">{user.username}</span>
                <motion.span
                  animate={{ rotate: menuOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-[8px] text-ink/40"
                >
                  ▼
                </motion.span>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scaleY: 0.8 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -4, scaleY: 0.8 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-1 w-40 border-2 border-ink bg-white origin-top"
                  >
                    <div className="px-3 py-2 border-b border-ink/10">
                      <p className="pixel-text text-[10px] text-ink font-bold">{user.username}</p>
                      <p className="pixel-text text-[8px] text-muted truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 pixel-text text-[10px] text-ink/70 hover:bg-ink/5 hover:text-ink transition-colors"
                    >
                      注销
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              href="/login"
              className="pixel-text text-[10px] text-ink/70 hover:text-ink border border-ink/20 px-2 py-0.5 hover:border-ink transition-colors no-underline"
            >
              登录
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}