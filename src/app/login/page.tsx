"use client";
// ═══════════════════════════════════════════════════════════════
// 登录页面 — 像素极简主义 + 丝滑动画
// Login Page — Pixel Minimalism + Smooth Animations
// ═══════════════════════════════════════════════════════════════

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";

// ── Cookie 同意提示条 / Cookie consent notice banner ──
function ConsentNotice() {
  const searchParams = useSearchParams();
  const needConsent = searchParams.get("needConsent") === "1";

  if (!needConsent) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="border-b-2 border-[#0f0f0f] bg-amber-50 px-4 py-3"
    >
      <div className="flex items-start gap-2">
        <span className="text-sm mt-0.5">🍪</span>
        <div>
          <p className="pixel-text text-[10px] text-amber-900 font-bold mb-0.5">
            需要 Cookie 同意
          </p>
          <p className="pixel-text text-[9px] text-amber-700/80 leading-relaxed">
            本网站使用必要的 Cookie 来维持登录会话。请先在弹出的 Cookie 声明中点击「同意」，然后即可正常登录。
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "login") {
        const r = await login(email, password);
        if (r.ok) { router.push("/"); } else { setError(r.error || "登录失败"); shakeError(); }
      } else {
        const r = await register(username, email, password);
        if (r.ok) { router.push("/"); } else { setError(r.error || "注册失败"); shakeError(); }
      }
    } catch {
      setError("网络错误，请重试");
      shakeError();
    } finally {
      setLoading(false);
    }
  }, [mode, email, password, username, login, register, router]);

  const shakeError = () => {
    // 触发错误抖动 / Trigger error shake
    const el = document.getElementById("auth-form");
    if (el) {
      el.style.animation = "none";
      el.offsetHeight; // reflow
      el.style.animation = "shake 0.4s ease";
    }
  };

  return (
    <main className="dot-grid min-h-screen flex items-center justify-center p-4">
      {/* 背景装饰 / Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div
          className="absolute top-1/4 left-1/4 w-[1px] h-32 bg-[#0f0f0f]/10"
          animate={{ height: [32, 128, 32], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/3 w-[1px] h-24 bg-[#0f0f0f]/10"
          animate={{ height: [24, 96, 24], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        <motion.div
          className="absolute top-1/2 right-1/4 w-1 h-1 bg-[#0f0f0f]/20"
          animate={{ scale: [1, 3, 1], opacity: [0.2, 0.5, 0.2] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        />
      </div>

      {/* 主卡片 / Main card */}
      <motion.div
        id="auth-form"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-[380px] relative"
      >
        {/* Logo */}
        <motion.div
          className="flex items-center justify-center gap-3 mb-8"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
        >
          <div className="w-8 h-8 border-2 border-[#0f0f0f] bg-white flex items-center justify-center">
            <span className="text-[10px] font-bold tracking-tighter text-[#0f0f0f]">OM</span>
          </div>
          <span className="pixel-text text-[11px] font-bold text-[#0f0f0f] tracking-wider">OmniMind Nexus</span>
        </motion.div>

        {/* 表单卡片 / Form card */}
        <div className="border-2 border-[#0f0f0f] bg-white">
          {/* Cookie 同意提示 / Cookie consent notice */}
          <Suspense fallback={null}>
            <ConsentNotice />
          </Suspense>

          {/* 标签切换 / Tab switcher */}
          <div className="flex border-b-2 border-[#0f0f0f]">
            <motion.button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 py-3 pixel-text text-[11px] font-bold transition-colors relative ${
                mode === "login" ? "text-[#0f0f0f]" : "text-[#b0b0b0]"
              }`}
            >
              登录
              {mode === "login" && (
                <motion.div
                  layoutId="auth-tab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0f0f0f]"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
            <motion.button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 py-3 pixel-text text-[11px] font-bold transition-colors relative ${
                mode === "register" ? "text-[#0f0f0f]" : "text-[#b0b0b0]"
              }`}
            >
              注册
              {mode === "register" && (
                <motion.div
                  layoutId="auth-tab"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0f0f0f]"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          </div>

          {/* 表单 / Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={{ opacity: 0, x: mode === "login" ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: mode === "login" ? 20 : -20 }}
                transition={{ duration: 0.25 }}
                className="space-y-4"
              >
                {mode === "register" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className="block pixel-text text-[9px] text-[#8a8a8a] mb-1.5">用户名</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="输入用户名（2-30 字符）"
                      className="w-full px-3 py-2.5 border-2 border-[#0f0f0f] bg-white pixel-text text-[11px] text-[#0f0f0f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#0f0f0f] focus:bg-[#fafafa] transition-colors"
                      required
                      minLength={2}
                      maxLength={30}
                    />
                  </motion.div>
                )}

                <div>
                  <label className="block pixel-text text-[9px] text-[#8a8a8a] mb-1.5">邮箱</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2.5 border-2 border-[#0f0f0f] bg-white pixel-text text-[11px] text-[#0f0f0f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#0f0f0f] focus:bg-[#fafafa] transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block pixel-text text-[9px] text-[#8a8a8a] mb-1.5">密码</label>
                  <div className="relative">
                    <input
                      type={passwordVisible ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === "register" ? "至少 6 个字符" : "输入密码"}
                      className="w-full px-3 py-2.5 pr-10 border-2 border-[#0f0f0f] bg-white pixel-text text-[11px] text-[#0f0f0f] placeholder:text-[#b0b0b0] focus:outline-none focus:border-[#0f0f0f] focus:bg-[#fafafa] transition-colors"
                      required
                      minLength={mode === "register" ? 6 : 1}
                    />
                    <button
                      type="button"
                      onClick={() => setPasswordVisible(!passwordVisible)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 pixel-text text-[10px] text-[#b0b0b0] hover:text-[#0f0f0f] transition-colors"
                    >
                      {passwordVisible ? "隐" : "显"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* 错误提示 / Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: "auto" }}
                  exit={{ opacity: 0, y: -5, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-3 py-2 border-2 border-red-500 bg-red-50"
                >
                  <p className="pixel-text text-[10px] text-red-600">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* 提交按钮 / Submit button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 border-2 border-[#0f0f0f] bg-[#0f0f0f] text-white pixel-text text-[11px] font-bold tracking-wider hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.span
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-2"
                  >
                    <motion.span
                      className="inline-block w-1.5 h-1.5 bg-white"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                    <motion.span
                      className="inline-block w-1.5 h-1.5 bg-white"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.span
                      className="inline-block w-1.5 h-1.5 bg-white"
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: 0.4 }}
                    />
                  </motion.span>
                ) : (
                  <motion.span
                    key="text"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {mode === "login" ? "登 录" : "注 册"}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </form>

          {/* 底部提示 / Bottom hint */}
          <div className="px-6 pb-5 text-center">
            <p className="pixel-text text-[9px] text-[#b0b0b0]">
              {mode === "login" ? "没有账号？" : "已有账号？"}
              <button
                onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
                className="ml-1 text-[#0f0f0f] font-bold hover:underline"
              >
                {mode === "login" ? "立即注册" : "去登录"}
              </button>
            </p>
          </div>
        </div>

        {/* 底部装饰 / Bottom decoration */}
        <motion.p
          className="text-center mt-6 pixel-text text-[8px] text-[#b0b0b0]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          Pixel Minimalism · Every Agent
        </motion.p>
      </motion.div>
    </main>
  );
}