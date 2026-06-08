export type PatientCondition = "stable" | "worsening" | "critical"

export type SimulationActionId =
  | "askPainDuration"
  | "askAllergy"
  | "askMedicationHistory"
  | "checkFeverSwallowing"
  | "giveEmpatheticResponse"
  | "giveRushedResponse"
  | "performPercussion"
  | "orderPeriapicalRadiograph"
  | "orderCbct"
  | "submitCorrectDiagnosis"
  | "explainTreatmentPlan"
  | "submitUnsafeTreatment"

export type User = {
  id: string
  name: string
  role: string
  institution: string
  program: string
  focusArea: string
  avatarInitials: string
  unreadNotifications: number
}

export type Case = {
  id: string
  title: string
  specialty: string
  difficulty: string
  durationMinutes: number
  targetCompetencies: string[]
  personaLabel: string
  modalities: string[]
  status: string
  summary: string
  chiefComplaint: string
  hiddenDiagnosis: string
  assignedToday: boolean
  facultyApproved: boolean
  coverAccent: string
  stationLabel: string
  alerts: string[]
}

export type PatientTwin = {
  id: string
  caseId: string
  name: string
  age: number
  sex: string
  avatarLabel: string
  chiefComplaint: string
  painScore: number
  anxietyLevel: number
  trustLevel: number
  timerMinutesRemaining: number
  condition: PatientCondition
  allergyStatus: string
  hiddenHistoryPrompt: string
  medicalAlerts: string[]
  riskFlags: string[]
  vitals: {
    bloodPressure: string
    heartRate: number
    temperatureC: number
    oxygenSat: number
  }
  history: {
    hpi: string
    pastMedicalHistory: string
    medications: string
    allergies: string
    socialHistory: string
    dentalHistory: string
  }
  exam: {
    extraoral: string
    intraoral: string
    periodontal: string
    pulpTests: string
    percussion: string
    palpation: string
    mobility: string
    probingDepth: string
    softTissue: string
  }
  persona: {
    badge: string
    emotionBaseline: string
    nonVerbalCues: string[]
    communicationStyle: string
    reliability: string
    healthLiteracy: string
  }
}

export type ClinicalOrder = {
  id: string
  name: string
  costLevel: string
  timeDelay: string
  riskLevel: string
  educationalRelevance: string
}

export type ImagingStudy = {
  id: string
  label: string
  type: string
  viewHint: string
  findings: string[]
  annotations: string[]
  watermark: string
  approved: boolean
  agentStatus: string
}

export type Agent = {
  id: string
  name: string
  role: string
  status: "idle" | "thinking" | "validating" | "generating" | "warning" | "blocked"
  confidence: number
  latencyMs: number
  validationStatus: string
  warnings: string[]
  lastAction: string
}

export type TimelineEvent = {
  id: string
  type: "question" | "warning" | "order" | "empathy" | "exam" | "diagnosis" | "treatment"
  title: string
  description: string
  timestamp: string
}

export type AgentEvent = {
  id: string
  title: string
  description: string
  severity: "info" | "warning" | "success"
  timestamp: string
}

export type SkillProgress = {
  competency: string
  current: number
  target: number
}

export type FacultyMetric = {
  label: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
}

export type ReasoningNode = {
  id: string
  stage: string
  label: string
  detail: string
  tone?: "success" | "warning" | "danger"
}

export type RubricItem = {
  label: string
  feedback: string
  score: number
  maxScore: number
  emphasis: "normal" | "warning" | "danger"
}

export type DebriefReport = {
  caseId: string
  overallScore: number
  caseOutcome: string
  diagnosisAccuracy: number
  treatmentSafety: number
  communicationQuality: number
  timeEfficiency: number
  clinicalReasoning: number
  patientTrustFinal: number
  safetyScore: number
  strengths: string[]
  criticalMisses: string[]
  unsafeActions: string[]
  missedQuestions: string[]
  correctReasoningPath: ReasoningNode[]
  userReasoningPath: ReasoningNode[]
  timelineReplay: TimelineEvent[]
  facultyRubric: RubricItem[]
  suggestedNextCaseIds: string[]
  replayMistakes: Array<{
    title: string
    detail: string
    impact: string
  }>
}

export type ScenarioDraft = {
  title: string
  specialty: string
  difficulty: string
  estimatedDuration: number
  learningObjectives: string[]
  patientProfile: {
    age: number
    sex: string
    background: string
    healthLiteracy: string
    anxietyLevel: string
    communicationStyle: string
    personaType: string
    reliability: string
  }
  clinicalCore: {
    chiefComplaint: string
    hiddenDiagnosis: string
    differentialDiagnoses: string[]
    redFlags: string[]
    contraindications: string[]
    symptomProgressionRules: string[]
    dangerousActions: string[]
  }
  ordersAndImaging: {
    availableTests: string[]
    expectedResults: string[]
    imagingType: string
    facultyApprovalRequired: boolean
    syntheticImageMode: boolean
  }
  rubric: RubricItem[]
  agentConfiguration: {
    personaStrictness: number
    physiologicalConsistency: number
    imagingGenerationMode: string
    evaluatorStrictness: number
    safetyGuardrailLevel: number
  }
}
