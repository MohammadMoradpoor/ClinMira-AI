export const locales = ["en", "tr"] as const

export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = "en"
export const localeStorageKey = "clinmira-locale"

export function isLocale(value: string | null): value is Locale {
  return value === "en" || value === "tr"
}
