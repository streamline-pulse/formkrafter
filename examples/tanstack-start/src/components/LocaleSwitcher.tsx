import { locales } from '#/paraglide/runtime'
import { m } from '#/paraglide/messages'
import { useLocale } from '#/components/LocaleProvider'
import { cn } from '#/lib/utils'

export default function LocaleSwitcher() {
  const { locale: currentLocale, switchLocale } = useLocale()

  return (
    <div className="flex gap-1" aria-label={m.language_label()}>
      {locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => switchLocale(locale)}
          aria-pressed={locale === currentLocale}
          className={cn(
            'cursor-pointer rounded-md border border-sidebar-border px-2 py-1 text-xs font-semibold text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            locale === currentLocale &&
              'bg-sidebar-primary text-sidebar-primary-foreground border-sidebar-primary'
          )}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
