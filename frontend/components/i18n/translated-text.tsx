"use client"

import { useI18n } from "@/lib/i18n/i18n-provider"

export function TranslatedText({ text }: { text: string }) {
  const { tx } = useI18n()

  return <>{tx(text)}</>
}
