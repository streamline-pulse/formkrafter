import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import { m } from '#/paraglide/messages'
import { useLocale } from '#/components/LocaleProvider'

export default function ThemeToggle() {
  // Subscribes to locale changes: this component reads paraglide
  // messages during render, and nothing remounts on a language switch.
  useLocale()
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={m.theme_toggle()}
      title={m.theme_toggle()}
      className="flex size-8 items-center justify-center rounded-md border border-sidebar-border text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
