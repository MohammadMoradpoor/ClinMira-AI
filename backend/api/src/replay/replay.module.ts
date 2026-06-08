import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { ReplayController } from "./replay.controller"
import { ReplayRepository } from "./replay.repository"
import { ReplayService } from "./replay.service"

@Module({
  imports: [DatabaseModule],
  controllers: [ReplayController],
  providers: [ReplayRepository, ReplayService],
  exports: [ReplayService],
})
export class ReplayModule {}
