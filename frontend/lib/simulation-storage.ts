"use client"

import { SimulationSnapshot } from "@/lib/simulation-engine"

const STORAGE_KEY = "clinmira:simulation"

function readAllSnapshots() {
  if (typeof window === "undefined") {
    return {} as Record<string, SimulationSnapshot>
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as Record<string, SimulationSnapshot>) : {}
  } catch {
    return {}
  }
}

export function readSimulationSnapshot(caseId: string) {
  return readAllSnapshots()[caseId] ?? null
}

export function writeSimulationSnapshot(snapshot: SimulationSnapshot) {
  if (typeof window === "undefined") {
    return
  }

  try {
    const current = readAllSnapshots()
    current[snapshot.caseId] = snapshot
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch {
    // Ignore storage write failures in the prototype.
  }
}
