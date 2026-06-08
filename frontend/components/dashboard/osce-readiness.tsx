"use client"

import { Card } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { useI18n } from "@/lib/i18n/i18n-provider"

export function OsceReadiness() {
  const [progress, setProgress] = useState(0)
  const { tx } = useI18n()
  const targetProgress = 54

  useEffect(() => {
    const timer = setTimeout(() => {
      if (progress < targetProgress) {
        setProgress((prev) => Math.min(prev + 1, targetProgress))
      }
    }, 30)
    return () => clearTimeout(timer)
  }, [progress, targetProgress])

  const circumference = 2 * Math.PI * 90
  const strokeDashoffset = circumference - (progress / 100) * circumference

  return (
    <Card
      className="p-4 transition-all duration-500 hover:shadow-xl animate-slide-in-up overflow-hidden"
      style={{ animationDelay: "800ms" }}
    >
      <h2 className="text-lg font-semibold text-foreground mb-4">{tx("OSCE Readiness")}</h2>
      <div className="flex flex-col items-center">
        <div className="relative w-40 h-40 mb-4">
          <div
            className="absolute inset-0 rounded-full opacity-20"
            style={{
              background:
                "repeating-linear-gradient(45deg, transparent, transparent 6px, var(--primary) 6px, var(--primary) 12px)",
            }}
          />
          <svg className="w-full h-full -rotate-90 relative z-10" viewBox="0 0 160 160">
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              className="text-muted/30"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke="currentColor"
              strokeWidth="12"
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="text-primary transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-foreground">{progress}%</span>
            <span className="text-xs text-muted-foreground mt-1">{tx("Current readiness")}</span>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0" />
            <span className="text-muted-foreground whitespace-nowrap">{tx("Completed")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-foreground flex-shrink-0" />
            <span className="text-muted-foreground whitespace-nowrap">{tx("In progress")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{
                background:
                  "repeating-linear-gradient(45deg, transparent, transparent 2px, var(--muted-foreground) 2px, var(--muted-foreground) 4px)",
              }}
            />
            <span className="text-muted-foreground whitespace-nowrap">{tx("Needs review")}</span>
          </div>
        </div>
      </div>
    </Card>
  )
}
