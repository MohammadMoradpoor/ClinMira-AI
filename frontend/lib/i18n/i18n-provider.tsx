"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { englishPhrases } from "@/lib/i18n/dictionaries/en"
import { trDictionary } from "@/lib/i18n/dictionaries/tr"
import { defaultLocale, isLocale, localeStorageKey, type Locale } from "@/lib/i18n/locales"

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  tx: (source: string) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

const enDictionary = Object.fromEntries(englishPhrases.map((phrase) => [phrase, phrase])) as Record<string, string>

function translateSource(locale: Locale, source: string) {
  if (locale === "en") {
    return enDictionary[source] ?? source
  }

  const direct = trDictionary[source as keyof typeof trDictionary]
  if (direct) {
    return direct
  }

  const sentenceCase = source ? `${source[0].toUpperCase()}${source.slice(1)}` : source
  return trDictionary[sentenceCase as keyof typeof trDictionary] ?? source
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale)

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(localeStorageKey)
    if (isLocale(savedLocale)) {
      window.setTimeout(() => setLocaleState(savedLocale), 0)
    }
  }, [])

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale)
    window.localStorage.setItem(localeStorageKey, nextLocale)
  }, [])

  const tx = useCallback((source: string) => translateSource(locale, source), [locale])

  const value = useMemo(() => ({ locale, setLocale, tx }), [locale, setLocale, tx])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const value = useContext(I18nContext)

  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider")
  }

  return value
}
