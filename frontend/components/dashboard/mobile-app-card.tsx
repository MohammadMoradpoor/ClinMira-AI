"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClipboardCheck, HeartHandshake, ShieldAlert, Stethoscope } from "lucide-react"
import { useI18n } from "@/lib/i18n/i18n-provider"

export function MobileAppCard() {
  const { tx } = useI18n()

  return (
    <Card
      className="bg-foreground text-background p-4 transition-all duration-500 hover:shadow-2xl animate-slide-in-up overflow-hidden relative group"
      style={{ animationDelay: "900ms" }}
    >
      <div className="absolute bottom-0 left-0 right-0 h-24 overflow-hidden">
        <svg
          className="absolute bottom-0 w-full"
          viewBox="0 0 200 60"
          preserveAspectRatio="none"
          style={{ height: "100px" }}
        >
          <path
            d="M0,30 Q25,15 50,30 T100,30 T150,30 T200,30 L200,60 L0,60 Z"
            fill="var(--primary)"
            opacity="0.3"
          />
          <path d="M0,40 Q25,25 50,40 T100,40 T150,40 T200,40 L200,60 L0,60 Z" fill="var(--primary)" />
        </svg>
      </div>

      <div className="relative z-10">
        <ClipboardCheck className="w-6 h-6 mb-3" />
        <h2 className="text-xl font-bold mb-1">{tx("Today's Clinical Focus")}</h2>
        <p className="text-xs opacity-80 mb-4">{tx("Four priorities for safer patient twin practice.")}</p>

        <div className="flex flex-col gap-2 mb-4">
          <Button
            variant="secondary"
            className="w-full h-10 bg-background text-foreground hover:bg-background/90 transition-all duration-300 hover:scale-105 flex items-center justify-start gap-2 px-3"
          >
            <ShieldAlert className="w-5 h-5" />
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] leading-none">{tx("Safety")}</span>
              <span className="text-sm font-semibold leading-none">{tx("Allergy checks")}</span>
            </div>
          </Button>

          <Button
            variant="secondary"
            className="w-full h-10 bg-background text-foreground hover:bg-background/90 transition-all duration-300 hover:scale-105 flex items-center justify-start gap-2 px-3"
          >
            <Stethoscope className="w-5 h-5" />
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] leading-none">{tx("Reasoning")}</span>
              <span className="text-sm font-semibold leading-none">{tx("Differential diagnosis")}</span>
            </div>
          </Button>

          <Button
            variant="secondary"
            className="w-full h-10 bg-background text-foreground hover:bg-background/90 transition-all duration-300 hover:scale-105 flex items-center justify-start gap-2 px-3"
          >
            <HeartHandshake className="w-5 h-5" />
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] leading-none">{tx("Communication")}</span>
              <span className="text-sm font-semibold leading-none">{tx("Anxious patients")}</span>
            </div>
          </Button>

          <Button
            variant="secondary"
            className="w-full h-10 bg-background text-foreground hover:bg-background/90 transition-all duration-300 hover:scale-105 flex items-center justify-start gap-2 px-3"
          >
            <ShieldAlert className="w-5 h-5" />
            <div className="flex flex-col items-start text-left">
              <span className="text-[10px] leading-none">{tx("Red flags")}</span>
              <span className="text-sm font-semibold leading-none">{tx("Infection screening")}</span>
            </div>
          </Button>
        </div>
      </div>
    </Card>
  )
}
