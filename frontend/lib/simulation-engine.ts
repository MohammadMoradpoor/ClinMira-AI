import {
  Agent,
  Case,
  ImagingStudy,
  PatientTwin,
  PatientCondition,
  SimulationActionId,
  TimelineEvent,
} from "@/types"
import {
  baseAgents,
  caseById,
  imagingData,
  initialTimelineByCaseId,
  orderCatalog,
  patientByCaseId,
} from "@/lib/mock-data"

export type SimulationChatMessage = {
  id: string
  speaker: "student" | "patient" | "system"
  text: string
  tone?: "warning" | "neutral"
}

export type SimulationScores = {
  diagnosisAccuracy: number
  treatmentSafety: number
  communicationQuality: number
  timeEfficiency: number
  clinicalReasoning: number
  safetyScore: number
}

export type SimulationBanner = {
  id: string
  message: string
  tone: "info" | "success" | "warning"
}

export type SimulationState = {
  caseId: string
  caseItem: Case
  patient: PatientTwin
  agents: Agent[]
  chat: SimulationChatMessage[]
  discoveredHistory: string[]
  completedActions: SimulationActionId[]
  orderedTests: string[]
  timeline: TimelineEvent[]
  scores: SimulationScores
  banners: SimulationBanner[]
  diagnosisHypotheses: string[]
  diagnosisConfidence: number
}

export type SimulationSnapshot = {
  caseId: string
  trustLevel: number
  anxietyLevel: number
  painScore: number
  condition: PatientCondition
  discoveredHistory: string[]
  completedActions: SimulationActionId[]
  orderedTests: string[]
  timeline: TimelineEvent[]
  scores: SimulationScores
}

function cloneState<T>(value: T): T {
  return structuredClone(value)
}

function makeTimelineTimestamp(length: number) {
  const totalMinutes = length * 2
  const minutes = `${totalMinutes}`.padStart(2, "0")
  return `00:${minutes}`
}

function uniquePush<T>(array: T[], value: T) {
  return array.includes(value) ? array : [...array, value]
}

function setAgentState(
  agents: Agent[],
  agentId: string,
  patch: Partial<Agent>,
) {
  return agents.map((agent) => (agent.id === agentId ? { ...agent, ...patch } : agent))
}

function pushTimeline(state: SimulationState, event: Omit<TimelineEvent, "id" | "timestamp">) {
  state.timeline.push({
    ...event,
    id: `timeline-${state.timeline.length + 1}`,
    timestamp: makeTimelineTimestamp(state.timeline.length),
  })
}

function pushChat(
  state: SimulationState,
  message: Omit<SimulationChatMessage, "id">,
) {
  state.chat.push({
    ...message,
    id: `chat-${state.chat.length + 1}`,
  })
}

function pushBanner(
  state: SimulationState,
  banner: Omit<SimulationBanner, "id">,
) {
  state.banners = [
    { ...banner, id: `banner-${Date.now()}-${state.banners.length}` },
    ...state.banners,
  ].slice(0, 3)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function updatePatientState(
  state: SimulationState,
  patch: Partial<Pick<SimulationState["patient"], "trustLevel" | "anxietyLevel" | "painScore" | "condition" | "allergyStatus">>,
) {
  state.patient = {
    ...state.patient,
    ...patch,
    trustLevel: clamp(patch.trustLevel ?? state.patient.trustLevel, 0, 100),
    anxietyLevel: clamp(patch.anxietyLevel ?? state.patient.anxietyLevel, 0, 100),
    painScore: clamp(patch.painScore ?? state.patient.painScore, 0, 10),
  }
}

function markAction(state: SimulationState, action: SimulationActionId) {
  state.completedActions = uniquePush(state.completedActions, action)
}

function evidenceReady(state: SimulationState) {
  return (
    state.orderedTests.includes("Periapical radiograph") &&
    state.completedActions.includes("performPercussion") &&
    state.discoveredHistory.includes("Pain duration disclosed")
  )
}

export function createInitialSimulationState(caseId: string): SimulationState {
  const caseItem = caseById.get(caseId)
  const patient = patientByCaseId.get(caseId)

  if (!caseItem || !patient) {
    throw new Error(`Unable to initialize simulation for case: ${caseId}`)
  }

  return {
    caseId,
    caseItem,
    patient: cloneState(patient),
    agents: cloneState(baseAgents),
    chat: [
      {
        id: "chat-1",
        speaker: "patient",
        text: "I have had this tooth pain for days. I am scared it is getting worse, but I really hate dental treatment.",
      },
      {
        id: "chat-2",
        speaker: "student",
        text: "Can you tell me when the pain started?",
      },
      {
        id: "chat-3",
        speaker: "patient",
        text: "It started about five days ago. Last night it became much worse.",
      },
      {
        id: "chat-4",
        speaker: "system",
        tone: "neutral",
        text: "Synthetic educational patient loaded. Faculty validation remains in the loop for critical outputs.",
      },
    ],
    discoveredHistory: [],
    completedActions: [],
    orderedTests: [],
    timeline: cloneState(initialTimelineByCaseId[caseId] ?? initialTimelineByCaseId["acute-apical-abscess"]),
    scores: {
      diagnosisAccuracy: 72,
      treatmentSafety: 76,
      communicationQuality: 82,
      timeEfficiency: 78,
      clinicalReasoning: 74,
      safetyScore: 75,
    },
    banners: [
      {
        id: "banner-initial",
        message: "Synthetic educational patient. Not for real clinical decision-making.",
        tone: "info",
      },
    ],
    diagnosisHypotheses: ["Odontogenic infection", "Symptomatic apical periodontitis"],
    diagnosisConfidence: 36,
  }
}

export function buildSimulationSnapshot(state: SimulationState): SimulationSnapshot {
  return {
    caseId: state.caseId,
    trustLevel: state.patient.trustLevel,
    anxietyLevel: state.patient.anxietyLevel,
    painScore: state.patient.painScore,
    condition: state.patient.condition,
    discoveredHistory: state.discoveredHistory,
    completedActions: state.completedActions,
    orderedTests: state.orderedTests,
    timeline: state.timeline,
    scores: state.scores,
  }
}

export function getImagingForCase(caseId: string): ImagingStudy[] {
  return imagingData[caseId] ?? imagingData["acute-apical-abscess"] ?? []
}

export function applySupplementalOrder(state: SimulationState, orderId: string): SimulationState {
  const next = cloneState(state)
  const order = orderCatalog.find((item) => item.id === orderId)

  if (!order || next.orderedTests.includes(order.name)) {
    return next
  }

  next.orderedTests.push(order.name)
  pushTimeline(next, {
    type: "order",
    title: `${order.name} ordered`,
    description: `${order.educationalRelevance} ${order.timeDelay} turnaround. ${order.riskLevel}.`,
  })

  next.agents = setAgentState(next.agents, "imaging-agent", {
    status: order.id === "cbct" || order.id.includes("radiograph") ? "generating" : "thinking",
    lastAction: `${order.name} requested for teaching review.`,
  })
  next.agents = setAgentState(next.agents, "evaluator-agent", {
    status: "validating",
    lastAction: `Updated sequence scoring after ${order.name}.`,
  })

  if (order.id === "periapical-radiograph") {
    next.scores.clinicalReasoning = clamp(next.scores.clinicalReasoning + 6, 0, 100)
    next.scores.timeEfficiency = clamp(next.scores.timeEfficiency + 4, 0, 100)
    next.agents = setAgentState(next.agents, "imaging-agent", {
      status: "idle",
      lastAction: "Released faculty-approved periapical view.",
    })
    pushBanner(next, {
      message: "First-line imaging added to the evidence trail.",
      tone: "success",
    })
  }

  if (order.id === "cbct") {
    if (!next.orderedTests.includes("Periapical radiograph")) {
      next.scores.safetyScore = clamp(next.scores.safetyScore - 8, 0, 100)
      next.scores.timeEfficiency = clamp(next.scores.timeEfficiency - 5, 0, 100)
      next.agents = setAgentState(next.agents, "safety-agent", {
        status: "warning",
        warnings: uniquePush(
          next.agents.find((agent) => agent.id === "safety-agent")?.warnings ?? [],
          "CBCT was ordered before first-line radiography review.",
        ),
        lastAction: "Flagged advanced imaging ordered before basic imaging.",
      })
      pushChat(next, {
        speaker: "system",
        tone: "warning",
        text: "Safety Agent: CBCT requires rationale after first-line imaging unless red flags justify it.",
      })
      pushTimeline(next, {
        type: "warning",
        title: "Safety Agent flagged imaging escalation",
        description: "CBCT was ordered before a basic radiographic step was documented.",
      })
      pushBanner(next, {
        message: "Advanced imaging was requested before first-line imaging justification.",
        tone: "warning",
      })
    } else {
      next.scores.clinicalReasoning = clamp(next.scores.clinicalReasoning + 2, 0, 100)
      pushBanner(next, {
        message: "CBCT added as an escalated teaching dataset.",
        tone: "info",
      })
    }
  }

  return next
}

export function applySimulationAction(
  state: SimulationState,
  action: SimulationActionId,
): SimulationState {
  if (action === "orderPeriapicalRadiograph") {
    return applySupplementalOrder(state, "periapical-radiograph")
  }

  if (action === "orderCbct") {
    return applySupplementalOrder(state, "cbct")
  }

  const next = cloneState(state)

  switch (action) {
    case "askPainDuration":
      markAction(next, action)
      next.discoveredHistory = uniquePush(next.discoveredHistory, "Pain duration disclosed")
      pushChat(next, { speaker: "student", text: "How long has the pain and swelling been getting worse?" })
      pushChat(next, {
        speaker: "patient",
        text: "It started about five days ago. Last night it became much worse.",
      })
      pushTimeline(next, {
        type: "question",
        title: "Pain duration explored",
        description: "Learner established five days of pain with overnight escalation.",
      })
      updatePatientState(next, {
        trustLevel: next.patient.trustLevel + 4,
        anxietyLevel: next.patient.anxietyLevel - 3,
      })
      next.scores.clinicalReasoning = clamp(next.scores.clinicalReasoning + 5, 0, 100)
      next.agents = setAgentState(next.agents, "persona-agent", {
        status: "generating",
        lastAction: "Released fuller symptom-timing response.",
      })
      break
    case "askAllergy":
      markAction(next, action)
      next.discoveredHistory = uniquePush(next.discoveredHistory, "Possible antibiotic allergy discovered")
      pushChat(next, { speaker: "student", text: "Do you have any medication allergies, especially antibiotics?" })
      pushChat(next, {
        speaker: "patient",
        text: "I think I once had a rash after an antibiotic, but I do not remember the name.",
      })
      pushTimeline(next, {
        type: "question",
        title: "Allergy history clarified",
        description: "Possible antibiotic allergy surfaced before treatment planning.",
      })
      updatePatientState(next, {
        trustLevel: next.patient.trustLevel + 6,
        anxietyLevel: next.patient.anxietyLevel - 4,
        allergyStatus: "Possible antibiotic allergy disclosed",
      })
      next.scores.treatmentSafety = clamp(next.scores.treatmentSafety + 8, 0, 100)
      next.scores.safetyScore = clamp(next.scores.safetyScore + 8, 0, 100)
      next.agents = setAgentState(next.agents, "safety-agent", {
        status: "warning",
        warnings: uniquePush(
          next.agents.find((agent) => agent.id === "safety-agent")?.warnings ?? [],
          "Allergy status is not fully clarified. Prescribing remains unsafe.",
        ),
        lastAction: "Allergy status unresolved. Prescribing remains unsafe.",
      })
      pushChat(next, {
        speaker: "system",
        tone: "warning",
        text: "Safety Agent: allergy status is not fully clarified. Prescribing remains unsafe.",
      })
      break
    case "askMedicationHistory":
      markAction(next, action)
      next.discoveredHistory = uniquePush(next.discoveredHistory, "Medication history discovered")
      next.discoveredHistory = uniquePush(next.discoveredHistory, "Hypertension history surfaced")
      pushChat(next, { speaker: "student", text: "Can you tell me about your medical conditions and regular medications?" })
      pushChat(next, {
        speaker: "patient",
        text: "I take something for blood pressure, but I forgot the exact name.",
      })
      pushTimeline(next, {
        type: "question",
        title: "Medication and medical history reviewed",
        description: "Hypertension and incomplete medication recall were added to the safety frame.",
      })
      updatePatientState(next, {
        trustLevel: next.patient.trustLevel + 3,
        anxietyLevel: next.patient.anxietyLevel - 2,
      })
      next.scores.safetyScore = clamp(next.scores.safetyScore + 4, 0, 100)
      break
    case "checkFeverSwallowing":
      markAction(next, action)
      next.discoveredHistory = uniquePush(next.discoveredHistory, "Systemic red flags screened")
      pushChat(next, { speaker: "student", text: "Do you have fever, difficulty swallowing, or any trouble breathing?" })
      pushChat(next, {
        speaker: "patient",
        text: "I feel warm and the swelling is increasing, but I can still swallow and breathe normally.",
      })
      pushTimeline(next, {
        type: "question",
        title: "Systemic red flags screened",
        description: "Fever, swallowing, breathing, and swelling progression were reviewed.",
      })
      next.scores.safetyScore = clamp(next.scores.safetyScore + 6, 0, 100)
      next.scores.clinicalReasoning = clamp(next.scores.clinicalReasoning + 4, 0, 100)
      next.agents = setAgentState(next.agents, "physiology-agent", {
        status: "validating",
        lastAction: "Watched swelling progression and systemic red flags.",
      })
      break
    case "giveEmpatheticResponse":
      markAction(next, action)
      pushChat(next, {
        speaker: "student",
        text: "You did the right thing coming in today. I can see you're in pain, and we'll work through this carefully.",
      })
      pushChat(next, {
        speaker: "patient",
        text: "Thank you for explaining. I feel a little less nervous now.",
      })
      pushTimeline(next, {
        type: "empathy",
        title: "Empathetic response improved rapport",
        description: "Patient trust increased and anxiety visibly softened.",
      })
      updatePatientState(next, {
        trustLevel: next.patient.trustLevel + 8,
        anxietyLevel: next.patient.anxietyLevel - 9,
      })
      next.scores.communicationQuality = clamp(next.scores.communicationQuality + 8, 0, 100)
      next.agents = setAgentState(next.agents, "persona-agent", {
        status: "validating",
        lastAction: "Patient becomes calmer after empathetic communication.",
      })
      pushChat(next, {
        speaker: "system",
        text: "Persona Agent: patient becomes calmer after empathetic communication.",
      })
      break
    case "giveRushedResponse":
      markAction(next, action)
      pushChat(next, {
        speaker: "student",
        text: "We need to move quickly, so I just need short answers and then we'll decide on treatment.",
      })
      pushChat(next, {
        speaker: "patient",
        tone: "warning",
        text: "I feel like you are not listening. I am really scared.",
      })
      pushTimeline(next, {
        type: "warning",
        title: "Rushed communication increased anxiety",
        description: "Patient became more guarded and trust dropped.",
      })
      updatePatientState(next, {
        trustLevel: next.patient.trustLevel - 12,
        anxietyLevel: next.patient.anxietyLevel + 11,
      })
      next.scores.communicationQuality = clamp(next.scores.communicationQuality - 10, 0, 100)
      next.agents = setAgentState(next.agents, "persona-agent", {
        status: "warning",
        lastAction: "Patient rapport destabilized after rushed language.",
      })
      break
    case "performPercussion":
      markAction(next, action)
      pushChat(next, { speaker: "student", text: "I'm going to gently tap around the tooth to localize the pain." })
      pushChat(next, {
        speaker: "patient",
        tone: "warning",
        text: "That one hurts a lot more when you tap it.",
      })
      pushTimeline(next, {
        type: "exam",
        title: "Percussion test performed",
        description: "Localized percussion tenderness reinforced a periapical source.",
      })
      next.scores.clinicalReasoning = clamp(next.scores.clinicalReasoning + 6, 0, 100)
      next.scores.diagnosisAccuracy = clamp(next.scores.diagnosisAccuracy + 5, 0, 100)
      break
    case "submitCorrectDiagnosis":
      markAction(next, action)
      pushTimeline(next, {
        type: "diagnosis",
        title: "Diagnosis submitted",
        description: evidenceReady(next)
          ? "Diagnosis was supported by history, exam, and imaging evidence."
          : "Diagnosis was submitted before the evidence trail was fully matured.",
      })
      pushChat(next, {
        speaker: "system",
        tone: evidenceReady(next) ? "neutral" : "warning",
        text: evidenceReady(next)
          ? "Evaluator Agent accepted the diagnosis as evidence-aligned."
          : "Evaluator Agent flagged that the diagnosis arrived early relative to the available evidence.",
      })
      next.scores.diagnosisAccuracy = clamp(
        evidenceReady(next) ? 95 : next.scores.diagnosisAccuracy + 7,
        0,
        100,
      )
      next.scores.clinicalReasoning = clamp(
        evidenceReady(next) ? 92 : next.scores.clinicalReasoning + 3,
        0,
        100,
      )
      next.diagnosisConfidence = evidenceReady(next) ? 88 : 62
      next.agents = setAgentState(next.agents, "evaluator-agent", {
        status: "validating",
        lastAction: evidenceReady(next)
          ? "Accepted diagnosis with strong evidence alignment."
          : "Marked diagnosis as early relative to evidence trail.",
      })
      pushBanner(next, {
        message: evidenceReady(next)
          ? "Diagnosis accepted with strong evidence alignment."
          : "Diagnosis submitted before the full evidence trail was complete.",
        tone: evidenceReady(next) ? "success" : "warning",
      })
      break
    case "explainTreatmentPlan":
      markAction(next, action)
      pushChat(next, {
        speaker: "student",
        text: "We will first control the source of infection, manage pain, and only use antibiotics if systemic signs or spread make them necessary.",
      })
      pushChat(next, {
        speaker: "patient",
        text: "That helps. I want the swelling treated, but I also want to avoid the wrong medication.",
      })
      pushTimeline(next, {
        type: "treatment",
        title: "Treatment plan explained",
        description: "Source control, pain control, safety checks, and follow-up were explained.",
      })
      next.scores.communicationQuality = clamp(next.scores.communicationQuality + 4, 0, 100)
      next.scores.treatmentSafety = clamp(next.scores.treatmentSafety + 3, 0, 100)
      next.agents = setAgentState(next.agents, "evaluator-agent", {
        status: "validating",
        lastAction: "Updated treatment and communication scoring after explanation.",
      })
      break
    case "submitUnsafeTreatment":
      markAction(next, action)
      pushTimeline(next, {
        type: "treatment",
        title: "Unsafe treatment submitted",
        description: "Safety guardrail intervened before an allergy-aware plan was documented.",
      })
      pushChat(next, {
        speaker: "system",
        tone: "warning",
        text: "Safety Agent blocked the treatment path because allergies and red flags were not fully reviewed.",
      })
      updatePatientState(next, {
        trustLevel: next.patient.trustLevel - 18,
        anxietyLevel: next.patient.anxietyLevel + 12,
        condition: next.patient.condition === "stable" ? "worsening" : "critical",
      })
      next.scores.treatmentSafety = clamp(next.scores.treatmentSafety - 18, 0, 100)
      next.scores.safetyScore = clamp(next.scores.safetyScore - 16, 0, 100)
      next.agents = setAgentState(next.agents, "safety-agent", {
        status: "blocked",
        warnings: uniquePush(
          next.agents.find((agent) => agent.id === "safety-agent")?.warnings ?? [],
          "Unsafe treatment path blocked before allergy-aware review.",
        ),
        lastAction: "Blocked unsafe treatment sequence.",
      })
      pushBanner(next, {
        message: "Unsafe treatment sequence blocked by the Safety Agent.",
        tone: "warning",
      })
      break
    default:
      break
  }

  return next
}

export function applyFreeTextMessage(
  state: SimulationState,
  message: string,
): SimulationState {
  const next = cloneState(state)
  const normalized = message.toLowerCase()

  pushChat(next, { speaker: "student", text: message })

  if (normalized.includes("allerg")) {
    if (!next.discoveredHistory.includes("Possible antibiotic allergy discovered")) {
      next.discoveredHistory = uniquePush(next.discoveredHistory, "Possible antibiotic allergy discovered")
      updatePatientState(next, {
        trustLevel: next.patient.trustLevel + 4,
        anxietyLevel: next.patient.anxietyLevel - 2,
        allergyStatus: "Possible antibiotic allergy disclosed",
      })
      next.scores.safetyScore = clamp(next.scores.safetyScore + 4, 0, 100)
    }
    pushChat(next, {
      speaker: "patient",
      text: "I think I once had a rash after an antibiotic, but I do not remember the name.",
    })
  } else if (normalized.includes("how long") || normalized.includes("when") || normalized.includes("started")) {
    if (!next.discoveredHistory.includes("Pain duration disclosed")) {
      next.discoveredHistory = uniquePush(next.discoveredHistory, "Pain duration disclosed")
      next.scores.clinicalReasoning = clamp(next.scores.clinicalReasoning + 3, 0, 100)
    }
    pushChat(next, {
      speaker: "patient",
      text: "It had been bothering me on and off, but over the last five days it became much more intense.",
    })
  } else if (normalized.includes("medication") || normalized.includes("medical") || normalized.includes("blood pressure")) {
    next.discoveredHistory = uniquePush(next.discoveredHistory, "Medication history discovered")
    next.discoveredHistory = uniquePush(next.discoveredHistory, "Hypertension history surfaced")
    pushChat(next, {
      speaker: "patient",
      text: "I take something for blood pressure, but I forgot the exact name.",
    })
  } else if (normalized.includes("swelling") || normalized.includes("spread")) {
    pushChat(next, {
      speaker: "patient",
      text: "It definitely feels bigger today, but I can still swallow normally and I am breathing fine.",
    })
  } else if (normalized.includes("pain")) {
    pushChat(next, {
      speaker: "patient",
      text: "It's deep, throbbing, and it kept me awake last night.",
    })
  } else {
    pushChat(next, {
      speaker: "patient",
      text: "I'm not completely sure, but I can try to explain more if you ask me a bit differently.",
    })
  }

  next.agents = setAgentState(next.agents, "persona-agent", {
    status: "generating",
    lastAction: "Responded to free-text questioning within approved scenario facts.",
  })

  pushTimeline(next, {
    type: "question",
    title: "Free-text clinical question asked",
    description: "Patient response was generated from the constrained scenario fact set.",
  })

  return next
}
