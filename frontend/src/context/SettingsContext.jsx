import { createContext, useContext, useState } from 'react';

const SettingsContext = createContext();

function useStoredSetting(key, fallback, allowedValues) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return allowedValues.includes(stored) ? stored : fallback;
    } catch {
      return fallback;
    }
  });

  const update = (next) => {
    const normalized = String(next);
    if (!allowedValues.includes(normalized)) return;
    setValue(normalized);
    // Preferences still work for this session when browser storage is unavailable.
    try { localStorage.setItem(key, normalized); } catch { /* Storage may be disabled. */ }
  };

  return [value, update];
}

export function SettingsProvider({ children }) {
  const [autoRefreshInterval, setAutoRefreshInterval] = useStoredSetting('eso-setting-auto-refresh', 'off', ['off', '15', '30', '60']);
  const [defaultMinDealScore, setDefaultMinDealScore] = useStoredSetting('eso-setting-min-deal-score', '1.2', ['1.0', '1.2', '1.25', '1.5']);
  const [itemsPerPage, setItemsPerPage] = useStoredSetting('eso-setting-items-per-page', '20', ['20', '50', '100']);
  const [layoutMode, setLayoutMode] = useStoredSetting('eso-setting-layout-mode', 'grid', ['grid', 'compact']);

  return (
    <SettingsContext.Provider value={{
      autoRefreshInterval, setAutoRefreshInterval,
      defaultMinDealScore, setDefaultMinDealScore,
      itemsPerPage, setItemsPerPage,
      layoutMode, setLayoutMode,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
}
