"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp, TrendingDown, ShieldAlert, CheckCircle, MessageSquare, Target, ArrowUpRight } from "lucide-react"
import { useState } from "react"
import { caseById, debriefReports } from "@/lib/mock-data"
import { useI18n } from "@/lib/i18n/i18n-provider"

export function DebriefingContent() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const { tx } = useI18n()
  const report = debriefReports["acute-apical-abscess"]
  const caseItem = caseById.get(report.caseId)

  const stats = [
    { title: "Overall Score", value: `${report.overallScore}%`, change: "+4 vs prior attempt", trend: "up", icon: CheckCircle },
    { title: "Diagnosis Accuracy", value: `${report.diagnosisAccuracy}%`, change: "+5 with imaging", trend: "up", icon: Target },
    { title: "Treatment Safety", value: `${report.treatmentSafety}%`, change: "-4 allergy delay", trend: "down", icon: ShieldAlert },
    { title: "Communication Quality", value: `${report.communicationQuality}%`, change: "+6 empathy gain", trend: "up", icon: MessageSquare },
  ] as const

  const rubricData = report.facultyRubric
  const maxRubricScore = Math.max(...rubricData.map((item) => item.maxScore))
  const highlightData = [
    { name: "What Went Well", count: report.strengths.length, color: "bg-primary" },
    { name: "Critical Misses", count: report.criticalMisses.length, color: "bg-amber-500" },
    { name: "Unsafe Actions", count: report.unsafeActions.length, color: "bg-rose-500" },
    { name: "Missed Questions", count: report.missedQuestions.length, color: "bg-sky-500" },
  ]
  const secondaryScores = [
    ["Clinical Reasoning", `${report.clinicalReasoning}%`],
    ["Patient Trust", `${report.patientTrustFinal}%`],
    ["Time Efficiency", `${report.timeEfficiency}%`],
    ["Safety Score", `${report.safetyScore}%`],
  ]
  const nextCases = report.suggestedNextCaseIds.map((caseId) => caseById.get(caseId)).filter(Boolean)

  return (
    <div className="space-y-6 animate-fade-in">
      <Card className="p-4 sm:p-6">
        <h3 className="font-semibold text-lg mb-2">{tx("Outcome Summary")}</h3>
        <p className="text-sm text-muted-foreground break-words">{tx(report.caseOutcome)}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          {secondaryScores.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-border p-3">
              <p className="text-xs text-muted-foreground">{tx(label)}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <Card
            key={stat.title}
            onMouseEnter={() => setHoveredCard(index)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ animationDelay: `${index * 100}ms` }}
            className={`min-w-0 bg-card text-foreground p-4 transition-all duration-500 ease-out animate-slide-in-up cursor-pointer ${
              hoveredCard === index ? "scale-105 shadow-2xl" : "shadow-lg"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="min-w-0 flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-full">
                  <stat.icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-xs font-medium opacity-90 break-words">{tx(stat.title)}</h3>
              </div>
              <div
                className={`w-6 h-6 rounded-full bg-primary flex items-center justify-center transition-transform duration-300 ${
                  hoveredCard === index ? "rotate-45" : ""
                }`}
              >
                <ArrowUpRight className="w-3 h-3 text-primary-foreground" />
              </div>
            </div>
            <p className="text-3xl font-bold mb-2">{stat.value}</p>
            <div className="flex items-center gap-1.5 text-xs opacity-80">
              {stat.trend === "up" ? (
                <TrendingUp className="w-3 h-3 text-primary" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
              <span className={stat.trend === "up" ? "text-primary" : "text-red-600"}>{tx(stat.change)}</span>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-2">{tx("Faculty Rubric")}</h3>
          <p className="text-sm text-muted-foreground mb-6 break-words">
            {tx(caseItem?.title ?? "Featured case")}: {tx(report.caseOutcome)}
          </p>
          <div className="space-y-4">
            {rubricData.map((item, index) => (
              <div
                key={item.label}
                className="space-y-2 animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium break-words">{tx(item.label)}</span>
                  <span className="text-muted-foreground">
                    {item.score}/{item.maxScore}
                  </span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${(item.score / maxRubricScore) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-6">{tx("Debrief Highlights")}</h3>
          <div className="space-y-4">
            {highlightData.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:shadow-md transition-all duration-300 animate-slide-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <span className="font-medium break-words">{tx(item.name)}</span>
                </div>
                <span className="text-2xl font-bold text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DebriefList title="What Went Well" items={report.strengths} tone="success" />
        <DebriefList title="Critical Misses" items={report.criticalMisses} tone="warning" />
        <DebriefList title="Unsafe Actions" items={report.unsafeActions} tone="danger" />
        <DebriefList title="Missed Questions" items={report.missedQuestions} tone="neutral" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Correct Reasoning Path")}</h3>
          <div className="space-y-3">
            {report.correctReasoningPath.map((node) => (
              <div key={node.id} className="rounded-lg border border-border p-3 text-sm break-words">
                <p className="text-xs text-muted-foreground">{tx(node.stage)}</p>
                <p className="font-medium text-foreground">{tx(node.label)}</p>
                <p className="text-muted-foreground mt-1">{tx(node.detail)}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Your Reasoning Path")}</h3>
          <div className="space-y-3">
            {report.userReasoningPath.map((node) => (
              <div key={node.id} className="rounded-lg border border-border p-3 text-sm break-words">
                <p className="text-xs text-muted-foreground">{tx(node.stage)}</p>
                <p className="font-medium text-foreground">{tx(node.label)}</p>
                <p className="text-muted-foreground mt-1">{tx(node.detail)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 sm:p-6 lg:col-span-2 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Timeline Replay")}</h3>
          <div className="space-y-3">
            {report.timelineReplay.slice(3, 9).map((event) => (
              <div key={event.id} className="flex gap-3 text-sm min-w-0">
                <span className="text-xs text-muted-foreground w-12 shrink-0">{event.timestamp}</span>
                <div className="min-w-0 border-l border-border pl-3 pb-3">
                  <p className="font-medium text-foreground">{tx(event.title)}</p>
                  <p className="text-muted-foreground">{tx(event.description)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Suggested Next Cases")}</h3>
          <div className="space-y-3">
            {nextCases.map((item) => (
              <div key={item?.id} className="rounded-lg border border-border p-3 text-sm break-words">
                <p className="font-medium text-foreground">{tx(item?.title ?? "")}</p>
                <p className="text-muted-foreground mt-1">{tx(item?.targetCompetencies[0] ?? "")}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

function DebriefList({
  title,
  items,
  tone,
}: {
  title: string
  items: string[]
  tone: "success" | "warning" | "danger" | "neutral"
}) {
  const { tx } = useI18n()
  const dotClass =
    tone === "success"
      ? "bg-primary"
      : tone === "warning"
        ? "bg-amber-500"
        : tone === "danger"
          ? "bg-rose-500"
          : "bg-sky-500"

  return (
    <Card className="p-4 sm:p-6 min-w-0">
      <h3 className="font-semibold text-lg mb-4">{tx(title)}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item} className="flex gap-3 rounded-lg border border-border p-3 text-sm min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${dotClass}`} />
            <span className="text-muted-foreground break-words">{tx(item)}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
