"use client"

import { Card } from "@/components/ui/card"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cases } from "@/lib/mock-data"
import { useI18n } from "@/lib/i18n/i18n-provider"

const accentBySpecialty: Record<string, { color: string; icon: string }> = {
  Endodontics: { color: "bg-blue-500", icon: "EN" },
  Periodontology: { color: "bg-primary", icon: "PD" },
  "Oral Pathology": { color: "bg-purple-500", icon: "OP" },
  "Oral Medicine": { color: "bg-fuchsia-500", icon: "OM" },
  "General Dentistry": { color: "bg-slate-500", icon: "GD" },
  "Patient Safety": { color: "bg-amber-500", icon: "SG" },
  "Behavioral Dentistry": { color: "bg-cyan-500", icon: "BD" },
  Emergency: { color: "bg-amber-500", icon: "ER" },
  Radiology: { color: "bg-cyan-500", icon: "RX" },
  "Pediatric Dentistry": { color: "bg-sky-500", icon: "PD" },
}

export function AssignedCases() {
  const { tx } = useI18n()
  const assignedCases = cases.filter((item) => item.assignedToday).slice(0, 5)

  return (
    <Card
      className="p-6 transition-all duration-500 hover:shadow-xl animate-slide-in-up"
      style={{ animationDelay: "700ms" }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">{tx("Today's Assigned Cases")}</h2>
        <Button variant="outline" size="sm" className="transition-all duration-300 hover:scale-105 bg-transparent">
          <Plus className="w-4 h-4 mr-1" />
          {tx("View All")}
        </Button>
      </div>
      <div className="space-y-3">
        {assignedCases.map((caseItem, index) => {
          const accent = accentBySpecialty[caseItem.specialty] ?? { color: "bg-primary", icon: "CL" }

          return (
            <div
              key={caseItem.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary transition-all duration-300 cursor-pointer group"
              style={{ animationDelay: `${800 + index * 100}ms` }}
            >
              <div
                className={`${accent.color} w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12`}
              >
                {accent.icon}
              </div>
              <div className="flex-1">
                <p className="font-medium text-foreground text-sm">{tx(caseItem.title)}</p>
                <p className="text-xs text-muted-foreground">
                  {tx(caseItem.specialty)} - {caseItem.durationMinutes} {tx("min")}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
