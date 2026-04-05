export type MomentType = 'breath' | 'physical' | 'grounding' | 'reflection' | 'sensory'
export type Moment = {
  id: string
  type: MomentType
  copy: {
    direct: string
    reflective: string
  }
  why_it_works: string
  min_duration: number
  max_duration: number
  available_from_week: number
  tags: string[]
}
