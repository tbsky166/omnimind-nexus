"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const CONSENT_COOKIE = "cookie_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 365 天

function getConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split("; ").some((c) => c.startsWith(`${CONSENT_COOKIE}=true`));
}

function setConsentCookie() {
  document.cookie = `${CONSENT_COOKIE}=true; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 延迟检查，确保 document 可用
    const timer = setTimeout(() => {
      if (!getConsent()) {
        setShow(true);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const handleAccept = useCallback(() => {
    setConsentCookie();
    setShow(false);
  }, []);

  const handleDecline = useCallback(() => {
    // 拒绝时不写任何 Cookie，下次访问还会弹窗询问
    setShow(false);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: "rgba(15, 15, 15, 0.6)" }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-white border-2 border-[#0f0f0f] max-w-[420px] w-[calc(100%-2rem)] mx-4"
          >
            {/* 头部 */}
            <div className="border-b-2 border-[#0f0f0f] px-5 py-3 flex items-center gap-2">
              <span className="text-lg">🍪</span>
              <span className="pixel-text text-xs font-bold text-ink uppercase tracking-[0.12em]">
                Cookie 声明
              </span>
            </div>

            {/* 内容 */}
            <div className="p-5">
              <div className="space-y-3 mb-5">
                <p className="pixel-text text-xs text-ink/70 leading-relaxed">
                  本网站使用 <strong>必要的 Cookie</strong> 来维持您的登录会话和用户数据隔离。
                </p>

                <div className="border-2 border-[#e5e5e5] p-3">
                  <p className="pixel-text text-[10px] text-ink/50 uppercase tracking-[0.1em] mb-2">
                    我们使用的 Cookie 包括：
                  </p>
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-ink/40 mt-0.5">▸</span>
                      <span className="pixel-text text-[10px] text-ink/60">
                        <strong>omnimind_token</strong> — 加密的登录令牌（HttpOnly，不可被 JS 读取），用于识别您的身份
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-ink/40 mt-0.5">▸</span>
                      <span className="pixel-text text-[10px] text-ink/60">
                        <strong>cookie_consent</strong> — 记录您对本声明的同意状态
                      </span>
                    </li>
                  </ul>
                </div>

                <p className="pixel-text text-[10px] text-ink/40 leading-relaxed">
                  我们不使用任何追踪型、广告型或第三方 Cookie。点击「同意」即表示您允许我们设置上述必要的功能型 Cookie。
                </p>
              </div>

              {/* 按钮 */}
              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  className="flex-1 btn-pixel text-[11px]"
                >
                  拒绝
                </button>
                <button
                  onClick={handleAccept}
                  className="flex-1 btn-pixel-dark text-[11px]"
                >
                  同意
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}