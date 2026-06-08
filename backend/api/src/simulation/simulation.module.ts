import { Module } from "@nestjs/common"

import { DatabaseModule } from "../database/database.module"
import { SafetyModule } from "../safety/safety.module"
import { SimulationController } from "./simulation.controller"
import { SimulationRepository } from "./simulation.repository"
import { SimulationService } from "./simulation.service"

@Module({
  imports: [DatabaseModule, SafetyModule],
  controllers: [SimulationController],
  providers: [SimulationRepository, SimulationService],
})
export class SimulationModule {}
