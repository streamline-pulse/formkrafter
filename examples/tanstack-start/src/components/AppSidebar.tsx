import { Link } from '@tanstack/react-router'
import { Hammer, House } from 'lucide-react'

import { m } from '#/paraglide/messages'
import LocaleSwitcher from '#/components/LocaleSwitcher'
import ThemeToggle from '#/components/ThemeToggle'

const links = [
  { to: '/', label: () => m.nav_home(), icon: House, exact: true },
  { to: '/playground', label: () => m.nav_playground(), icon: Hammer },
]

export default function AppSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link to="/" className="text-lg font-bold no-underline">
          {m.app_title()}
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            activeOptions={{ exact: link.exact }}
            className="flex items-center gap-2.5 rounded-md px-2 py-2 text-sm font-medium text-sidebar-foreground/80 no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{
              className:
                'bg-sidebar-accent text-sidebar-accent-foreground font-semibold',
            }}
          >
            <link.icon className="size-4 shrink-0 opacity-70" />
            {link.label()}
          </Link>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-4 py-4">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </aside>
  )
}
