export class SafetyPersistenceError extends Error {
  code = "safety_persistence_failed" as const

  constructor(message = "Unable to persist deterministic safety evaluation") {
    super(message)
    this.name = "SafetyPersistenceError"
  }
}
