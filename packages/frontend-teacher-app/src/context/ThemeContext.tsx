import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  ReactNode,
} from 'react';

type ThemeColors = {
  background: string;
  text: string;
  subtitle: string;
  inputBg: string;
  button: string;
  card: string;
};

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const colors = useMemo<ThemeColors>(
    () =>
      isDarkMode
        ? {
            background: '#1a1a1a',
            text: '#ffffff',
            subtitle: '#cccccc',
            inputBg: '#333333',
            button: '#BF77F6',
            card: '#2a2a2a',
          }
        : {
            background: '#f5f5f5',
            text: '#000000',
            subtitle: '#666666',
            inputBg: '#ffffff',
            button: '#023E8A',
            card: '#ffffff',
          },
    [isDarkMode]
  );

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
