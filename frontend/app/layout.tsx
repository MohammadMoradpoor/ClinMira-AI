import type React from "react"
import type { Metadata } from "next"
import localFont from "next/font/local"
import { Analytics } from "@vercel/analytics/next"
import { ThemeProvider } from "@/components/theme-provider"
import { I18nProvider } from "@/lib/i18n/i18n-provider"
import "./globals.css"

const geist = localFont({
  src: "../node_modules/next/dist/next-devtools/server/font/geist-latin.woff2",
  display: "swap",
})
const isVercelRuntime = process.env.VERCEL === "1"

export const metadata: Metadata = {
  title: "ClinMira AI - Virtual Clinic Simulation OS / Sanal Klinik Simülasyon OS",
  description: "Generative multi-agent patient twins for clinical and dental education. Klinik ve dental eğitim için üretken çok ajanlı hasta ikizleri.",
  generator: "ClinMira AI",
  openGraph: {
    title: "ClinMira AI - Virtual Clinic Simulation OS / Sanal Klinik Simülasyon OS",
    description: "Generative multi-agent patient twins for clinical and dental education. Klinik ve dental eğitim için üretken çok ajanlı hasta ikizleri.",
    siteName: "ClinMira AI",
    type: "website",
  },
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.className} font-sans antialiased`}>
        <I18nProvider>
          <ThemeProvider defaultTheme="light" storageKey="clinmira-theme">
            {children}
          </ThemeProvider>
        </I18nProvider>
        {isVercelRuntime && <Analytics />}
      </body>
    </html>
  )
}
