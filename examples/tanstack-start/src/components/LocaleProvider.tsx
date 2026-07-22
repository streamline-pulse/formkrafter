import {
  Fragment,
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'

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
  const pendingScroll = useRef<number | null>(null)

  async function switchLocale(next: Locale) {
    if (next === locale) return
    pendingScroll.current = window.scrollY
    await setLocale(next, { reload: false })
    document.documentElement.setAttribute('lang', next)
    setLocaleState(next)
  }

  useLayoutEffect(() => {
    const target = pendingScroll.current
    if (target === null) return
    pendingScroll.current = null

    window.scrollTo(0, target)
    let attempts = 0
    const retry = () => {
      if (Math.abs(window.scrollY - target) < 2 || attempts >= 20) return
      attempts += 1
      window.scrollTo(0, target)
      requestAnimationFrame(retry)
    }
    requestAnimationFrame(retry)
  }, [locale])

  return (
    <LocaleContext.Provider value={{ locale, switchLocale }}>
      <Fragment key={locale}>{children}</Fragment>
    </LocaleContext.Provider>
  )
}
