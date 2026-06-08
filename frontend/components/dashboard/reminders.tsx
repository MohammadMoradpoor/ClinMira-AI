"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ClipboardList } from "lucide-react"
import { facultyFeedback } from "@/lib/mock-data"
import { useI18n } from "@/lib/i18n/i18n-provider"

export function Reminders() {
  const { tx } = useI18n()

  return (
    <Card
      className="p-6 transition-all duration-500 hover:shadow-xl animate-slide-in-up"
      style={{ animationDelay: "500ms" }}
    >
      <h2 className="text-xl font-semibold text-foreground mb-6">{tx("Faculty Feedback")}</h2>
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:scale-[1.02]">
          <h3 className="font-semibold text-foreground mb-1">{facultyFeedback.reviewer}</h3>
          <p className="text-sm text-muted-foreground mb-4">{tx(facultyFeedback.summary)}</p>
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg hover:shadow-primary/30">
            <ClipboardList className="w-4 h-4 mr-2" />
            {tx("Read 4 New Notes")}
          </Button>
        </div>
      </div>
    </Card>
  )
}
