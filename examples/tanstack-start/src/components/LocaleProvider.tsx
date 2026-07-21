import { Fragment, createContext, useContext, useState } from 'react'

import { getLocale, setLocale } from '#/paraglide/runtime'

type Locale = ReturnType<typeof getLocale>

interface LocaleContextValue {
  locale: Locale
  switchLocale: (locale: Locale) => Promise<void>
}

const LocaleContext = createContext<LocaleContextValue | null>(null)

export function useLocale() {
  const ctx = useContext(LocaleContext)
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider')
  return ctx
}

export default function LocaleProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [locale, setLocaleState] = useState<Locale>(() => getLocale())

  async function switchLocale(next: Locale) {
    if (next === locale) return
    await setLocale(next, { reload: false })
    document.documentElement.setAttribute('lang', next)
    setLocaleState(next)
  }

  return (
    <LocaleContext.Provider value={{ locale, switchLocale }}>
      <Fragment key={locale}>{children}</Fragment>
    </LocaleContext.Provider>
  )
}
