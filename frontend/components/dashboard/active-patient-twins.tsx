"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus } from "lucide-react"
import { caseById, patients } from "@/lib/mock-data"
import { useI18n } from "@/lib/i18n/i18n-provider"

const statusStyles = [
  "bg-primary/10 text-primary",
  "bg-amber-100 text-amber-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
]

export function ActivePatientTwins() {
  const { tx } = useI18n()
  const activePatients = patients.slice(0, 4).map((patient, index) => ({
    name: patient.name,
    station: caseById.get(patient.caseId)?.stationLabel ?? "Virtual clinic station",
    status: ["Stable", "Worsening", "Imaging ready", "Developing trust"][index] ?? "Stable",
    statusColor: statusStyles[index] ?? statusStyles[0],
    avatar: patient.avatarLabel,
    avatarImage: `/avatars/avatar-${(index % 4) + 1}.jpg`,
  }))

  return (
    <Card
      className="p-6 transition-all duration-500 hover:shadow-xl animate-slide-in-up"
      style={{ animationDelay: "600ms" }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-foreground">{tx("Active Patient Twins")}</h2>
        <Button variant="outline" size="sm" className="transition-all duration-300 hover:scale-105 bg-transparent">
          <Plus className="w-4 h-4 mr-1" />
          {tx("Open Clinic")}
        </Button>
      </div>
      <div className="space-y-4">
        {activePatients.map((patientTwin, index) => (
          <div
            key={patientTwin.name}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary transition-all duration-300 cursor-pointer group"
            style={{ animationDelay: `${650 + index * 100}ms` }}
          >
            <Avatar className="w-12 h-12 ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-primary/40 group-hover:scale-110">
              <AvatarImage src={patientTwin.avatarImage || "/placeholder.svg"} alt={patientTwin.name} />
              <AvatarFallback className="bg-primary text-primary-foreground">{patientTwin.avatar}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{patientTwin.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {tx("In")} <span className="font-medium">{tx(patientTwin.station)}</span>
              </p>
            </div>
            <span
              className={`${patientTwin.statusColor} text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-300 group-hover:scale-105 whitespace-nowrap`}
            >
              {tx(patientTwin.status)}
            </span>
          </div>
        ))}
      </div>
    </Card>
  )
}
