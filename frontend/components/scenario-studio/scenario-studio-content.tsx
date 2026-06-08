"use client"

import { useState } from "react"
import { BookOpen, CheckCircle2, FileCheck, ImageIcon, MessageCircle, Search, Settings2, ShieldCheck, Upload } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { scenarioBuilderSteps, scenarioDraftConfig } from "@/lib/mock-data"
import { useI18n } from "@/lib/i18n/i18n-provider"

const studioModules = [
  {
    icon: BookOpen,
    title: scenarioBuilderSteps[0],
    detail: "Acute mandibular swelling with urgent endodontic decision",
    fields: ["Endodontics", "Intermediate", "30 min"],
  },
  {
    icon: MessageCircle,
    title: scenarioBuilderSteps[1],
    detail: "42-year-old female, anxious, guarded but cooperative with empathy",
    fields: ["Low-to-moderate literacy", "Incomplete medication recall", "Hesitates on allergies"],
  },
  {
    icon: FileCheck,
    title: scenarioBuilderSteps[2],
    detail: "Severe lower molar pain and swelling with locked hidden diagnosis",
    fields: ["Fever", "Difficulty swallowing", "Rapidly spreading swelling"],
  },
  {
    icon: ImageIcon,
    title: scenarioBuilderSteps[3],
    detail: "Periapical radiograph, panoramic radiograph, CBCT, vitality test, CBC, CRP",
    fields: ["Synthetic image mode", "Faculty approval required"],
  },
  {
    icon: CheckCircle2,
    title: scenarioBuilderSteps[4],
    detail: "History, exam, diagnosis, treatment planning, communication, and safety",
    fields: ["10 points each", "Allergy missed penalty", "Unnecessary CBCT penalty"],
  },
  {
    icon: Settings2,
    title: scenarioBuilderSteps[5],
    detail: "Persona strictness medium, physiological consistency high, OSCE-level evaluator",
    fields: ["Safety Guardrail high", "Faculty-approved synthetic imaging"],
  },
  {
    icon: Upload,
    title: scenarioBuilderSteps[6],
    detail: "Preview, validate medical consistency, require faculty approval, publish to cohort",
    fields: ["Review required", "Cohort-ready"],
  },
  {
    icon: ShieldCheck,
    title: "Synthetic Patient Disclaimer",
    detail: "Synthetic educational patient. Not for real clinical decision-making.",
    fields: ["Faculty Validation", "No real patient data", "Training only"],
  },
]

const scenarioPreview = [
  ["Scenario", "Acute mandibular swelling with urgent endodontic decision"],
  ["Specialty", "Endodontics"],
  ["Difficulty", "Intermediate"],
  ["Duration", "30 min"],
  ["Persona", "Anxious patient"],
  ["Safety level", "High"],
  ["Faculty approval", "Required"],
]

const publishReadiness = [
  "Scenario basics complete",
  "Patient profile complete",
  "Clinical core complete",
  "Orders & imaging configured",
  "Rubric configured",
  "Agent configuration ready",
  "Faculty validation required",
]

const validationChecklist = [
  "Hidden diagnosis locked",
  "Red flags configured",
  "Unsafe prescribing guardrail enabled",
  "Synthetic imaging requires approval",
  "Rubric penalties defined",
]

const studioWorkflow = [
  {
    step: "01",
    title: "Draft scenario",
    detail: "Build clinical core, patient persona, orders, and scoring rules.",
  },
  {
    step: "02",
    title: "Validate safety",
    detail: "Check red flags, allergy rules, imaging rationale, and rubric penalties.",
  },
  {
    step: "03",
    title: "Publish to cohort",
    detail: "Release after faculty approval with training-only disclosure enabled.",
  },
]

export function ScenarioStudioContent() {
  const [status, setStatus] = useState("Draft has unsaved changes.")
  const { tx } = useI18n()

  return (
    <div className="space-y-6 animate-fade-in min-w-0">
      <div className="flex flex-col lg:flex-row gap-3 min-w-0">
        <div className="relative min-w-0 flex-1">
          <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={tx("Search scenario modules...")} className="pl-10 h-12" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 lg:shrink-0">
          <Button variant="outline" className="w-full bg-transparent" onClick={() => setStatus("Draft saved locally.")}>
            {tx("Save Draft")}
          </Button>
          <Button className="w-full" onClick={() => setStatus("Faculty Validation required before publishing.")}>
            {tx("Publish Scenario")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
        <div className="min-w-0 space-y-6">
          <Card className="p-4 sm:p-6 min-w-0">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg break-words">{tx(scenarioDraftConfig.title)}</h3>
                <p className="text-sm text-muted-foreground mt-1 break-words">
                  {tx("Identify red flags, sequence history/exam/imaging, and protect against unsafe prescribing.")}
                </p>
              </div>
              <Badge variant="secondary" className="whitespace-normal text-left self-start">
                {tx(status)}
              </Badge>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {studioModules.map((module, index) => (
              <Card
                key={module.title}
                className="p-4 sm:p-6 hover:shadow-lg transition-all duration-300 animate-slide-in min-w-0"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="flex items-start gap-4 min-w-0">
                  <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                    <module.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0 space-y-3">
                    <div>
                      <h3 className="font-semibold text-lg mb-1 break-words">{tx(module.title)}</h3>
                      <p className="text-sm text-muted-foreground break-words">{tx(module.detail)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {module.fields.map((field) => (
                        <Badge key={field} variant="outline" className="text-xs whitespace-normal text-left">
                          {tx(field)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="p-4 sm:p-6 min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h3 className="font-semibold text-lg">{tx("Studio Workflow")}</h3>
                <p className="text-sm text-muted-foreground">
                  {tx("Move from draft configuration to faculty-validated cohort release.")}
                </p>
              </div>
              <Badge variant="secondary" className="self-start">
                {tx("No backend required")}
              </Badge>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
              {studioWorkflow.map((item) => (
                <div key={item.step} className="rounded-lg border border-border p-4 min-w-0">
                  <div className="text-xs font-medium text-primary">{item.step}</div>
                  <div className="mt-2 font-medium break-words">{tx(item.title)}</div>
                  <p className="mt-1 text-sm text-muted-foreground break-words">{tx(item.detail)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <aside className="min-w-0 space-y-4 xl:sticky xl:top-6">
          <Card className="p-4 sm:p-5 min-w-0">
            <h3 className="font-semibold text-lg mb-4">{tx("Scenario Preview")}</h3>
            <div className="space-y-3">
              {scenarioPreview.map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{tx(label)}</span>
                  <span className="max-w-[65%] text-right font-medium text-foreground break-words">{tx(value)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 sm:p-5 min-w-0">
            <h3 className="font-semibold text-lg mb-4">{tx("Publish Readiness")}</h3>
            <CheckList items={publishReadiness} />
          </Card>

          <Card className="p-4 sm:p-5 min-w-0">
            <h3 className="font-semibold text-lg mb-4">{tx("Faculty Validation Checklist")}</h3>
            <CheckList items={validationChecklist} />
          </Card>

          <Card className="p-4 sm:p-5 min-w-0">
            <h3 className="font-semibold text-lg mb-2">{tx("Safety Guardrail Summary")}</h3>
            <p className="text-sm text-muted-foreground break-words">
              {tx("Allergy review, red-flag screening, and unsafe prescribing checks are required before cohort publishing.")}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">{tx("High safety level")}</Badge>
              <Badge variant="outline">{tx("Synthetic imaging approval")}</Badge>
              <Badge variant="outline">{tx("Training only")}</Badge>
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function CheckList({ items }: { items: string[] }) {
  const { tx } = useI18n()

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div key={item} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <span className="text-muted-foreground break-words">{tx(item)}</span>
        </div>
      ))}
    </div>
  )
}
