"use client";

import { useState, useEffect } from "react";

export function useColorMode() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === "undefined") return;

    // Initial check
    const darkModeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDarkMode(
      darkModeQuery.matches ||
        document.documentElement.classList.contains("dark")
    );

    // Listen for changes
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(
        e.matches || document.documentElement.classList.contains("dark")
      );
    };

    darkModeQuery.addEventListener("change", handleChange);

    // Check for DOM class changes (for custom dark mode toggles)
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          setIsDarkMode(document.documentElement.classList.contains("dark"));
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => {
      darkModeQuery.removeEventListener("change", handleChange);
      observer.disconnect();
    };
  }, []);

  return { isDarkMode };
}
