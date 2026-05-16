"use client";
import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { api } from "../lib/api";

export type AiUsageData = { count: number; limit: number; remaining: number; percentage: number };

type AiUsageContextType = {
  usage: AiUsageData | null;
  isLimited: boolean;
  showWarning: boolean;
  warningMessage: string;
  triggerWarning: (msg: string) => void;
  dismissWarning: () => void;
  refresh: () => void;
};

const AiUsageContext = createContext<AiUsageContextType>({
  usage: null,
  isLimited: false,
  showWarning: false,
  warningMessage: "",
  triggerWarning: () => {},
  dismissWarning: () => {},
  refresh: () => {},
});

export function AiUsageProvider({ children, token, isLimitedRole }: {
  children: ReactNode;
  token: string;
  isLimitedRole: boolean;
}) {
  const [usage, setUsage] = useState<AiUsageData | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  const fetchUsage = useCallback(async () => {
    if (!isLimitedRole || !token) return;
    try {
      const data = await api.getAiUsage(token);
      setUsage(data);
    } catch {}
  }, [token, isLimitedRole]);

  useEffect(() => {
    fetchUsage();
    if (!isLimitedRole) return;
    const interval = setInterval(fetchUsage, 60_000);
    return () => clearInterval(interval);
  }, [fetchUsage, isLimitedRole]);

  function triggerWarning(msg: string) {
    setWarningMessage(msg);
    setShowWarning(true);
  }

  function dismissWarning() {
    setShowWarning(false);
  }

  const isLimited = (usage?.percentage ?? 0) >= 100;

  return (
    <AiUsageContext.Provider value={{ usage, isLimited, showWarning, warningMessage, triggerWarning, dismissWarning, refresh: fetchUsage }}>
      {children}
    </AiUsageContext.Provider>
  );
}

export function useAiUsage() {
  return useContext(AiUsageContext);
}
