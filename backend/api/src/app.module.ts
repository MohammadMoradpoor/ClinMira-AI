import { Module } from "@nestjs/common"

import { HealthController } from "./health/health.controller"
import { HealthService } from "./health/health.service"
import { RealtimeModule } from "./realtime/realtime.module"
import { ReplayModule } from "./replay/replay.module"
import { SimulationModule } from "./simulation/simulation.module"

@Module({
  imports: [SimulationModule, ReplayModule, RealtimeModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
