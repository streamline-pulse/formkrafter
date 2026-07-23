import { Link } from '@tanstack/react-router'
import {
  ArrowRightLeft,
  Braces,
  Globe,
  Layers,
  Grid3x3,
  Hammer,
  House,
  KeyRound,
  Languages,
  ListChecks,
  Palette,
  ServerCog,
  Star,
  TextCursorInput,
} from 'lucide-react'

import { m } from '#/paraglide/messages'
import LocaleSwitcher from '#/components/LocaleSwitcher'
import ThemeToggle from '#/components/ThemeToggle'

const groups = [
  {
    label: () => m.navg_start(),
    links: [
      { to: '/', label: () => m.nav_home(), icon: House, exact: true },
      { to: '/playground', label: () => m.nav_playground(), icon: Hammer },
    ],
  },
  {
    label: () => m.navg_render(),
    links: [
      { to: '/examples/simple-form', label: () => m.ex_simple_nav(), icon: TextCursorInput },
      { to: '/examples/wizard', label: () => m.ex_wizard_nav(), icon: ListChecks },
      { to: '/examples/multilingual', label: () => m.ex_i18nform_nav(), icon: Languages },
      { to: '/examples/nested-form', label: () => m.ex_nested_nav(), icon: Layers },
    ],
  },
  {
    label: () => m.navg_data(),
    links: [
      { to: '/examples/remote-selects', label: () => m.ex_remote_nav(), icon: Globe },
      { to: '/examples/data-grid', label: () => m.ex_grid_nav(), icon: Grid3x3 },
      { to: '/examples/auth-context', label: () => m.ex_auth_nav(), icon: KeyRound },
    ],
  },
  {
    label: () => m.navg_advanced(),
    links: [
      { to: '/examples/rules', label: () => m.ex_rules_nav(), icon: Braces },
      { to: '/examples/server-validation', label: () => m.ex_server_nav(), icon: ServerCog },
      { to: '/examples/custom-brick', label: () => m.ex_custom_nav(), icon: Star },
      { to: '/examples/theming', label: () => m.ex_theming_nav(), icon: Palette },
      { to: '/examples/formio-import', label: () => m.ex_fio_nav(), icon: ArrowRightLeft },
    ],
  },
]

export default function AppSidebar() {
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Link to="/" className="text-lg font-bold no-underline">
          {m.app_title()}
        </Link>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {groups.map((group) => (
          <div key={group.label()}>
            <p className="px-2 pb-1 text-[0.65rem] font-bold tracking-widest text-sidebar-foreground/50 uppercase">
              {group.label()}
            </p>
            <div className="space-y-0.5">
              {group.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  activeOptions={{ exact: link.exact }}
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium text-sidebar-foreground/80 no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  activeProps={{
                    className:
                      'bg-sidebar-accent text-sidebar-accent-foreground font-semibold',
                  }}
                >
                  <link.icon className="size-4 shrink-0 opacity-70" />
                  {link.label()}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-4 py-4">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </aside>
  )
}
