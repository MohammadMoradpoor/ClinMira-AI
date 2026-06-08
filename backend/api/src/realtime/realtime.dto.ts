import type { ReplayEventDto, ReplayResponseDto } from "../replay/replay.dto"

export const REALTIME_STREAM_SCHEMA_VERSION = "clinmira.realtime-stream.v1" as const

export type RealtimeStreamFrameType = "replay_event" | "replay_complete"

export interface RealtimeStreamFrameDto {
  schema_version: typeof REALTIME_STREAM_SCHEMA_VERSION
  frame_type: RealtimeStreamFrameType
  session_id: string
  delivery_only: true
  data: ReplayEventDto | RealtimeReplayCompleteDto
}

export interface RealtimeReplayCompleteDto {
  replay_schema_version: ReplayResponseDto["schema_version"]
  next_cursor: ReplayResponseDto["next_cursor"]
  has_more: boolean
  gap_detected: boolean
  duplicate_count: number
  note: "delivery_control_not_domain_event"
}

export interface RealtimeSseMessage {
  id?: string
  type: RealtimeStreamFrameType
  data: RealtimeStreamFrameDto
}
