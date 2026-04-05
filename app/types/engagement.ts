export type EngagementAction = 'completed' | 'dismissed' | 'skipped'

export type Engagement = {
  id?: number
  moment_id: string
  gap_id: string
  action: EngagementAction
  timestamp: string
}
