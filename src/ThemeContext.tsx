import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('flight_app_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('flight_app_theme', theme);
    } catch {
      // ignore
    }

    const root = document.documentElement;
    const body = document.body;

    if (theme === 'light') {
      root.classList.add('theme-light', 'light');
      root.classList.remove('theme-dark', 'dark');
      body.classList.add('theme-light', 'light');
      body.classList.remove('theme-dark', 'dark');
      root.style.colorScheme = 'light';
      body.style.backgroundColor = '#D6D0C4';
      body.style.color = '#292524';
    } else {
      root.classList.add('theme-dark', 'dark');
      root.classList.remove('theme-light', 'light');
      body.classList.add('theme-dark', 'dark');
      body.classList.remove('theme-light', 'light');
      root.style.colorScheme = 'dark';
      body.style.backgroundColor = '#070708';
      body.style.color = '#E0E0E0';
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
