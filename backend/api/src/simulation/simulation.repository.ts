import { Injectable } from "@nestjs/common"
import type { QueryResultRow } from "pg"

import type { TransactionClient } from "../database/transaction"
import type { SafetyEvaluationResultDto } from "../safety/safety.dto"
import { SafetyRepository } from "../safety/safety.repository"
import { SafetyService } from "../safety/safety.service"
import {
  CLINICAL_ACTION_CONTRACT_VERSION,
  CONVERSATION_MESSAGE_CONTRACT_VERSION,
  REVEALED_FACT_REFERENCE_CONTRACT_VERSION,
  SESSION_STATE_SNAPSHOT_CONTRACT_VERSION,
  SIMULATION_SESSION_CONTRACT_VERSION,
  SIMULATION_TURN_RESULT_CONTRACT_VERSION,
  TIMELINE_EVENT_CONTRACT_VERSION,
  type ActorContext,
  type ClinicalActionDto,
  type ClinicalActionStatus,
  type ConversationMessageDto,
  type ConversationSpeaker,
  type ConversationStatus,
  type RevealedFactReferenceDto,
  type SessionStateSnapshotDto,
  type SimulationActionType,
  type SimulationSessionDto,
  type SimulationTurnResultDto,
  type SubmitSimulationActionRequestDto,
  type TimelineEventDto,
} from "./simulation.dto"
import { SimulationBadRequestError, SimulationConflictError, SimulationNotFoundError } from "./simulation.errors"
import {
  buildMockPatientResponse,
  type FactForMockResponse,
} from "./mock-patient-response"

const EVENT_SCHEMA_VERSION = "simulation-session-event.v1"
const EVENT_STREAM_TYPE = "simulation_session"
const EVENT_PRODUCER = "api-bff.mock-simulation"
const OUTBOX_TOPIC = "simulation.session.events"

interface UserRow extends QueryResultRow {
  id: string
}

interface CaseVersionRow extends QueryResultRow {
  id: string
  case_id: string
  title: string
  student_summary: string
  patient_twin_id: string | null
  display_name: string | null
  chief_complaint: string | null
}

interface SessionRow extends QueryResultRow {
  id: string
  institution_id: string
  case_id: string
  case_version_id: string
  student_user_id: string
  status: "active" | "completed" | "abandoned" | "expired" | "blocked"
  state_version: number
  patient_state: unknown
  started_at: Date | string
  completed_at: Date | string | null
  expires_at: Date | string | null
  created_at: Date | string
  updated_at: Date | string
}

interface ActionRow extends QueryResultRow {
  id: string
  session_id: string
  actor_user_id: string
  idempotency_key_id: string | null
  action_type: SimulationActionType
  status: ClinicalActionStatus
  sequence: number
  payload: unknown
  normalized_intent: string | null
  blocked_reason: string | null
  created_at: Date | string
}

interface MessageRow extends QueryResultRow {
  id: string
  session_id: string
  clinical_action_id: string | null
  speaker: ConversationSpeaker
  visibility: "student_safe" | "internal" | "faculty_only"
  status: ConversationStatus
  content: string
  used_fact_ids: unknown
  sequence: number
  created_at: Date | string
}

interface TimelineRow extends QueryResultRow {
  id: string
  session_id: string
  clinical_action_id: string | null
  event_type: TimelineEventDto["event_type"]
  title: string
  description: string | null
  payload: unknown
  sequence: number
  created_at: Date | string
}

interface SnapshotRow extends QueryResultRow {
  id: string
  session_id: string
  state_version: number
  reason: string
  snapshot: unknown
  created_at: Date | string
}

interface RevealedFactRow extends QueryResultRow {
  session_id: string
  fact_id: string
  reveal_rule_id: string | null
  revealed_by_action_id: string | null
  revealed_to: RevealedFactReferenceDto["revealed_to"]
  reveal_reason: string
  created_at: Date | string
}

interface FactRow extends QueryResultRow {
  fact_id: string
  fact_type: string
  visibility: "baseline_visible" | "hidden_until_revealed"
  content: unknown
  student_safe_summary: string | null
  reveal_rule_id: string | null
}

interface IdempotencyRow extends QueryResultRow {
  id: string
  request_hash: string
  status: "processing" | "completed" | "failed" | "expired"
  response_snapshot: unknown
}

interface EventRow extends QueryResultRow {
  id: string
  sequence: string
}

interface SubmitActionResult {
  result: SimulationTurnResultDto
  from_idempotency_cache: boolean
}

type SimulationResponseEventType =
  | "mock_patient.response.created"
  | "unsupported_action.blocked"
  | "safety.action.blocked"
  | "safety.response.blocked"

@Injectable()
export class SimulationRepository {
  constructor(
    private readonly safetyService: SafetyService,
    private readonly safetyRepository: SafetyRepository,
  ) {}

  async createSession(
    client: TransactionClient,
    actor: ActorContext,
    caseVersionId: string,
  ): Promise<SimulationSessionDto> {
    await this.assertActorUserExists(client, actor)
    const caseVersion = await this.loadCaseVersionWithPatientTwin(client, actor.institution_id, caseVersionId)

    if (!caseVersion.patient_twin_id) {
      throw new SimulationBadRequestError("patient_twin_missing", "A patient twin is required before starting a simulation")
    }

    const patientState = {
      projection: "student_safe",
      patient_twin_id: caseVersion.patient_twin_id,
      display_name: caseVersion.display_name,
      chief_complaint: caseVersion.chief_complaint,
    }

    const session = await this.insertSession(client, actor, caseVersion, patientState)
    await this.insertBaselineReveals(client, session)
    await this.insertTimelineEvent(client, {
      actor,
      session_id: session.id,
      event_type: "session.created",
      title: "Session created",
      payload: {
        session_id: session.id,
        case_id: session.case_id,
        case_version_id: session.case_version_id,
        state_version: session.state_version,
      },
    })
    await this.insertSnapshot(client, actor, session, "session.created")
    await this.appendEventAndOutbox(client, {
      actor,
      session_id: session.id,
      event_type: "simulation.session.created",
      payload: {
        session_id: session.id,
        case_id: session.case_id,
        case_version_id: session.case_version_id,
        student_user_id: session.student_user_id,
        state_version: session.state_version,
      },
    })

    return this.loadSessionAggregate(client, actor, session.id)
  }

  async getSession(client: TransactionClient, actor: ActorContext, sessionId: string): Promise<SimulationSessionDto> {
    const session = await this.loadSessionForActor(client, actor, sessionId)
    if (!session) {
      throw new SimulationNotFoundError()
    }

    return this.loadSessionAggregate(client, actor, session.id)
  }

  async submitAction(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
    requestHash: string,
    input: SubmitSimulationActionRequestDto,
  ): Promise<SubmitActionResult> {
    await this.assertActorUserExists(client, actor)
    const session = await this.lockSessionForActor(client, actor, sessionId)

    if (!session) {
      throw new SimulationNotFoundError()
    }

    if (session.status !== "active") {
      throw new SimulationBadRequestError("session_not_active", "Only active sessions can receive mock actions")
    }

    const idempotency = input.idempotency_key
      ? await this.reserveIdempotencyKey(client, actor, session.id, input.idempotency_key, requestHash)
      : undefined

    if (idempotency?.status === "completed") {
      return {
        result: idempotency.response_snapshot as SimulationTurnResultDto,
        from_idempotency_cache: true,
      }
    }

    const action = await this.insertClinicalAction(client, actor, session, input, idempotency?.id)
    const newMessages: ConversationMessageDto[] = []
    const newTimelineEvents: TimelineEventDto[] = []
    const newlyRevealedFacts: RevealedFactReferenceDto[] = []
    let responseEventType: SimulationResponseEventType = "mock_patient.response.created"

    const text = sanitizeStudentText(input.text)
    if (text) {
      newMessages.push(
        await this.insertConversationMessage(client, {
          actor,
          session,
          clinical_action_id: action.id,
          speaker: "student",
          status: "completed",
          content: text,
          used_fact_ids: [],
        }),
      )
    }

    newTimelineEvents.push(
      await this.insertTimelineEvent(client, {
        actor,
        session_id: session.id,
        clinical_action_id: action.id,
        event_type: "student.action.submitted",
        title: "Student action submitted",
        payload: {
          action_id: action.id,
          action_type: input.action_type,
          sequence: action.sequence,
        },
      }),
    )

    await this.appendEventAndOutbox(client, {
      actor,
      session_id: session.id,
      event_type: "student.action.submitted",
      payload: {
        session_id: session.id,
        action_id: action.id,
        action_type: input.action_type,
        action_sequence: action.sequence,
      },
      idempotency_key_id: idempotency?.id,
    })

    const preActionSafety = this.safetyService.evaluatePreAction({
      institution_id: actor.institution_id,
      session_id: session.id,
      clinical_action_id: action.id,
      action_type: input.action_type,
      text,
      payload: sanitizePayload(input.payload),
    })
    await this.safetyRepository.persistEvaluation(client, {
      institution_id: actor.institution_id,
      session_id: session.id,
      clinical_action_id: action.id,
      input_text: text,
      action_type: input.action_type,
      evaluation: preActionSafety,
    })

    if (isBlockingSafetyDecision(preActionSafety)) {
      responseEventType = "safety.action.blocked"
      const blockedReason = buildSafetyBlockedReason(preActionSafety)
      const updatedAction = await this.updateClinicalActionStatus(client, actor, action.id, "blocked_unsupported", blockedReason)
      Object.assign(action, updatedAction)

      newTimelineEvents.push(
        await this.insertTimelineEvent(client, {
          actor,
          session_id: session.id,
          clinical_action_id: action.id,
          event_type: "safety.action.blocked",
          title: "Safety action blocked",
          payload: {
            action_id: action.id,
            action_type: input.action_type,
            safety_decision: preActionSafety.decision,
            safety_categories: safetyCategories(preActionSafety),
            safety_rule_keys: safetyRuleKeys(preActionSafety),
            blocked_reason: blockedReason,
          },
        }),
      )
      newMessages.push(
        await this.insertConversationMessage(client, {
          actor,
          session,
          clinical_action_id: action.id,
          speaker: "system",
          status: "blocked",
          content: buildSafetyBlockedMessage(preActionSafety),
          used_fact_ids: [],
        }),
      )
    } else {
      if (preActionSafety.decision === "warn") {
        newTimelineEvents.push(
          await this.insertSafetyWarningTimelineAndEvent(client, {
            actor,
            session,
            action_id: action.id,
            action_type: input.action_type,
            safety: preActionSafety,
            idempotency_key_id: idempotency?.id,
          }),
        )
      }

      const allowedFacts = await this.loadAllowedFacts(client, actor, session)
      const eligibleAllergyFact = await this.loadEligibleAllergyFact(client, actor, session)
      const mockResponse = buildMockPatientResponse({
        action_type: input.action_type,
        text,
        allowed_facts: allowedFacts,
        eligible_allergy_fact: eligibleAllergyFact,
      })

      const postResponseSafety = this.safetyService.evaluatePostResponse({
        institution_id: actor.institution_id,
        session_id: session.id,
        clinical_action_id: action.id,
        action_type: input.action_type,
        response_text: mockResponse.content,
        used_fact_ids: mockResponse.used_fact_ids,
      })
      await this.safetyRepository.persistEvaluation(client, {
        institution_id: actor.institution_id,
        session_id: session.id,
        clinical_action_id: action.id,
        output_text: mockResponse.content,
        action_type: input.action_type,
        evaluation: postResponseSafety,
      })

      if (isBlockingSafetyDecision(postResponseSafety)) {
        responseEventType = "safety.response.blocked"
        const blockedReason = buildSafetyBlockedReason(postResponseSafety)
        const updatedAction = await this.updateClinicalActionStatus(client, actor, action.id, "blocked_unsupported", blockedReason)
        Object.assign(action, updatedAction)

        newTimelineEvents.push(
          await this.insertTimelineEvent(client, {
            actor,
            session_id: session.id,
            clinical_action_id: action.id,
            event_type: "safety.response.blocked",
            title: "Safety response blocked",
            payload: {
              action_id: action.id,
              action_type: input.action_type,
              safety_decision: postResponseSafety.decision,
              safety_categories: safetyCategories(postResponseSafety),
              safety_rule_keys: safetyRuleKeys(postResponseSafety),
              blocked_reason: blockedReason,
            },
          }),
        )
        newMessages.push(
          await this.insertConversationMessage(client, {
            actor,
            session,
            clinical_action_id: action.id,
            speaker: "system",
            status: "blocked",
            content: buildSafetyBlockedMessage(postResponseSafety),
            used_fact_ids: [],
          }),
        )
      } else {
        if (postResponseSafety.decision === "warn") {
          newTimelineEvents.push(
            await this.insertSafetyWarningTimelineAndEvent(client, {
              actor,
              session,
              action_id: action.id,
              action_type: input.action_type,
              safety: postResponseSafety,
              idempotency_key_id: idempotency?.id,
            }),
          )
        }

        if (mockResponse.newly_revealed_fact) {
          const revealed = await this.insertRevealedFactReference(
            client,
            actor,
            session,
            mockResponse.newly_revealed_fact,
            action.id,
            "ask_directly",
          )

          if (revealed) {
            newlyRevealedFacts.push(revealed)
            newTimelineEvents.push(
              await this.insertTimelineEvent(client, {
                actor,
                session_id: session.id,
                clinical_action_id: action.id,
                event_type: "fact.revealed",
                title: "Fact revealed",
                payload: {
                  fact_id: revealed.fact_id,
                  reveal_rule_id: revealed.reveal_rule_id,
                  revealed_to: revealed.revealed_to,
                },
              }),
            )
            await this.appendEventAndOutbox(client, {
              actor,
              session_id: session.id,
              event_type: "fact.revealed",
              payload: {
                session_id: session.id,
                action_id: action.id,
                fact_id: revealed.fact_id,
                reveal_rule_id: revealed.reveal_rule_id,
                revealed_to: revealed.revealed_to,
              },
              idempotency_key_id: idempotency?.id,
            })
          }
        }

        const updatedAction = await this.updateClinicalActionStatus(client, actor, action.id, "responded")
        Object.assign(action, updatedAction)

        newMessages.push(
          await this.insertConversationMessage(client, {
            actor,
            session,
            clinical_action_id: action.id,
            speaker: "mock_patient",
            status: "completed",
            content: mockResponse.content,
            used_fact_ids: mockResponse.used_fact_ids,
          }),
        )
        newTimelineEvents.push(
          await this.insertTimelineEvent(client, {
            actor,
            session_id: session.id,
            clinical_action_id: action.id,
            event_type: "mock_patient.response.created",
            title: "Mock patient response created",
            payload: {
              action_id: action.id,
              used_fact_ids: mockResponse.used_fact_ids,
            },
          }),
        )
      }
    }

    await this.appendEventAndOutbox(client, {
      actor,
      session_id: session.id,
      event_type: responseEventType,
      payload: {
        session_id: session.id,
        action_id: action.id,
        action_type: input.action_type,
      },
      idempotency_key_id: idempotency?.id,
    })

    const updatedSession = await this.incrementSessionStateVersion(client, actor, session.id)
    const snapshot = await this.insertSnapshot(client, actor, updatedSession, "session.state.snapshotted")
    newTimelineEvents.push(
      await this.insertTimelineEvent(client, {
        actor,
        session_id: updatedSession.id,
        clinical_action_id: action.id,
        event_type: "session.state.snapshotted",
        title: "Session state snapshotted",
        payload: {
          state_version: updatedSession.state_version,
          reason: "session.state.snapshotted",
        },
      }),
    )
    const snapshotEvent = await this.appendEventAndOutbox(client, {
      actor,
      session_id: updatedSession.id,
      event_type: "session.state.snapshotted",
      payload: {
        session_id: updatedSession.id,
        state_version: updatedSession.state_version,
      },
      idempotency_key_id: idempotency?.id,
    })

    const aggregate = await this.loadSessionAggregate(client, actor, updatedSession.id)
    const result: SimulationTurnResultDto = {
      contract_version: SIMULATION_TURN_RESULT_CONTRACT_VERSION,
      session: aggregate,
      action,
      messages: newMessages,
      timeline_events: newTimelineEvents,
      revealed_facts: newlyRevealedFacts,
      state_snapshot: snapshot,
    }

    if (idempotency) {
      await this.completeIdempotencyKey(client, actor, idempotency.id, result, snapshotEvent.id)
    }

    return {
      result,
      from_idempotency_cache: false,
    }
  }

  private async assertActorUserExists(client: TransactionClient, actor: ActorContext): Promise<void> {
    const result = await client.query<UserRow>(
      `
        SELECT id
        FROM users
        WHERE institution_id = $1
          AND id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [actor.institution_id, actor.user_id],
    )

    if (result.rowCount !== 1) {
      throw new SimulationBadRequestError("actor_context_invalid", "Actor user does not exist for institution")
    }
  }

  private async loadCaseVersionWithPatientTwin(
    client: TransactionClient,
    institutionId: string,
    caseVersionId: string,
  ): Promise<CaseVersionRow> {
    const result = await client.query<CaseVersionRow>(
      `
        SELECT
          cv.id,
          cv.case_id,
          cv.title,
          cv.student_summary,
          pt.id AS patient_twin_id,
          pt.display_name,
          pt.chief_complaint
        FROM case_versions cv
        LEFT JOIN patient_twins pt
          ON pt.institution_id = cv.institution_id
         AND pt.case_version_id = cv.id
        WHERE cv.institution_id = $1
          AND cv.id = $2
        LIMIT 1
      `,
      [institutionId, caseVersionId],
    )

    if (result.rowCount !== 1) {
      throw new SimulationNotFoundError("Case version not found for institution")
    }

    return result.rows[0]
  }

  private async insertSession(
    client: TransactionClient,
    actor: ActorContext,
    caseVersion: CaseVersionRow,
    patientState: Record<string, unknown>,
  ): Promise<SessionRow> {
    const result = await client.query<SessionRow>(
      `
        INSERT INTO simulation_sessions (
          institution_id,
          case_id,
          case_version_id,
          student_user_id,
          status,
          state_version,
          patient_state
        )
        VALUES ($1, $2, $3, $4, 'active', 1, $5::jsonb)
        RETURNING *
      `,
      [
        actor.institution_id,
        caseVersion.case_id,
        caseVersion.id,
        actor.user_id,
        JSON.stringify(patientState),
      ],
    )

    return result.rows[0]
  }

  private async insertBaselineReveals(client: TransactionClient, session: SessionRow): Promise<void> {
    await client.query(
      `
        INSERT INTO session_revealed_facts (
          institution_id,
          session_id,
          fact_id,
          revealed_to,
          reveal_reason
        )
        SELECT
          f.institution_id,
          $2,
          f.fact_id,
          'student_payload',
          'baseline_visible'
        FROM fact_ledger f
        WHERE f.institution_id = $1
          AND f.case_version_id = $3
          AND f.visibility = 'baseline_visible'
          AND f.deprecated_at IS NULL
        ON CONFLICT (session_id, fact_id, revealed_to) DO NOTHING
      `,
      [session.institution_id, session.id, session.case_version_id],
    )
  }

  private async loadSessionForActor(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
  ): Promise<SessionRow | undefined> {
    const result = await client.query<SessionRow>(
      `
        SELECT *
        FROM simulation_sessions
        WHERE institution_id = $1
          AND id = $2
          AND student_user_id = $3
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [actor.institution_id, sessionId, actor.user_id],
    )

    return result.rows[0]
  }

  private async lockSessionForActor(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
  ): Promise<SessionRow | undefined> {
    const result = await client.query<SessionRow>(
      `
        SELECT *
        FROM simulation_sessions
        WHERE institution_id = $1
          AND id = $2
          AND student_user_id = $3
          AND deleted_at IS NULL
        FOR UPDATE
      `,
      [actor.institution_id, sessionId, actor.user_id],
    )

    return result.rows[0]
  }

  private async loadSessionAggregate(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
  ): Promise<SimulationSessionDto> {
    const session = await this.loadSessionForActor(client, actor, sessionId)
    if (!session) {
      throw new SimulationNotFoundError()
    }

    const messages = await this.loadMessages(client, actor, session.id)
    const timelineEvents = await this.loadTimelineEvents(client, actor, session.id)
    const revealedFacts = await this.loadRevealedFactReferences(client, actor, session.id)
    const snapshot = await this.loadLatestSnapshot(client, actor, session.id)

    return {
      ...this.mapSession(session),
      messages,
      timeline_events: timelineEvents,
      revealed_facts: revealedFacts,
      state_snapshot: snapshot,
    }
  }

  private async reserveIdempotencyKey(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
    idempotencyKey: string,
    requestHash: string,
  ): Promise<IdempotencyRow> {
    const commandScope = `simulation_sessions:${sessionId}:actions`

    await client.query(
      `
        INSERT INTO idempotency_keys (
          institution_id,
          actor_user_id,
          idempotency_key,
          command_scope,
          request_hash,
          status,
          expires_at,
          locked_at,
          locked_by
        )
        VALUES ($1, $2, $3, $4, $5, 'processing', now() + interval '24 hours', now(), 'api-bff')
        ON CONFLICT DO NOTHING
      `,
      [actor.institution_id, actor.user_id, idempotencyKey, commandScope, requestHash],
    )

    const result = await client.query<IdempotencyRow>(
      `
        SELECT id, request_hash, status, response_snapshot
        FROM idempotency_keys
        WHERE institution_id = $1
          AND actor_user_id = $2
          AND command_scope = $3
          AND idempotency_key = $4
        FOR UPDATE
      `,
      [actor.institution_id, actor.user_id, commandScope, idempotencyKey],
    )

    const row = result.rows[0]
    if (!row) {
      throw new SimulationConflictError("idempotency_reservation_failed", "Unable to reserve idempotency key")
    }

    if (row.request_hash !== requestHash) {
      throw new SimulationConflictError(
        "idempotency_conflict",
        "Idempotency key was already used with a different request",
      )
    }

    return row
  }

  private async completeIdempotencyKey(
    client: TransactionClient,
    actor: ActorContext,
    idempotencyKeyId: string,
    responseSnapshot: SimulationTurnResultDto,
    responseEventId: string,
  ): Promise<void> {
    await client.query(
      `
        UPDATE idempotency_keys
        SET status = 'completed',
            response_snapshot = $4::jsonb,
            response_event_id = $5,
            locked_at = NULL,
            locked_by = NULL,
            updated_at = now()
        WHERE institution_id = $1
          AND actor_user_id = $2
          AND id = $3
      `,
      [actor.institution_id, actor.user_id, idempotencyKeyId, JSON.stringify(responseSnapshot), responseEventId],
    )
  }

  private async insertClinicalAction(
    client: TransactionClient,
    actor: ActorContext,
    session: SessionRow,
    input: SubmitSimulationActionRequestDto,
    idempotencyKeyId?: string,
  ): Promise<ClinicalActionDto> {
    const sequence = await this.nextSequence(client, "clinical_actions", session.id)
    const payload = {
      text: sanitizeStudentText(input.text),
      payload: sanitizePayload(input.payload),
      client_sequence: input.client_sequence,
    }

    const result = await client.query<ActionRow>(
      `
        INSERT INTO clinical_actions (
          institution_id,
          session_id,
          actor_user_id,
          idempotency_key_id,
          action_type,
          status,
          sequence,
          payload,
          normalized_intent
        )
        VALUES ($1, $2, $3, $4, $5, 'received', $6, $7::jsonb, $8)
        RETURNING *
      `,
      [
        actor.institution_id,
        session.id,
        actor.user_id,
        idempotencyKeyId ?? null,
        input.action_type,
        sequence,
        JSON.stringify(payload),
        input.action_type,
      ],
    )

    return this.mapAction(result.rows[0])
  }

  private async updateClinicalActionStatus(
    client: TransactionClient,
    actor: ActorContext,
    actionId: string,
    status: ClinicalActionStatus,
    blockedReason?: string,
  ): Promise<ClinicalActionDto> {
    const result = await client.query<ActionRow>(
      `
        UPDATE clinical_actions
        SET status = $3,
            blocked_reason = $4
        WHERE institution_id = $1
          AND id = $2
        RETURNING *
      `,
      [actor.institution_id, actionId, status, blockedReason ?? null],
    )

    return this.mapAction(result.rows[0])
  }

  private async insertConversationMessage(
    client: TransactionClient,
    input: {
      actor: ActorContext
      session: SessionRow
      clinical_action_id: string
      speaker: ConversationSpeaker
      status: ConversationStatus
      content: string
      used_fact_ids: string[]
    },
  ): Promise<ConversationMessageDto> {
    const sequence = await this.nextSequence(client, "conversation_messages", input.session.id)
    const result = await client.query<MessageRow>(
      `
        INSERT INTO conversation_messages (
          institution_id,
          session_id,
          clinical_action_id,
          speaker,
          visibility,
          status,
          content,
          used_fact_ids,
          sequence
        )
        VALUES ($1, $2, $3, $4, 'student_safe', $5, $6, $7::jsonb, $8)
        RETURNING *
      `,
      [
        input.actor.institution_id,
        input.session.id,
        input.clinical_action_id,
        input.speaker,
        input.status,
        input.content,
        JSON.stringify(input.used_fact_ids),
        sequence,
      ],
    )

    return this.mapMessage(result.rows[0])
  }

  private async insertTimelineEvent(
    client: TransactionClient,
    input: {
      actor: ActorContext
      session_id: string
      clinical_action_id?: string
      event_type: TimelineEventDto["event_type"]
      title: string
      payload: Record<string, unknown>
    },
  ): Promise<TimelineEventDto> {
    const sequence = await this.nextSequence(client, "timeline_events", input.session_id)
    const result = await client.query<TimelineRow>(
      `
        INSERT INTO timeline_events (
          institution_id,
          session_id,
          clinical_action_id,
          event_type,
          title,
          payload,
          sequence
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        RETURNING *
      `,
      [
        input.actor.institution_id,
        input.session_id,
        input.clinical_action_id ?? null,
        input.event_type,
        input.title,
        JSON.stringify(input.payload),
        sequence,
      ],
    )

    return this.mapTimelineEvent(result.rows[0])
  }

  private async insertSafetyWarningTimelineAndEvent(
    client: TransactionClient,
    input: {
      actor: ActorContext
      session: SessionRow
      action_id: string
      action_type: SimulationActionType
      safety: SafetyEvaluationResultDto
      idempotency_key_id?: string
    },
  ): Promise<TimelineEventDto> {
    const payload = {
      action_id: input.action_id,
      action_type: input.action_type,
      safety_decision: input.safety.decision,
      safety_categories: safetyCategories(input.safety),
      safety_rule_keys: safetyRuleKeys(input.safety),
    }
    const timelineEvent = await this.insertTimelineEvent(client, {
      actor: input.actor,
      session_id: input.session.id,
      clinical_action_id: input.action_id,
      event_type: "safety.warning.created",
      title: "Safety warning created",
      payload,
    })

    await this.appendEventAndOutbox(client, {
      actor: input.actor,
      session_id: input.session.id,
      event_type: "safety.warning.created",
      payload: {
        session_id: input.session.id,
        ...payload,
      },
      idempotency_key_id: input.idempotency_key_id,
    })

    return timelineEvent
  }

  private async insertSnapshot(
    client: TransactionClient,
    actor: ActorContext,
    session: SessionRow,
    reason: string,
  ): Promise<SessionStateSnapshotDto> {
    const snapshot = {
      projection: "student_safe",
      session_id: session.id,
      case_id: session.case_id,
      case_version_id: session.case_version_id,
      student_user_id: session.student_user_id,
      state_version: session.state_version,
      patient_state: toJsonObject(session.patient_state),
    }

    const result = await client.query<SnapshotRow>(
      `
        INSERT INTO session_state_snapshots (
          institution_id,
          session_id,
          state_version,
          reason,
          snapshot
        )
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (session_id, state_version) DO UPDATE
        SET reason = EXCLUDED.reason,
            snapshot = EXCLUDED.snapshot
        RETURNING *
      `,
      [actor.institution_id, session.id, session.state_version, reason, JSON.stringify(snapshot)],
    )

    return this.mapSnapshot(result.rows[0])
  }

  private async insertRevealedFactReference(
    client: TransactionClient,
    actor: ActorContext,
    session: SessionRow,
    fact: FactForMockResponse,
    actionId: string,
    revealReason: string,
  ): Promise<RevealedFactReferenceDto | undefined> {
    const result = await client.query<RevealedFactRow>(
      `
        INSERT INTO session_revealed_facts (
          institution_id,
          session_id,
          fact_id,
          reveal_rule_id,
          revealed_by_action_id,
          revealed_to,
          reveal_reason
        )
        VALUES ($1, $2, $3, $4, $5, 'student_payload', $6)
        ON CONFLICT (session_id, fact_id, revealed_to) DO NOTHING
        RETURNING *
      `,
      [actor.institution_id, session.id, fact.fact_id, fact.reveal_rule_id ?? null, actionId, revealReason],
    )

    return result.rows[0] ? this.mapRevealedFact(result.rows[0]) : undefined
  }

  private async appendEventAndOutbox(
    client: TransactionClient,
    input: {
      actor: ActorContext
      session_id: string
      event_type: string
      payload: Record<string, unknown>
      idempotency_key_id?: string
    },
  ): Promise<EventRow> {
    const sequenceResult = await client.query<{ sequence: string } & QueryResultRow>(
      `
        SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence
        FROM event_log
        WHERE institution_id = $1
          AND stream_type = $2
          AND stream_id = $3
      `,
      [input.actor.institution_id, EVENT_STREAM_TYPE, input.session_id],
    )
    const sequence = sequenceResult.rows[0]?.sequence ?? "1"
    const eventPayload = {
      ...input.payload,
      event_source: "mock_simulation_runtime",
    }

    const eventResult = await client.query<EventRow>(
      `
        INSERT INTO event_log (
          institution_id,
          stream_type,
          stream_id,
          aggregate_type,
          aggregate_id,
          sequence,
          event_type,
          schema_version,
          producer,
          actor_user_id,
          idempotency_key_id,
          payload,
          payload_classification,
          replayable,
          redaction_status
        )
        VALUES (
          $1,
          $2,
          $3,
          'simulation_session',
          $3,
          $4,
          $5,
          $6,
          $7,
          $8,
          $9,
          $10::jsonb,
          'student_safe',
          true,
          'role_filtered'
        )
        RETURNING id, sequence
      `,
      [
        input.actor.institution_id,
        EVENT_STREAM_TYPE,
        input.session_id,
        sequence,
        input.event_type,
        EVENT_SCHEMA_VERSION,
        EVENT_PRODUCER,
        input.actor.user_id,
        input.idempotency_key_id ?? null,
        JSON.stringify(eventPayload),
      ],
    )
    const event = eventResult.rows[0]

    await client.query(
      `
        INSERT INTO outbox_events (
          institution_id,
          event_id,
          topic,
          schema_version,
          payload,
          status
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, 'pending')
      `,
      [
        input.actor.institution_id,
        event.id,
        OUTBOX_TOPIC,
        EVENT_SCHEMA_VERSION,
        JSON.stringify({
          event_id: event.id,
          stream_type: EVENT_STREAM_TYPE,
          stream_id: input.session_id,
          sequence: Number(event.sequence),
          event_type: input.event_type,
          payload: eventPayload,
        }),
      ],
    )

    return event
  }

  private async incrementSessionStateVersion(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
  ): Promise<SessionRow> {
    const result = await client.query<SessionRow>(
      `
        UPDATE simulation_sessions
        SET state_version = state_version + 1,
            updated_at = now()
        WHERE institution_id = $1
          AND id = $2
        RETURNING *
      `,
      [actor.institution_id, sessionId],
    )

    return result.rows[0]
  }

  private async loadAllowedFacts(
    client: TransactionClient,
    actor: ActorContext,
    session: SessionRow,
  ): Promise<FactForMockResponse[]> {
    const result = await client.query<FactRow>(
      `
        SELECT
          f.fact_id,
          f.fact_type,
          f.visibility,
          f.content,
          f.student_safe_summary,
          NULL::uuid AS reveal_rule_id
        FROM fact_ledger f
        WHERE f.institution_id = $1
          AND f.case_version_id = $2
          AND f.deprecated_at IS NULL
          AND (
            f.visibility = 'baseline_visible'
            OR EXISTS (
              SELECT 1
              FROM session_revealed_facts srf
              WHERE srf.institution_id = f.institution_id
                AND srf.session_id = $3
                AND srf.fact_id = f.fact_id
                AND srf.revealed_to = 'student_payload'
            )
          )
        ORDER BY f.visibility ASC, f.fact_type ASC, f.created_at ASC
      `,
      [actor.institution_id, session.case_version_id, session.id],
    )

    return result.rows.map(this.mapFact)
  }

  private async loadEligibleAllergyFact(
    client: TransactionClient,
    actor: ActorContext,
    session: SessionRow,
  ): Promise<FactForMockResponse | undefined> {
    const result = await client.query<FactRow>(
      `
        SELECT
          f.fact_id,
          f.fact_type,
          f.visibility,
          f.content,
          f.student_safe_summary,
          rr.id AS reveal_rule_id
        FROM fact_ledger f
        JOIN fact_reveal_rules rr
          ON rr.institution_id = f.institution_id
         AND rr.case_version_id = f.case_version_id
         AND rr.fact_id = f.fact_id
         AND rr.rule_type = 'ask_directly'
         AND rr.active = true
        WHERE f.institution_id = $1
          AND f.case_version_id = $2
          AND f.fact_type = 'allergy'
          AND f.visibility IN ('hidden_until_revealed', 'baseline_visible')
          AND f.deprecated_at IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM session_revealed_facts srf
            WHERE srf.institution_id = f.institution_id
              AND srf.session_id = $3
              AND srf.fact_id = f.fact_id
              AND srf.revealed_to = 'student_payload'
          )
          AND NOT EXISTS (
            SELECT 1
            FROM fact_access_policies fap
            WHERE fap.institution_id = f.institution_id
              AND fap.case_version_id = f.case_version_id
              AND fap.actor_scope IN ('student_payload', 'persona_agent')
              AND fap.active = true
              AND (fap.fact_id = f.fact_id OR fap.fact_type = f.fact_type OR fap.visibility = f.visibility)
              AND fap.access_level IN ('allow_visible', 'allowed_for_safety', 'faculty_only', 'evaluator_after_completion')
          )
        ORDER BY rr.priority ASC, f.created_at ASC
        LIMIT 1
      `,
      [actor.institution_id, session.case_version_id, session.id],
    )

    return result.rows[0] ? this.mapFact(result.rows[0]) : undefined
  }

  private async loadMessages(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
  ): Promise<ConversationMessageDto[]> {
    const result = await client.query<MessageRow>(
      `
        SELECT *
        FROM conversation_messages
        WHERE institution_id = $1
          AND session_id = $2
          AND visibility = 'student_safe'
        ORDER BY sequence ASC
      `,
      [actor.institution_id, sessionId],
    )

    return result.rows.map((row) => this.mapMessage(row))
  }

  private async loadTimelineEvents(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
  ): Promise<TimelineEventDto[]> {
    const result = await client.query<TimelineRow>(
      `
        SELECT *
        FROM timeline_events
        WHERE institution_id = $1
          AND session_id = $2
        ORDER BY sequence ASC
      `,
      [actor.institution_id, sessionId],
    )

    return result.rows.map((row) => this.mapTimelineEvent(row))
  }

  private async loadRevealedFactReferences(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
  ): Promise<RevealedFactReferenceDto[]> {
    const result = await client.query<RevealedFactRow>(
      `
        SELECT
          session_id,
          fact_id,
          reveal_rule_id,
          revealed_by_action_id,
          revealed_to,
          reveal_reason,
          created_at
        FROM session_revealed_facts
        WHERE institution_id = $1
          AND session_id = $2
          AND revealed_to = 'student_payload'
        ORDER BY created_at ASC, fact_id ASC
      `,
      [actor.institution_id, sessionId],
    )

    return result.rows.map((row) => this.mapRevealedFact(row))
  }

  private async loadLatestSnapshot(
    client: TransactionClient,
    actor: ActorContext,
    sessionId: string,
  ): Promise<SessionStateSnapshotDto | undefined> {
    const result = await client.query<SnapshotRow>(
      `
        SELECT *
        FROM session_state_snapshots
        WHERE institution_id = $1
          AND session_id = $2
        ORDER BY state_version DESC
        LIMIT 1
      `,
      [actor.institution_id, sessionId],
    )

    return result.rows[0] ? this.mapSnapshot(result.rows[0]) : undefined
  }

  private async nextSequence(client: TransactionClient, tableName: string, sessionId: string): Promise<number> {
    const allowedTables = new Set(["clinical_actions", "conversation_messages", "timeline_events"])
    if (!allowedTables.has(tableName)) {
      throw new Error(`Unsupported sequence table: ${tableName}`)
    }

    const result = await client.query<{ sequence: number } & QueryResultRow>(
      `SELECT COALESCE(MAX(sequence), 0) + 1 AS sequence FROM ${tableName} WHERE session_id = $1`,
      [sessionId],
    )

    return Number(result.rows[0]?.sequence ?? 1)
  }

  private mapSession(row: SessionRow): SimulationSessionDto {
    return {
      contract_version: SIMULATION_SESSION_CONTRACT_VERSION,
      id: row.id,
      institution_id: row.institution_id,
      case_id: row.case_id,
      case_version_id: row.case_version_id,
      student_user_id: row.student_user_id,
      status: row.status,
      state_version: Number(row.state_version),
      patient_state: toJsonObject(row.patient_state),
      started_at: toIso(row.started_at),
      completed_at: toOptionalIso(row.completed_at),
      expires_at: toOptionalIso(row.expires_at),
      created_at: toIso(row.created_at),
      updated_at: toIso(row.updated_at),
    }
  }

  private mapAction(row: ActionRow): ClinicalActionDto {
    return {
      contract_version: CLINICAL_ACTION_CONTRACT_VERSION,
      id: row.id,
      session_id: row.session_id,
      actor_user_id: row.actor_user_id,
      idempotency_key_id: row.idempotency_key_id ?? undefined,
      action_type: row.action_type,
      status: row.status,
      sequence: Number(row.sequence),
      payload: toJsonObject(row.payload),
      normalized_intent: row.normalized_intent ?? undefined,
      blocked_reason: row.blocked_reason ?? undefined,
      created_at: toIso(row.created_at),
    }
  }

  private mapMessage(row: MessageRow): ConversationMessageDto {
    return {
      contract_version: CONVERSATION_MESSAGE_CONTRACT_VERSION,
      id: row.id,
      session_id: row.session_id,
      clinical_action_id: row.clinical_action_id ?? undefined,
      speaker: row.speaker,
      visibility: row.visibility,
      status: row.status,
      content: row.content,
      used_fact_ids: toStringArray(row.used_fact_ids),
      sequence: Number(row.sequence),
      created_at: toIso(row.created_at),
    }
  }

  private mapTimelineEvent(row: TimelineRow): TimelineEventDto {
    return {
      contract_version: TIMELINE_EVENT_CONTRACT_VERSION,
      id: row.id,
      session_id: row.session_id,
      clinical_action_id: row.clinical_action_id ?? undefined,
      event_type: row.event_type,
      title: row.title,
      description: row.description ?? undefined,
      payload: toJsonObject(row.payload),
      sequence: Number(row.sequence),
      created_at: toIso(row.created_at),
    }
  }

  private mapSnapshot(row: SnapshotRow): SessionStateSnapshotDto {
    return {
      contract_version: SESSION_STATE_SNAPSHOT_CONTRACT_VERSION,
      id: row.id,
      session_id: row.session_id,
      state_version: Number(row.state_version),
      reason: row.reason,
      snapshot: toJsonObject(row.snapshot),
      created_at: toIso(row.created_at),
    }
  }

  private mapRevealedFact(row: RevealedFactRow): RevealedFactReferenceDto {
    return {
      contract_version: REVEALED_FACT_REFERENCE_CONTRACT_VERSION,
      session_id: row.session_id,
      fact_id: row.fact_id,
      reveal_rule_id: row.reveal_rule_id ?? undefined,
      revealed_by_action_id: row.revealed_by_action_id ?? undefined,
      revealed_to: row.revealed_to,
      reveal_reason: row.reveal_reason,
      created_at: toIso(row.created_at),
    }
  }

  private mapFact(row: FactRow): FactForMockResponse {
    return {
      fact_id: row.fact_id,
      fact_type: row.fact_type,
      visibility: row.visibility,
      student_safe_summary: row.student_safe_summary,
      content: toJsonObject(row.content),
      reveal_rule_id: row.reveal_rule_id,
    }
  }
}

function toJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value)
      return isRecord(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }

  return isRecord(value) ? value : {}
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string")
  }

  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []
    } catch {
      return []
    }
  }

  return []
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value
}

function toOptionalIso(value: Date | string | null): string | undefined {
  return value ? toIso(value) : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
}

function isBlockingSafetyDecision(safety: SafetyEvaluationResultDto): boolean {
  return safety.decision === "block" || safety.decision === "block_unsupported"
}

function buildSafetyBlockedReason(safety: SafetyEvaluationResultDto): string {
  if (safety.decision === "block_unsupported") {
    return "This deterministic safety engine records unsupported or unsafe clinical attempts but does not execute orders, diagnosis, or treatment."
  }

  return "Blocked by deterministic safety rules before unsafe or unauthorized simulation content could be returned."
}

function buildSafetyBlockedMessage(safety: SafetyEvaluationResultDto): string {
  if (safety.decision === "block_unsupported") {
    return "This mock simulation records that attempt, but it does not execute orders, diagnosis, treatment, medication, imaging, or debrief workflows."
  }

  return "That request is blocked by deterministic safety rules. I can continue as the simulated patient with normal intake questions."
}

function safetyCategories(safety: SafetyEvaluationResultDto): string[] {
  return [...new Set(safety.findings.map((finding) => finding.category))]
}

function safetyRuleKeys(safety: SafetyEvaluationResultDto): string[] {
  return safety.findings.map((finding) => finding.rule_key)
}

function sanitizeStudentText(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function sanitizePayload(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}
