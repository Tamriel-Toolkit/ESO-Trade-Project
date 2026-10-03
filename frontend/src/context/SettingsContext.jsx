import React, { createContext, useContext, useState } from 'react';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  const [autoRefreshInterval, setAutoRefreshIntervalState] = useState(() => {
    try {
      return localStorage.getItem('eso-setting-auto-refresh') || '30';
    } catch {
      return '30';
    }
  });

  const [defaultMinDealScore, setDefaultMinDealScoreState] = useState(() => {
    try {
      return localStorage.getItem('eso-setting-min-deal-score') || '1.0';
    } catch {
      return '1.0';
    }
  });

  const [itemsPerPage, setItemsPerPageState] = useState(() => {
    try {
      return localStorage.getItem('eso-setting-items-per-page') || '20';
    } catch {
      return '20';
    }
  });

  const [layoutMode, setLayoutModeState] = useState(() => {
    try {
      return localStorage.getItem('eso-setting-layout-mode') || 'grid';
    } catch {
      return 'grid';
    }
  });

  const [soundNotifications, setSoundNotificationsState] = useState(() => {
    try {
      return localStorage.getItem('eso-setting-sound-notify') === 'true';
    } catch {
      return false;
    }
  });

  const setAutoRefreshInterval = (val) => {
    setAutoRefreshIntervalState(val);
    try { localStorage.setItem('eso-setting-auto-refresh', val); } catch (e) { console.warn(e); }
  };

  const setDefaultMinDealScore = (val) => {
    setDefaultMinDealScoreState(val);
    try { localStorage.setItem('eso-setting-min-deal-score', val); } catch (e) { console.warn(e); }
  };

  const setItemsPerPage = (val) => {
    setItemsPerPageState(val);
    try { localStorage.setItem('eso-setting-items-per-page', val); } catch (e) { console.warn(e); }
  };

  const setLayoutMode = (val) => {
    setLayoutModeState(val);
    try { localStorage.setItem('eso-setting-layout-mode', val); } catch (e) { console.warn(e); }
  };

  const setSoundNotifications = (val) => {
    setSoundNotificationsState(val);
    try { localStorage.setItem('eso-setting-sound-notify', String(val)); } catch (e) { console.warn(e); }
  };

  return (
    <SettingsContext.Provider
      value={{
        autoRefreshInterval,
        setAutoRefreshInterval,
        defaultMinDealScore,
        setDefaultMinDealScore,
        itemsPerPage,
        setItemsPerPage,
        layoutMode,
        setLayoutMode,
        soundNotifications,
        setSoundNotifications
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
