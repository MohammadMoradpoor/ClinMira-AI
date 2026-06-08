import { Injectable } from "@nestjs/common"

import { ReplayService } from "../replay/replay.service"
import type { ReplayActorContext } from "../replay/replay.dto"
import {
  REALTIME_STREAM_SCHEMA_VERSION,
  type RealtimeSseMessage,
  type RealtimeStreamFrameDto,
} from "./realtime.dto"

@Injectable()
export class RealtimeService {
  constructor(private readonly replayService: ReplayService) {}

  async replayFirstStreamMessages(
    actor: ReplayActorContext,
    sessionId: string,
    query: {
      after_sequence?: unknown
      audience?: unknown
    },
  ): Promise<RealtimeSseMessage[]> {
    const replay = await this.replayService.replaySession(actor, sessionId, {
      after_sequence: query.after_sequence,
      audience: query.audience,
    })

    const replayEventFrames: RealtimeStreamFrameDto[] = replay.events.map((event) => ({
      schema_version: REALTIME_STREAM_SCHEMA_VERSION,
      frame_type: "replay_event",
      session_id: replay.session_id,
      delivery_only: true,
      data: event,
    }))

    const completionFrame: RealtimeStreamFrameDto = {
      schema_version: REALTIME_STREAM_SCHEMA_VERSION,
      frame_type: "replay_complete",
      session_id: replay.session_id,
      delivery_only: true,
      data: {
        replay_schema_version: replay.schema_version,
        next_cursor: replay.next_cursor,
        has_more: replay.has_more,
        gap_detected: replay.gap_detected,
        duplicate_count: replay.duplicate_count,
        note: "delivery_control_not_domain_event",
      },
    }

    return [...replayEventFrames, completionFrame].map((frame) => ({
      id: frame.frame_type === "replay_event" && "sequence" in frame.data ? String(frame.data.sequence) : undefined,
      type: frame.frame_type,
      data: frame,
    }))
  }
}
