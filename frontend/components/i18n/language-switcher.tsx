"use client"

import { Button } from "@/components/ui/button"
import { useI18n } from "@/lib/i18n/i18n-provider"
import type { Locale } from "@/lib/i18n/locales"

const languageOptions: Array<{ locale: Locale; label: string }> = [
  { locale: "en", label: "EN" },
  { locale: "tr", label: "TR" },
]

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, tx } = useI18n()

  return (
    <div
      className="inline-flex items-center rounded-lg border border-border bg-card p-0.5"
      role="group"
      aria-label={tx("Select language")}
    >
      {languageOptions.map((option) => (
        <Button
          key={option.locale}
          type="button"
          variant={locale === option.locale ? "default" : "ghost"}
          size="sm"
          aria-pressed={locale === option.locale}
          aria-label={option.locale === "en" ? tx("English") : tx("Türkçe")}
          onClick={() => setLocale(option.locale)}
          className={`${compact ? "h-7 px-2 text-[11px]" : "h-8 px-3 text-xs"} rounded-md`}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
