export interface FeatureFlagSnapshotDto {
  live_agents: boolean
  realtime_transport: boolean
  voice_mode: boolean
  evaluator_debrief: boolean
  faculty_review: boolean
  scenario_publish: boolean
  agent_control: boolean
  advanced_imaging: boolean
}

export function buildFeatureFlagSnapshotDto(
  input: Partial<FeatureFlagSnapshotDto> = {},
): FeatureFlagSnapshotDto {
  return {
    live_agents: false,
    realtime_transport: false,
    voice_mode: false,
    evaluator_debrief: false,
    faculty_review: false,
    scenario_publish: false,
    agent_control: false,
    advanced_imaging: false,
    ...input,
  }
}

export const disabledSkeletonFeatureFlagSnapshotDto: FeatureFlagSnapshotDto = buildFeatureFlagSnapshotDto()
