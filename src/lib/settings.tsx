"use client";

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// ── 设置类型 / Settings types ──
export interface AppSettings {
  apiKey: string;
  baseUrl: string;
  model: string;
  temperature: number;
  maxTokens: number;
  enableSwarm: boolean;
  enableEvolution: boolean;
  enableKnowledgeGraph: boolean;
  enableMetacognition: boolean;
  // 嵌入模型独立配置 / Separate embedding model config
  embeddingApiKey: string;
  embeddingBaseUrl: string;
  embeddingModel: string;
  // Tavily 联网搜索 / Tavily web search
  tavilyApiKey: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  model: "gpt-4o",
  temperature: 0.7,
  maxTokens: 4096,
  enableSwarm: true,
  enableEvolution: false,
  enableKnowledgeGraph: true,
  enableMetacognition: true,
  embeddingApiKey: "",
  embeddingBaseUrl: "https://api.openai.com/v1",
  embeddingModel: "text-embedding-3-small",
  tavilyApiKey: "",
};

const STORAGE_KEY = "omnimind-settings";

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

  // 从 localStorage 加载 / Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch {}
    setLoaded(true);
  }, []);

  // 保存到 localStorage / Save to localStorage
  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const isConfigured = loaded && settings.apiKey.length > 0;

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, isConfigured }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
