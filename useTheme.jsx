import { useState, useEffect, createContext, useContext, useCallback } from 'react';

/**
 * Theme Context
 */
const ThemeContext = createContext(null);

/**
 * Get initial theme from localStorage or system preference
 */
const getInitialTheme = () => {
  // Check localStorage first
  const stored = localStorage.getItem('medward-theme');
  if (stored === 'dark' || stored === 'light') {
    return stored;
  }

  // Check system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
  }

  return 'light';
};

/**
 * Theme Provider Component
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(getInitialTheme);

  // Apply theme to document body
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      body.classList.add('dark-theme');
      root.classList.add('dark-theme');
      root.style.colorScheme = 'dark';
    } else {
      body.classList.remove('dark-theme');
      root.classList.remove('dark-theme');
      root.style.colorScheme = 'light';
    }

    // Store preference
    localStorage.setItem('medward-theme', theme);
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e) => {
      // Only auto-switch if no manual preference is stored
      const stored = localStorage.getItem('medward-theme');
      if (!stored) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const setLightTheme = useCallback(() => setTheme('light'), []);
  const setDarkTheme = useCallback(() => setTheme('dark'), []);
  
  const resetToSystemTheme = useCallback(() => {
    localStorage.removeItem('medward-theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(systemTheme);
  }, []);

  const value = {
    theme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    toggleTheme,
    setTheme,
    setLightTheme,
    setDarkTheme,
    resetToSystemTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme Hook
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
};

export default useTheme;
