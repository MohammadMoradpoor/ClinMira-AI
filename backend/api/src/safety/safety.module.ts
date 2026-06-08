import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { SafetyRepository } from "./safety.repository"
import { SafetyService } from "./safety.service"

@Module({
  imports: [DatabaseModule],
  providers: [SafetyRepository, SafetyService],
  exports: [SafetyRepository, SafetyService],
})
export class SafetyModule {}
