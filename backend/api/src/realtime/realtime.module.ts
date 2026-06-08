import { Module } from "@nestjs/common"

import { ReplayModule } from "../replay/replay.module"
import { RealtimeController } from "./realtime.controller"
import { RealtimeService } from "./realtime.service"

@Module({
  imports: [ReplayModule],
  controllers: [RealtimeController],
  providers: [RealtimeService],
})
export class RealtimeModule {}
