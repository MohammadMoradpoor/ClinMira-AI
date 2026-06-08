"use client"

import { useState } from "react"
import { Activity, Clock, Network, ShieldAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { agentEvents, baseAgents, blockedOutputs, facultyReviewQueue } from "@/lib/mock-data"
import { useI18n } from "@/lib/i18n/i18n-provider"

const statusLabels: Record<string, string> = {
  "persona-agent": "Active",
  "physiology-agent": "Validating",
  "imaging-agent": "Ready",
  "evaluator-agent": "Monitoring",
  "safety-agent": "Warning",
  "faculty-review-agent": "Idle",
}

const riskLabels: Record<string, string> = {
  "persona-agent": "Low",
  "physiology-agent": "Medium",
  "imaging-agent": "Medium",
  "evaluator-agent": "Low",
  "safety-agent": "High",
  "faculty-review-agent": "Medium",
}

const metrics = [
  ["Medical Consistency Score", "96%"],
  ["Active Agents", "5"],
  ["Blocked Outputs", "2"],
  ["Faculty Review Queue", "4"],
  ["Average Agent Latency", "620ms"],
]

export function AgentControlPage() {
  const [glassboxEnabled, setGlassboxEnabled] = useState(true)
  const [queueStatus, setQueueStatus] = useState("Faculty Review Queue ready.")
  const { tx } = useI18n()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="min-w-0 flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Agent Control"
          description="Monitor patient twin agents, safety checks, and faculty validation queues."
        />

        <div className="mt-6 space-y-6 animate-fade-in">
          <Card className="p-4 sm:p-6 min-w-0">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Network className="w-6 h-6 text-primary" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-2xl font-bold text-foreground break-words">{tx("Agent Network Overview")}</h1>
                  <p className="text-sm text-muted-foreground mt-1 break-words">
                    {tx(glassboxEnabled ? "Agent Glassbox active. AI-generated simulation output requires Faculty Validation." : "Agent Glassbox paused. AI-generated simulation output requires Faculty Validation.")}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 lg:shrink-0">
                <span className="text-sm font-medium">{tx("Glassbox Mode")}</span>
                <Switch checked={glassboxEnabled} onCheckedChange={setGlassboxEnabled} />
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {metrics.map(([label, value]) => (
              <Card key={label} className="p-4 min-w-0">
                <p className="text-xs text-muted-foreground break-words">{tx(label)}</p>
                <p className="text-2xl font-bold text-foreground mt-2">{value}</p>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Card className="p-4 sm:p-6 xl:col-span-2 min-w-0">
              <div className="flex items-center gap-2 mb-5">
                <Activity className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-lg">{tx("Active Agents")}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {baseAgents.map((agent) => (
                  <div key={agent.id} className="rounded-lg border border-border p-4 space-y-3 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground break-words">{tx(agent.name)}</p>
                        <p className="text-sm text-muted-foreground mt-1 break-words">{tx(agent.role)}</p>
                      </div>
                      <Badge variant={agent.status === "warning" || agent.status === "blocked" ? "destructive" : "secondary"} className="shrink-0">
                        {tx(statusLabels[agent.id])}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">{tx("Confidence")}</p>
                        <p className="font-medium">{agent.confidence}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">{tx("Risk")}</p>
                        <p className="font-medium">{tx(riskLabels[agent.id])}</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground break-words">{tx(agent.lastAction)}</p>
                  </div>
                ))}
              </div>
            </Card>

            <div className="space-y-6">
              <Card className="p-4 sm:p-6 min-w-0">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  <h2 className="font-semibold text-lg">{tx("Blocked Outputs")}</h2>
                </div>
                <div className="space-y-3">
                  {blockedOutputs.map((item) => (
                    <div key={item} className="rounded-lg border border-border p-3 text-sm text-muted-foreground break-words">
                      {tx(item)}
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-4 sm:p-6 min-w-0">
                <h2 className="font-semibold text-lg mb-4">{tx("Faculty Review Queue")}</h2>
                <div className="space-y-3">
                  {facultyReviewQueue.map((item) => (
                    <div key={item} className="rounded-lg border border-border p-3 text-sm text-muted-foreground break-words">
                      {tx(item)}
                    </div>
                  ))}
                </div>
                <Button className="w-full mt-4" onClick={() => setQueueStatus("Review queue opened for faculty validation.")}>
                  {tx("Review Queue")}
                </Button>
                <p className="text-xs text-muted-foreground mt-3">{tx(queueStatus)}</p>
              </Card>
            </div>
          </div>

          <Card className="p-4 sm:p-6 min-w-0">
            <div className="flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              <h2 className="font-semibold text-lg">{tx("Live Agent Events")}</h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {agentEvents.map((event) => (
                <div key={event.id} className="rounded-lg border border-border p-4 text-sm min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground break-words">{event.timestamp} · {tx(event.title)}</p>
                      <p className="text-muted-foreground mt-1 break-words">{tx(event.description)}</p>
                    </div>
                    <Badge variant={event.severity === "warning" ? "destructive" : "secondary"} className="shrink-0">{tx(event.severity)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}
