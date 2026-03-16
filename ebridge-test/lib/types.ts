export interface CandidateInfo {
  fullName: string
  phone: string
  email: string
  dob: string
  hometown: string
  occupation: string
  organization: string
  submittedAt: string
}

export type UploadStatus = 'pending' | 'uploading' | 'done' | 'error'

export interface PartConfig {
  id: number
  title: string
  titleVi: string
  duration: number
  type: 'speaking' | 'writing'
  question: string
  bullets: string[]
  tips: string
}
