"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ClipboardList, MessageSquare, MoreHorizontal, AlertTriangle, BarChart3 } from "lucide-react"
import {
  commonMissedQuestions,
  facultyAlerts,
  facultyDistributionData,
  facultyHeatmap,
  facultyMetrics,
  recentSubmissions,
  topStrugglingStudents,
} from "@/lib/mock-data"
import { useI18n } from "@/lib/i18n/i18n-provider"

const learners = topStrugglingStudents.map((student, index) => {
  const competency = facultyHeatmap[index]
  const averageScore = competency
    ? Math.round((competency.reasoning + competency.safety + competency.communication + competency.imaging) / 4)
    : 78

  return {
    name: student.name,
    role: student.area,
    status: student.risk.toLowerCase(),
    score: averageScore,
    avatar: `/avatars/avatar-${(index % 4) + 1}.jpg`,
    initials: student.name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2),
  }
})

export function FacultyDashboardContent() {
  const { tx } = useI18n()
  const metricCards = [
    ...facultyMetrics,
    { label: "High-Risk Errors", value: "12", change: "Needs faculty coaching", trend: "down" },
    { label: "Cases Awaiting Review", value: "7", change: "Faculty Validation", trend: "neutral" },
  ]

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {metricCards.map((metric) => (
          <Card key={metric.label} className="p-4 hover:shadow-lg transition-all duration-300 min-w-0">
            <p className="text-xs text-muted-foreground break-words">{tx(metric.label)}</p>
            <p className="text-2xl font-bold text-foreground mt-2">{metric.value}</p>
            <p className="text-xs text-muted-foreground mt-1 break-words">{tx(metric.change)}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 sm:p-6 lg:col-span-2 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">{tx("Cohort Safety Overview")}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facultyDistributionData.map((item) => (
              <div key={item.name} className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3 text-sm mb-2">
                  <span className="font-medium break-words">{tx(item.name)}</span>
                  <span className="text-muted-foreground">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-secondary overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
            <div className="rounded-lg border border-border p-4">
              <p className="font-medium text-sm">{tx("Competency Gaps")}</p>
              <p className="text-sm text-muted-foreground mt-2 break-words">
                {tx("Allergy history, CBCT rationale, and systemic infection screening remain the highest-value coaching targets.")}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6 min-w-0">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-lg">{tx("Faculty Alerts")}</h3>
          </div>
          <div className="space-y-3">
            {facultyAlerts.map((alert) => (
              <div key={alert} className="rounded-lg border border-border p-3 text-sm text-muted-foreground break-words">
                {tx(alert)}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {learners.map((member, index) => (
          <Card
            key={member.name}
            className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 animate-slide-in min-w-0"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20">
                <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                <AvatarFallback>{member.initials}</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg break-words">{member.name}</h3>
                <p className="text-sm text-muted-foreground break-words">{tx(member.role)}</p>
              </div>

              <Badge variant={member.status === "high" ? "destructive" : "secondary"} className="self-start">
                {member.status === "high" ? tx("High risk") : tx("Moderate risk")}
              </Badge>

              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{tx("Average Score")}</span>
                  <span className="font-semibold">{member.score}%</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <ClipboardList className="w-4 h-4 mr-1" />
                  {tx("Open Rubric")}
                </Button>
                <Button variant="outline" size="sm" className="w-full bg-transparent">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {tx("Send Note")}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Common Missed Questions")}</h3>
          <div className="space-y-2">
            {commonMissedQuestions.map((question) => (
              <div key={question} className="rounded-lg border border-border p-3 text-sm text-muted-foreground break-words">
                {tx(question)}
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Recent Submissions")}</h3>
          <div className="space-y-3">
            {recentSubmissions.map((submission) => (
              <div key={`${submission.caseTitle}-${submission.student}`} className="rounded-lg border border-border p-3 text-sm min-w-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-foreground break-words">{tx(submission.caseTitle)}</p>
                    <p className="text-muted-foreground">{submission.student} · {tx(submission.time)}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">{submission.score}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 sm:p-6 min-w-0">
          <h3 className="font-semibold text-lg mb-4">{tx("Faculty Review Queue")}</h3>
          <div className="space-y-3">
            {["Acute swelling replay", "Synthetic periapical image", "Scenario rubric update", "Oral lesion case"].map((item) => (
              <div key={item} className="rounded-lg border border-border p-3 text-sm text-muted-foreground break-words">
                {tx(item)}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
