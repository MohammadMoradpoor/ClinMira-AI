"use client"

import { useEffect, useRef, useState } from "react"
import type { ReactNode, RefObject } from "react"
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ImageIcon,
  Mic,
  SendHorizontal,
  ShieldAlert,
  Stethoscope,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { blockedOutputs, orderCatalog } from "@/lib/mock-data"
import { useI18n } from "@/lib/i18n/i18n-provider"
import {
  applyFreeTextMessage,
  applySimulationAction,
  createInitialSimulationState,
  getImagingForCase,
  type SimulationState,
} from "@/lib/simulation-engine"
import type { SimulationActionId } from "@/types"

type ActionMode = "Ask" | "Empathize" | "Examine" | "Order" | "Explain"

const actionModes: ActionMode[] = ["Ask", "Empathize", "Examine", "Order", "Explain"]

const clinicalActions: Array<{
  label: string
  mode: ActionMode
  action: SimulationActionId
}> = [
  { label: "Ask pain duration", mode: "Ask", action: "askPainDuration" },
  { label: "Ask allergy", mode: "Ask", action: "askAllergy" },
  { label: "Ask medication history", mode: "Ask", action: "askMedicationHistory" },
  { label: "Check fever/swallowing", mode: "Ask", action: "checkFeverSwallowing" },
  { label: "Empathize", mode: "Empathize", action: "giveEmpatheticResponse" },
  { label: "Rushed communication", mode: "Empathize", action: "giveRushedResponse" },
  { label: "Perform percussion test", mode: "Examine", action: "performPercussion" },
  { label: "Order periapical radiograph", mode: "Order", action: "orderPeriapicalRadiograph" },
  { label: "Order CBCT", mode: "Order", action: "orderCbct" },
  { label: "Explain treatment plan", mode: "Explain", action: "explainTreatmentPlan" },
  { label: "Submit diagnosis", mode: "Explain", action: "submitCorrectDiagnosis" },
  { label: "Unsafe treatment", mode: "Explain", action: "submitUnsafeTreatment" },
]

const priorityActions: SimulationActionId[] = [
  "askPainDuration",
  "askAllergy",
  "askMedicationHistory",
  "checkFeverSwallowing",
  "orderPeriapicalRadiograph",
  "performPercussion",
  "explainTreatmentPlan",
]

const suggestedQuestions = [
  "When did the pain start?",
  "Is the swelling increasing?",
  "Do you have fever or difficulty swallowing?",
  "Do you have any medication allergies?",
  "Are you taking any medications?",
  "Prior treatment on this tooth?",
]

const workspaceSections = {
  history: [
    ["Chief complaint", "Lower molar pain with swelling"],
    ["HPI", "Progressive pain, nocturnal worsening, swelling for 48 hours"],
    ["Medical history", "Hypertension, details incomplete"],
    ["Medications", "Unknown antihypertensive"],
    ["Allergies", "Possible antibiotic allergy, requires clarification"],
    ["Dental history", "Previous deep restoration on lower molar"],
    ["Social history", "Avoids dental care due to anxiety"],
  ],
  exam: [
    ["Extraoral", "Mild facial swelling"],
    ["Intraoral", "Localized vestibular swelling near mandibular molar"],
    ["Percussion", "Positive"],
    ["Palpation", "Tender"],
    ["Mobility", "Mild"],
    ["Probing", "Within normal limits around involved tooth"],
    ["Pulp test", "Negative response on suspected tooth"],
  ],
}

const diagnosisItems = [
  "Acute apical abscess",
  "Symptomatic apical periodontitis",
  "Periodontal abscess",
  "Cracked tooth syndrome",
  "Reversible pulpitis",
]

const evidenceChips = [
  "Severe spontaneous pain",
  "Percussion positive",
  "Swelling present",
  "Negative pulp response",
  "Periapical change on imaging",
  "Allergy not fully clarified",
]

const nextSafeActions = [
  "Clarify antibiotic allergy",
  "Check fever/swallowing",
  "Review medications",
  "Confirm first-line imaging",
]

const treatmentPlan = [
  "Emergency drainage if indicated",
  "Root canal treatment or extraction depending restorability",
  "Pain control",
  "Antibiotic only if systemic involvement or spreading infection",
  "Safety check before prescribing",
  "Patient anxiety management",
  "Follow-up appointment",
]

const safetyChecklist = [
  "Allergy checked?",
  "Medical history reviewed?",
  "Red flags reviewed?",
  "Imaging reviewed?",
  "Patient instructions given?",
]

const agentDisplayStatus: Record<string, string> = {
  "persona-agent": "Active",
  "physiology-agent": "Validating",
  "imaging-agent": "Ready",
  "evaluator-agent": "Monitoring",
  "safety-agent": "Warning",
  "faculty-review-agent": "Idle",
}

function metricTone(value: number) {
  if (value >= 80) return "text-primary"
  if (value >= 60) return "text-amber-600"
  return "text-destructive"
}

function hasAction(state: SimulationState, action: SimulationActionId) {
  return state.completedActions.includes(action)
}

export function VirtualClinicContent() {
  const [simulation, setSimulation] = useState(() => createInitialSimulationState("acute-apical-abscess"))
  const [activeMode, setActiveMode] = useState<ActionMode>("Ask")
  const [composerText, setComposerText] = useState("")
  const [imagingVisible, setImagingVisible] = useState(false)
  const [notice, setNotice] = useState("Live Patient Twin Encounter active.")
  const messageEndRef = useRef<HTMLDivElement | null>(null)
  const previousChatLengthRef = useRef(simulation.chat.length)
  const imaging = getImagingForCase(simulation.caseId)[0]
  const allergyDisclosed = simulation.discoveredHistory.includes("Possible antibiotic allergy discovered")
  const unsafeBlocked = simulation.completedActions.includes("submitUnsafeTreatment")
  const visibleActions = clinicalActions.filter(
    (item) => item.mode === activeMode && !priorityActions.includes(item.action),
  )
  const quickActions = priorityActions
    .map((action) => clinicalActions.find((item) => item.action === action))
    .filter((item): item is (typeof clinicalActions)[number] => Boolean(item))

  useEffect(() => {
    if (simulation.chat.length > previousChatLengthRef.current) {
      messageEndRef.current?.scrollIntoView({ block: "end", behavior: "smooth" })
    }

    previousChatLengthRef.current = simulation.chat.length
  }, [simulation.chat.length])

  const runAction = (action: SimulationActionId) => {
    setSimulation((current) => applySimulationAction(current, action))

    if (action === "orderPeriapicalRadiograph") {
      setImagingVisible(true)
      setNotice("Imaging Agent released a faculty-approved periapical view.")
    } else if (action === "orderCbct") {
      setNotice("Safety Agent checked whether CBCT was justified by first-line imaging.")
    } else if (action === "askAllergy") {
      setNotice("Safety Agent: allergy status is not fully clarified. Prescribing remains unsafe.")
    } else if (action === "giveEmpatheticResponse") {
      setNotice("Persona Agent: patient becomes calmer after empathetic communication.")
    } else if (action === "submitUnsafeTreatment") {
      setNotice("Unsafe output blocked before treatment was accepted.")
    } else {
      setNotice("Patient twin state and agent notes updated.")
    }
  }

  const sendMessage = () => {
    const message = composerText.trim()
    if (!message) {
      return
    }

    setSimulation((current) => applyFreeTextMessage(current, message))
    setComposerText("")
    setNotice("Persona Agent responded from the constrained scenario fact set.")
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[230px_minmax(0,1fr)_260px] 2xl:grid-cols-[260px_minmax(0,1fr)_300px] xl:items-start animate-fade-in">
      <PatientTwinPanel
        simulation={simulation}
        allergyDisclosed={allergyDisclosed}
        className="order-2 xl:order-1 xl:col-start-1 xl:row-start-1 xl:h-[calc(100svh-7.5rem)] xl:min-h-[720px] xl:max-h-[880px] 2xl:h-[calc(100svh-7rem)] 2xl:min-h-[760px] 2xl:max-h-[940px]"
      />

      <EncounterConversation
        simulation={simulation}
        activeMode={activeMode}
        composerText={composerText}
        visibleActions={visibleActions}
        quickActions={quickActions}
        messageEndRef={messageEndRef}
        allergyDisclosed={allergyDisclosed}
        notice={notice}
        className="order-1 xl:order-2 xl:col-start-2 xl:row-start-1 xl:h-[calc(100svh-7.5rem)] xl:min-h-[720px] xl:max-h-[880px] 2xl:h-[calc(100svh-7rem)] 2xl:min-h-[760px] 2xl:max-h-[940px]"
        onModeChange={setActiveMode}
        onComposerTextChange={setComposerText}
        onSendMessage={sendMessage}
        onRunAction={runAction}
      />

      <ClinicalWorkspace
        unresolvedAllergy
        imagingVisible={imagingVisible}
        imaging={imaging}
        className="order-3 xl:order-4 xl:col-span-2 xl:row-start-2"
      />

      <EncounterContextPanel
        simulation={simulation}
        notice={notice}
        className="order-4 xl:order-3 xl:col-start-3 xl:row-start-1 xl:h-[calc(100svh-7.5rem)] xl:min-h-[720px] xl:max-h-[880px] 2xl:h-[calc(100svh-7rem)] 2xl:min-h-[760px] 2xl:max-h-[940px]"
      />

      <div className="order-5 xl:order-5 xl:col-start-3 xl:row-start-2 space-y-4">
        <Card className="p-4 md:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            <TranslatedHeading text="Imaging Result Card" />
          </div>
          <ImagingResult imagingVisible={imagingVisible} imaging={imaging} compact />
        </Card>

        <ClinicalTimeline simulation={simulation} />

        {unsafeBlocked && (
          <Card className="p-4 md:p-5 space-y-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              <TranslatedHeading text="Blocked Outputs" />
            </div>
            {blockedOutputs.map((item) => (
              <p key={item} className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
                <TranslatedInline text={item} />
              </p>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}

function TranslatedHeading({ text }: { text: string }) {
  const { tx } = useI18n()

  return <h3 className="text-lg font-semibold text-foreground">{tx(text)}</h3>
}

function TranslatedInline({ text }: { text: string }) {
  const { tx } = useI18n()

  return <>{tx(text)}</>
}

function PatientTwinPanel({
  simulation,
  allergyDisclosed,
  className = "",
}: {
  simulation: SimulationState
  allergyDisclosed: boolean
  className?: string
}) {
  const { tx } = useI18n()

  return (
    <Card className={`p-4 space-y-3 xl:flex xl:flex-col xl:overflow-y-auto xl:scrollbar-premium ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{tx("Synthetic Educational Patient")}</p>
          <h3 className="text-xl font-semibold leading-tight text-foreground mt-1">{simulation.patient.name}</h3>
        </div>
        <Badge variant="secondary" className="capitalize shrink-0">
          {tx(simulation.patient.condition)}
        </Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-3 text-sm">
        <CompactFact label={tx("Age")} value={String(simulation.patient.age)} />
        <CompactFact label={tx("Sex")} value={tx(simulation.patient.sex)} />
        <CompactFact label={tx("Pain")} value={`${simulation.patient.painScore}/10`} />
        <CompactFact label={tx("Pulse")} value={`${simulation.patient.vitals.heartRate} bpm`} />
        <CompactFact label={tx("Temp")} value={`${simulation.patient.vitals.temperatureC}C`} />
        <CompactFact label={tx("BP")} value={simulation.patient.vitals.bloodPressure} />
      </div>

      <div>
        <p className="text-muted-foreground text-xs">{tx("Chief complaint")}</p>
        <p className="font-medium text-sm text-foreground mt-1">{tx(simulation.patient.chiefComplaint)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-3">
        <MetricBar
          label={tx("Anxiety")}
          value={simulation.patient.anxietyLevel}
          display={simulation.patient.anxietyLevel >= 70 ? tx("High") : tx("Moderate")}
          tone={metricTone(100 - simulation.patient.anxietyLevel)}
        />
        <MetricBar
          label={tx("Trust")}
          value={simulation.patient.trustLevel}
          display={simulation.patient.trustLevel >= 65 ? tx("Improving") : tx("Developing")}
          tone="text-primary"
        />
      </div>

      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="text-muted-foreground text-xs">{tx("Allergy")}</p>
        <p className="font-medium text-foreground mt-1">
          {allergyDisclosed ? tx("Possible antibiotic allergy disclosed") : tx("Unknown until asked")}
        </p>
      </div>

      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="font-medium text-foreground">{tx("Red flag")}</p>
        <p className="text-muted-foreground mt-1">{tx("Spreading infection must be ruled out.")}</p>
      </div>

    </Card>
  )
}

function EncounterConversation({
  simulation,
  activeMode,
  composerText,
  visibleActions,
  quickActions,
  messageEndRef,
  allergyDisclosed,
  notice,
  className = "",
  onModeChange,
  onComposerTextChange,
  onSendMessage,
  onRunAction,
}: {
  simulation: SimulationState
  activeMode: ActionMode
  composerText: string
  visibleActions: typeof clinicalActions
  quickActions: typeof clinicalActions
  messageEndRef: RefObject<HTMLDivElement | null>
  allergyDisclosed: boolean
  notice: string
  className?: string
  onModeChange: (mode: ActionMode) => void
  onComposerTextChange: (value: string) => void
  onSendMessage: () => void
  onRunAction: (action: SimulationActionId) => void
}) {
  const { tx } = useI18n()
  const discoveredEvidence =
    simulation.discoveredHistory.length > 0
      ? simulation.discoveredHistory.slice(0, 5)
      : [
          "Pain duration disclosed",
          "Swelling progression noted",
          "Possible antibiotic allergy",
          "Hypertension history surfaced",
        ]

  return (
    <Card
      data-qa="patient-encounter-card"
      className={`p-0 overflow-hidden flex flex-col h-[calc(100svh-7rem)] min-h-[770px] max-h-[900px] sm:min-h-[780px] md:min-h-[820px] xl:min-h-0 ${className}`}
    >
      <div className="p-3 md:p-4 border-b border-border space-y-2 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-foreground md:text-xl">{tx("Patient Encounter Conversation")}</h3>
            <p className="hidden text-sm text-muted-foreground mt-1 2xl:block">
              {tx("Action-based interview with patient twin and agent safety feedback.")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{tx("Live patient twin")}</Badge>
            <Badge variant="outline">{tx("Safety monitored")}</Badge>
            <Badge variant={allergyDisclosed ? "destructive" : "outline"}>
              {allergyDisclosed ? tx("Clarification needed") : tx("Allergy unknown")}
            </Badge>
          </div>
        </div>

        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-sm text-destructive">
          <div className="flex gap-2">
            <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">{tx("Safety Guardrail Warning")}</p>
              <p className="2xl:hidden">{tx("Allergy unresolved; prescribing unsafe.")}</p>
              <p className="hidden 2xl:block">{tx("Allergy status is not fully clarified. Prescribing remains unsafe.")}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col bg-muted/20">
        <div
          data-qa="patient-encounter-messages"
          className="min-h-0 flex-1 scroll-smooth overflow-y-auto scrollbar-premium px-4 md:px-5 py-4 md:py-5 space-y-4"
        >
          {simulation.chat.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          <EncounterConversationSummary discoveredEvidence={discoveredEvidence} notice={notice} />
          <div ref={messageEndRef} />
        </div>

      </div>

      <div
        data-qa="encounter-composer"
        className="border-t border-border bg-card p-2 md:p-3 space-y-2 shrink-0"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end 2xl:justify-between">
          <div className="hidden min-w-0 2xl:block">
            <p className="text-xs font-medium text-foreground">{tx("Clinical action mode")}</p>
            <p className="hidden text-xs text-muted-foreground 2xl:block">
              {tx("Choose the intent before sending or running an action.")}
            </p>
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-premium pb-1 lg:pb-0">
            {actionModes.map((mode) => (
              <Button
                key={mode}
                variant={activeMode === mode ? "default" : "outline"}
                size="sm"
                onClick={() => onModeChange(mode)}
                className={`h-8 shrink-0 ${activeMode === mode ? "" : "bg-transparent"}`}
              >
                {tx(mode)}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-background/95 p-2 shadow-sm flex flex-col gap-2">
          <div className="order-2 flex gap-2 overflow-x-auto scrollbar-premium pb-1 md:order-1">
            {quickActions.map((item) => (
              <Button
                key={item.action}
                variant="outline"
                size="sm"
                className="h-8 shrink-0 justify-start bg-transparent text-xs"
                onClick={() => onRunAction(item.action)}
                disabled={hasAction(simulation, item.action)}
              >
                {tx(item.label)}
              </Button>
            ))}
          </div>

          {visibleActions.length > 0 && (
            <div className="order-3 flex gap-2 overflow-x-auto scrollbar-premium pb-1 md:order-2">
              {visibleActions.map((item) => (
                <Button
                  key={item.label}
                  variant={item.action === "submitUnsafeTreatment" ? "destructive" : "outline"}
                  size="sm"
                  className="h-8 shrink-0 justify-start bg-transparent text-xs"
                  onClick={() => onRunAction(item.action)}
                  disabled={hasAction(simulation, item.action) && item.action !== "submitUnsafeTreatment"}
                >
                  {tx(item.label)}
                </Button>
              ))}
            </div>
          )}

          <div className="order-1 flex flex-col gap-2 sm:flex-row md:order-3">
            <Input
              value={composerText}
              onChange={(event) => onComposerTextChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  onSendMessage()
                }
              }}
              placeholder={tx("Ask the patient, choose a clinical action, or explain the next step...")}
              className="h-10 min-w-0 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
              aria-label={tx("Patient encounter message")}
            />
            <div className="grid grid-cols-2 sm:flex gap-2">
              <Button variant="outline" className="h-10 bg-transparent whitespace-nowrap">
                <Mic className="w-4 h-4 mr-2" />
                {tx("Voice Interview")}
              </Button>
              <Button className="h-10" onClick={onSendMessage}>
                <SendHorizontal className="w-4 h-4 mr-2" />
                {tx("Send")}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

function MessageBubble({
  message,
}: {
  message: SimulationState["chat"][number]
}) {
  const { tx } = useI18n()
  const isStudent = message.speaker === "student"
  const isAgent = message.speaker === "system"
  const roleLabel =
    message.speaker === "patient" ? "Patient Twin" : isStudent ? "Student" : message.tone === "warning" ? "Safety Agent" : "Agent Note"

  return (
    <div
      className={`w-fit max-w-[min(92%,44rem)] rounded-2xl border border-border p-3 text-sm shadow-sm md:p-4 ${
        isStudent
          ? "ml-auto bg-primary text-primary-foreground"
          : isAgent
            ? "mx-auto bg-background/90"
            : "mr-auto bg-card"
      }`}
    >
      <div className="flex items-center justify-between gap-3 mb-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-wide">
          {tx(roleLabel)}
        </span>
        {message.tone === "warning" && <AlertTriangle className="w-4 h-4 shrink-0" />}
      </div>
      <p className="leading-relaxed">{tx(message.text)}</p>
    </div>
  )
}

function EncounterConversationSummary({
  discoveredEvidence,
  notice,
}: {
  discoveredEvidence: string[]
  notice: string
}) {
  const { tx } = useI18n()

  return (
    <div className="mx-auto w-full max-w-[44rem] rounded-2xl border border-border bg-background/90 p-3 text-xs shadow-sm md:p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <CompactSignalPanel title={tx("Next safe actions")} items={nextSafeActions.map((item) => tx(item))} />
        <CompactSignalPanel title={tx("Evidence added")} items={discoveredEvidence.map((item) => tx(item))} />
      </div>
      <div className="mt-3 rounded-lg border border-border bg-card p-3 text-muted-foreground">
        <span className="font-medium text-foreground">{tx("Agent interpretation: ")}</span>
        {tx(notice)}
      </div>
    </div>
  )
}

function CompactSignalPanel({
  title,
  items,
}: {
  title: string
  items: string[]
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium text-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="max-w-full whitespace-normal text-[11px]">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function EncounterContextPanel({
  simulation,
  notice,
  className = "",
}: {
  simulation: SimulationState
  notice: string
  className?: string
}) {
  const { tx } = useI18n()
  const evidence =
    simulation.discoveredHistory.length > 0
      ? simulation.discoveredHistory
      : [
          "Pain duration disclosed",
          "Medication history discovered",
          "Possible antibiotic allergy discovered",
          "Hypertension history surfaced",
          "Swelling progression noted",
        ]

  return (
    <div className={`min-w-0 ${className}`}>
      <Card className="h-full overflow-hidden p-4">
        <div className="h-full space-y-3 overflow-y-auto scrollbar-premium pr-1">
        <ContextBlock title={tx("Non-verbal cues")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
            {simulation.patient.persona.nonVerbalCues.map((cue) => (
              <div key={cue} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                {tx(cue)}
              </div>
            ))}
          </div>
        </ContextBlock>

        <ContextBlock title={tx("Suggested questions")}>
          <div className="flex flex-wrap gap-2 pb-1">
            {suggestedQuestions.map((question) => (
              <Badge key={question} variant="outline" className="max-w-full whitespace-normal break-words text-xs">
                {tx(question)}
              </Badge>
            ))}
          </div>
        </ContextBlock>

        <ContextBlock title={tx("Clinical evidence added")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-2">
            {evidence.map((item) => (
              <div key={item} className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground">
                {tx(item)}
              </div>
            ))}
          </div>
        </ContextBlock>

        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="font-medium">{tx("Agent interpretation")}</p>
          <p className="text-muted-foreground mt-1">{tx(notice)}</p>
        </div>

        <AgentStatusStrip simulation={simulation} />
        </div>
      </Card>
    </div>
  )
}

function AgentStatusStrip({ simulation }: { simulation: SimulationState }) {
  const { tx } = useI18n()

  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">{tx("Agent Status Strip")}</h4>
      <div className="space-y-2">
        {simulation.agents.map((agent) => (
          <div key={agent.id} className="rounded-lg border border-border p-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="font-medium text-foreground">{tx(agent.name)}</p>
              <Badge
                variant={agent.status === "warning" || agent.status === "blocked" ? "destructive" : "secondary"}
                className="shrink-0 text-[10px]"
              >
                {tx(agentDisplayStatus[agent.id] ?? agent.status)}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{tx(agent.lastAction)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClinicalWorkspace({
  unresolvedAllergy,
  imagingVisible,
  imaging,
  className = "",
}: {
  unresolvedAllergy: boolean
  imagingVisible: boolean
  imaging?: ReturnType<typeof getImagingForCase>[number]
  className?: string
}) {
  const { tx } = useI18n()

  return (
    <Card data-qa="clinical-workspace" className={`min-w-0 p-4 md:p-5 ${className}`}>
      <Tabs defaultValue="history" className="w-full">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">{tx("Clinical Workspace")}</h3>
            <p className="text-sm text-muted-foreground">{tx("History, exam, orders, imaging, diagnosis, and treatment.")}</p>
          </div>
          <div className="w-full lg:w-auto overflow-x-auto scrollbar-premium pb-1">
            <TabsList className="min-w-max justify-start">
              <TabsTrigger value="history" className="whitespace-nowrap">{tx("History")}</TabsTrigger>
              <TabsTrigger value="exam" className="whitespace-nowrap">{tx("Exam")}</TabsTrigger>
              <TabsTrigger value="orders" className="whitespace-nowrap">{tx("Orders")}</TabsTrigger>
              <TabsTrigger value="imaging" className="whitespace-nowrap">{tx("Imaging")}</TabsTrigger>
              <TabsTrigger value="diagnosis" className="whitespace-nowrap">{tx("Diagnosis")}</TabsTrigger>
              <TabsTrigger value="treatment" className="whitespace-nowrap">{tx("Treatment")}</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="history">
          <WorkspaceGrid items={workspaceSections.history} />
        </TabsContent>

        <TabsContent value="exam">
          <WorkspaceGrid items={workspaceSections.exam} />
        </TabsContent>

        <TabsContent value="orders">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {orderCatalog.slice(0, 6).map((order) => (
              <div key={order.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium text-foreground">{tx(order.name)}</p>
                  <Badge variant="outline">{tx(order.costLevel)}</Badge>
                </div>
                <p className="text-muted-foreground mt-2">{tx(order.educationalRelevance)}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {tx("Time")}: {tx(order.timeDelay)} · {tx("Risk")}: {tx(order.riskLevel)}
                </p>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="imaging">
          <ImagingResult imagingVisible={imagingVisible} imaging={imaging} />
        </TabsContent>

        <TabsContent value="diagnosis">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {diagnosisItems.map((item) => (
                <div key={item} className="rounded-lg border border-border p-3 text-sm font-medium">
                  {tx(item)}
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-2">{tx("Evidence chips")}</h4>
              <div className="flex flex-wrap gap-2">
                {evidenceChips.map((chip) => (
                  <Badge key={chip} variant="outline">
                    {tx(chip)}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {tx("Do not submit final treatment before allergy status is clarified. Consider systemic red flags before prescribing.")}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="treatment">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {treatmentPlan.map((item) => (
                <div key={item} className="flex items-start gap-2 rounded-lg border border-border p-3 text-sm">
                  <Stethoscope className="w-4 h-4 mt-0.5 text-primary shrink-0" />
                  <span>{tx(item)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {safetyChecklist.map((item) => {
                const complete =
                  item.includes("Allergy") ? !unresolvedAllergy : item.includes("Imaging") ? imagingVisible : false
                return (
                  <div key={item} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                    <span>{tx(item)}</span>
                    {complete ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  )
}

function WorkspaceGrid({ items }: { items: string[][] }) {
  const { tx } = useI18n()

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-border p-3 text-sm">
          <p className="font-medium text-foreground">{tx(label)}</p>
          <p className="text-muted-foreground mt-1">{tx(value)}</p>
        </div>
      ))}
    </div>
  )
}

function ClinicalTimeline({ simulation }: { simulation: SimulationState }) {
  const { tx } = useI18n()

  return (
    <Card className="p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">{tx("Clinical Timeline")}</h3>
      </div>
      <div className="space-y-3 max-h-[360px] overflow-y-auto scrollbar-premium pr-1">
        {simulation.timeline.map((event) => (
          <div key={event.id} className="flex gap-3 text-sm">
            <span className="text-xs text-muted-foreground w-12 shrink-0">{event.timestamp}</span>
            <div className="border-l border-border pl-3 pb-3">
              <p className="font-medium text-foreground">{tx(event.title)}</p>
              <p className="text-muted-foreground">{tx(event.description)}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

function ContextBlock({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div>
      <h4 className="text-sm font-semibold mb-2">{title}</h4>
      {children}
    </div>
  )
}

function CompactFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs">{label}</p>
      <p className="font-medium text-foreground">{value}</p>
    </div>
  )
}

function MetricBar({
  label,
  value,
  display,
  tone,
}: {
  label: string
  value: number
  display: string
  tone: string
}) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className={`font-medium ${tone}`}>{display}</span>
      </div>
      <Progress value={value} />
    </div>
  )
}

function ImagingResult({
  imagingVisible,
  imaging,
  compact = false,
}: {
  imagingVisible: boolean
  imaging?: ReturnType<typeof getImagingForCase>[number]
  compact?: boolean
}) {
  const { tx } = useI18n()

  if (!imagingVisible || !imaging) {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        {tx("Order a periapical radiograph to release the synthetic educational image.")}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-border p-4 bg-muted/30">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{tx("Synthetic educational radiograph")}</p>
            <h4 className="font-semibold text-foreground mt-1">{tx(imaging.label)}</h4>
          </div>
          <Badge variant="secondary">{tx("Faculty approved")}</Badge>
        </div>
        <div className="mt-4 aspect-[16/9] rounded-lg border border-border bg-background flex items-center justify-center">
          <div className="text-center px-4">
            <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="text-xs text-muted-foreground mt-2">{tx("Synthetic educational image. Not real patient data.")}</p>
          </div>
        </div>
      </div>

      <div className={`grid ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"} gap-3`}>
        {imaging.findings.slice(0, compact ? 2 : 3).map((finding) => (
          <div key={finding} className="rounded-lg border border-border p-3 text-sm">
            {tx(finding)}
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">
        Compare baseline vs progression. Disease Progression: Stable / Worsening / Post-treatment.
      </div>
    </div>
  )
}
