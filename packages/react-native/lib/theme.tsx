import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'

export interface FkTheme {
  colorPrimary: string
  colorSurface: string
  colorBorder: string
  colorText: string
  colorMuted: string
  colorDanger: string
  radius: number
  spacing: number
}

export const fkLightTheme: FkTheme = {
  colorPrimary: '#2b7a81',
  colorSurface: '#ffffff',
  colorBorder: '#d5dde2',
  colorText: '#1c2b33',
  colorMuted: '#64748b',
  colorDanger: '#dc2626',
  radius: 8,
  spacing: 8,
}

export const fkDarkTheme: FkTheme = {
  colorPrimary: '#4fb8b2',
  colorSurface: '#111c24',
  colorBorder: '#2d3f4b',
  colorText: '#e2ecf2',
  colorMuted: '#8fa4b0',
  colorDanger: '#f87171',
  radius: 8,
  spacing: 8,
}

const ThemeContext = createContext<FkTheme>(fkLightTheme)

export function FkThemeProvider(props: {
  theme?: FkTheme | 'light' | 'dark'
  children: ReactNode
}) {
  const value =
    props.theme === 'dark'
      ? fkDarkTheme
      : props.theme === 'light' || props.theme === undefined
        ? fkLightTheme
        : props.theme

  return <ThemeContext.Provider value={value}>{props.children}</ThemeContext.Provider>
}

export function useFkTheme(): FkTheme {
  return useContext(ThemeContext)
}
