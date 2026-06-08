import {
  isReplayAudience,
  REPLAY_DEFAULT_LIMIT,
  REPLAY_MAX_LIMIT,
  type ReplayAudience,
  type ReplayEventLogRow,
  type ReplayRequestQuery,
} from "./replay.dto"
import { ReplayBadRequestError } from "./replay.errors"

export interface ReplaySequenceIntegrity {
  gap_detected: boolean
  duplicate_count: number
}

export function parseReplayQuery(input: {
  after_sequence?: unknown
  limit?: unknown
  audience?: unknown
}): ReplayRequestQuery {
  return {
    after_sequence: parseReplayAfterSequence(input.after_sequence),
    limit: parseReplayLimit(input.limit),
    audience: parseReplayAudience(input.audience),
  }
}

export function parseReplayAfterSequence(value: unknown): number {
  return parseIntegerQueryValue(value, "after_sequence", 0, 0, Number.MAX_SAFE_INTEGER)
}

export function parseReplayLimit(value: unknown): number {
  return parseIntegerQueryValue(value, "limit", REPLAY_DEFAULT_LIMIT, 1, REPLAY_MAX_LIMIT)
}

export function parseReplayAudience(value: unknown): ReplayAudience {
  if (value === undefined || value === null || value === "") {
    return "student"
  }

  if (Array.isArray(value) || !isReplayAudience(value)) {
    throw new ReplayBadRequestError("audience_invalid", "audience must be one of student, faculty, or system")
  }

  return value
}

export function detectSequenceIntegrity(
  events: Pick<ReplayEventLogRow, "sequence">[],
  afterSequence: number,
): ReplaySequenceIntegrity {
  const sortedSequences = [...events]
    .map((event) => event.sequence)
    .filter((sequence) => Number.isInteger(sequence) && sequence > afterSequence)
    .sort((left, right) => left - right)

  const seen = new Set<number>()
  const uniqueSequences: number[] = []
  let duplicateCount = 0

  for (const sequence of sortedSequences) {
    if (seen.has(sequence)) {
      duplicateCount += 1
      continue
    }

    seen.add(sequence)
    uniqueSequences.push(sequence)
  }

  let gapDetected = false
  let previous = afterSequence

  for (const sequence of uniqueSequences) {
    if (sequence > previous + 1) {
      gapDetected = true
      break
    }

    previous = sequence
  }

  return {
    gap_detected: gapDetected,
    duplicate_count: duplicateCount,
  }
}

export function maxReplaySequence(
  events: Pick<ReplayEventLogRow, "sequence">[],
  fallbackSequence: number,
): number {
  return events.reduce(
    (max, event) => (Number.isInteger(event.sequence) && event.sequence > max ? event.sequence : max),
    fallbackSequence,
  )
}

function parseIntegerQueryValue(
  value: unknown,
  fieldName: string,
  defaultValue: number,
  minimum: number,
  maximum: number,
): number {
  if (value === undefined || value === null || value === "") {
    return defaultValue
  }

  if (Array.isArray(value)) {
    throw new ReplayBadRequestError(`${fieldName}_invalid`, `${fieldName} must be a single integer`)
  }

  const numericValue = typeof value === "number" ? value : Number(value)

  if (!Number.isInteger(numericValue) || numericValue < minimum || numericValue > maximum) {
    throw new ReplayBadRequestError(
      `${fieldName}_invalid`,
      `${fieldName} must be an integer between ${minimum} and ${maximum}`,
    )
  }

  return numericValue
}
