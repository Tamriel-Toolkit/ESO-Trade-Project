import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({
  theme: "dark",
  setTheme: () => null,
  toggleTheme: () => null,
  platform: "PC",
  setPlatform: () => null,
  togglePlatform: () => null,
  serverLocation: "NA",
  setServerLocation: () => null,
  toggleServerLocation: () => null,
});

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "eso-trade-theme",
}) {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(storageKey) || defaultTheme;
    } catch {
      return defaultTheme;
    }
  });

  const [platform, setPlatformState] = useState(() => {
    try {
      return localStorage.getItem("eso-platform") || "PC";
    } catch {
      return "PC";
    }
  });

  const [serverLocation, setServerLocationState] = useState(() => {
    try {
      return localStorage.getItem("eso-server-location") || "NA";
    } catch {
      return "NA";
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);

    try {
      localStorage.setItem(storageKey, theme);
    } catch (e) {
      console.warn("Unable to save theme preference:", e);
    }
  }, [theme, storageKey]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === "dark" ? "light" : "dark"));
  };

  const setPlatform = (newPlatform) => {
    setPlatformState(newPlatform);
    try {
      localStorage.setItem("eso-platform", newPlatform);
    } catch (e) {
      console.warn(e);
    }
  };

  const togglePlatform = () => {
    const platforms = ["PC", "Xbox", "PlayStation"];
    const currentIndex = platforms.indexOf(platform);
    const nextPlatform = platforms[(currentIndex + 1) % platforms.length];
    setPlatform(nextPlatform);
  };

  const setServerLocation = (newLoc) => {
    setServerLocationState(newLoc);
    try {
      localStorage.setItem("eso-server-location", newLoc);
    } catch (e) {
      console.warn(e);
    }
  };

  const toggleServerLocation = () => {
    const nextLoc = serverLocation === "NA" ? "EU" : "NA";
    setServerLocation(nextLoc);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        toggleTheme,
        platform,
        setPlatform,
        togglePlatform,
        serverLocation,
        setServerLocation,
        toggleServerLocation,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
