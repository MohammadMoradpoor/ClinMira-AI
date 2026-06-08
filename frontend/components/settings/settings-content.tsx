"use client"

import { useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"
import { currentUser } from "@/lib/mock-data"
import { LanguageSwitcher } from "@/components/i18n/language-switcher"
import { useI18n } from "@/lib/i18n/i18n-provider"

const simulationPreferences = [
  { label: "Voice Interview", description: "Enable voice-ready patient encounters when available" },
  { label: "Simulation Difficulty", description: "Default to faculty-set difficulty for assigned patient twin cases" },
  { label: "Faculty-set Difficulty", description: "Respect instructor controls for cohort assignments" },
  { label: "OSCE-ready Mode", description: "Use assessment timing, scoring, and safety checks" },
]

const accessibilityPreferences = [
  { label: "Reduced Motion", description: "Limit non-essential motion during longer training sessions" },
  { label: "Accessibility Mode", description: "Support clearer contrast and simpler interaction pacing" },
]

const accountSummary = [
  ["Name", currentUser.name],
  ["Role", currentUser.role],
  ["Program", currentUser.program],
  ["Workspace", "ClinMira AI demo"],
]

export function SettingsContent() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const { tx } = useI18n()

  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px] animate-fade-in min-w-0 items-start">
      <div className="min-w-0 space-y-6">
        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-6">{tx("Profile")}</h3>
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <Avatar className="w-20 h-20 shrink-0">
                <AvatarImage src="/profile.jpg" alt={currentUser.name} />
                <AvatarFallback>{currentUser.avatarInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <Button variant="outline" className="w-full sm:w-auto">{tx("Update Avatar")}</Button>
                <p className="text-xs text-muted-foreground mt-2 break-words">
                  {tx("Used across case review, debriefing, and faculty feedback.")}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{tx("Full Name")}</Label>
                <Input id="name" defaultValue={currentUser.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">{tx("Role")}</Label>
                <Input id="role" value={tx(currentUser.role)} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="institution">{tx("Institution")}</Label>
                <Input id="institution" defaultValue={currentUser.institution} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="program">{tx("Program")}</Label>
                <Input id="program" value={tx(currentUser.program)} readOnly />
              </div>
            </div>

            <Button className="w-full sm:w-auto bg-primary hover:bg-primary/90">{tx("Save Profile")}</Button>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-6">{tx("Simulation Preferences")}</h3>
          <PreferenceList items={simulationPreferences} />
        </Card>

        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-6">{tx("Accessibility & Simulation")}</h3>
          <PreferenceList items={accessibilityPreferences} firstItemOff />
        </Card>
      </div>

      <aside className="min-w-0 space-y-4 xl:sticky xl:top-6">
        <Card className="p-4 sm:p-5 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Account Summary")}</h3>
          <div className="space-y-3">
            {accountSummary.map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-3 text-sm">
                <span className="text-muted-foreground">{tx(label)}</span>
                <span className="max-w-[62%] text-right font-medium text-foreground break-words">{tx(value)}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{tx("Student")}</Badge>
            <Badge variant="outline">{tx("Dental Education")}</Badge>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Theme & Privacy")}</h3>
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">{tx("Language")}</p>
                <p className="text-sm text-muted-foreground break-words">
                  {tx("Choose English or Turkish for the ClinMira AI interface")}
                </p>
              </div>
              <LanguageSwitcher />
            </div>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium">{tx("Theme")}</p>
                <p className="text-sm text-muted-foreground break-words">
                  {tx("Choose the preferred theme for faculty and student sessions")}
                </p>
              </div>
              <Switch
                checked={mounted && theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                className="mt-1 shrink-0"
              />
            </div>
            <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground break-words">
              {tx("No real patient data is used in this prototype.")}
            </div>
            <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground break-words">
              {tx("Faculty Validation is required for AI-generated simulation output.")}
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Training Safety Notice")}</h3>
          <div className="pt-3 border-t border-border space-y-2">
            <p className="font-medium">{tx("Synthetic Patient Disclaimer")}</p>
            <p className="text-sm text-muted-foreground break-words">{tx("Synthetic educational patient. Not for real clinical decision-making.")}</p>
            <p className="text-sm text-muted-foreground break-words">{tx("AI-generated simulation output requires faculty validation.")}</p>
            <p className="text-sm text-muted-foreground break-words">{tx("For training and assessment only.")}</p>
            <p className="text-sm text-muted-foreground break-words">{tx("No real patient data is used in this prototype.")}</p>
          </div>
        </Card>
      </aside>
    </div>
  )
}

function PreferenceList({
  items,
  firstItemOff = false,
}: {
  items: Array<{ label: string; description: string }>
  firstItemOff?: boolean
}) {
  const { tx } = useI18n()

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={item.label}
          className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0"
        >
          <div className="min-w-0">
            <p className="font-medium break-words">{tx(item.label)}</p>
            <p className="text-sm text-muted-foreground break-words">{tx(item.description)}</p>
          </div>
          <Switch defaultChecked={!(firstItemOff && index === 0)} className="mt-1 shrink-0" />
        </div>
      ))}
    </div>
  )
}
