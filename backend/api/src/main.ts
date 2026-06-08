import "reflect-metadata"

import { NestFactory } from "@nestjs/core"

import { AppModule } from "./app.module"

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  const port = Number.parseInt(process.env.API_PORT ?? "3001", 10)

  await app.listen(port)
}

void bootstrap()

