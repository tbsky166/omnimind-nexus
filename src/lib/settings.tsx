"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { getCurrentUserId } from "@/lib/pouch";

// ── 设置类型 / Settings types ──
export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  // 嵌入模型独立配置 / Separate embedding model config
  embeddingApiKey: string;
  embeddingBaseUrl: string;
  embeddingModel: string;
  // Tavily 联网搜索 / Tavily web search
  tavilyApiKey: string;
  // 暗色模式 / Dark mode
  darkMode: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
  embeddingApiKey: "",
  embeddingBaseUrl: "https://api.openai.com/v1",
  embeddingModel: "text-embedding-3-small",
  tavilyApiKey: "",
  darkMode: false,
};

const STORAGE_KEY_PREFIX = "omnimind-settings";

// 获取当前用户的存储 key / Get storage key for current user
function getStorageKey(): string {
  const uid = getCurrentUserId();
  return uid ? `${STORAGE_KEY_PREFIX}-${uid}` : STORAGE_KEY_PREFIX;
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
  isConfigured: boolean;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
  isConfigured: false,
});

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const lastUserId = useRef<string | null>(null);

  // 加载设置 / Load settings
  const loadSettings = useCallback(() => {
    const key = getStorageKey();
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      } else {
        setSettings({ ...DEFAULT_SETTINGS });
      }
    } catch {
      setSettings({ ...DEFAULT_SETTINGS });
    }
    setLoaded(true);
  }, []);

  // 挂载时加载 / Load on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 监听用户切换：登录/注销时重新加载对应设置 / Watch user switch: reload settings on login/logout
  useEffect(() => {
    const interval = setInterval(() => {
      const currentId = getCurrentUserId();
      if (currentId !== lastUserId.current) {
        lastUserId.current = currentId;
        loadSettings();
      }
    }, 500);
    return () => clearInterval(interval);
  }, [loadSettings]);

  // 保存设置 / Save settings
  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        const key = getStorageKey();
        localStorage.setItem(key, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      const key = getStorageKey();
      localStorage.removeItem(key);
    } catch {}
  }, []);

  const isConfigured = loaded && settings.apiKey.length > 0;

  // ── 暗色模式：切换 body 上的 data-theme 属性 / Dark mode: toggle data-theme on body ──
  useEffect(() => {
    if (settings.darkMode) {
      document.documentElement.setAttribute("data-theme", "dark");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
  }, [settings.darkMode]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, isConfigured }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}