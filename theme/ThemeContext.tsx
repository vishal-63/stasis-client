import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance, ColorSchemeName } from "react-native";
import { light, dark, Theme } from "./colors";

type ThemeContextType = {
  theme: Theme;
  isDark: boolean;
  colorScheme: ColorSchemeName;
};

const ThemeContext = createContext<ThemeContextType>({
  theme: light,
  isDark: false,
  colorScheme: "light",
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(
    Appearance.getColorScheme() ?? "light",
  );

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setColorScheme(colorScheme);
    });
    return () => sub.remove();
  }, []);

  const isDark = colorScheme === "dark";
  const theme = isDark ? dark : light;

  return (
    <ThemeContext.Provider value={{ theme, isDark, colorScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
