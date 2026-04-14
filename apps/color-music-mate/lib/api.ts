const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export interface UploadResponse {
  id: string
  status: string
  message: string
}

export interface JobStatus {
  id: string
  status: 'pending' | 'processing' | 'done' | 'error'
  progress: number
  message: string
  score_id?: string
}

export interface KeyOption {
  key: string
  label: string
}

export async function uploadScore(file: File): Promise<UploadResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_BASE}/omr/upload`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`업로드 실패: ${res.statusText}`)
  return res.json()
}

export async function getJobStatus(id: string): Promise<JobStatus> {
  const res = await fetch(`${API_BASE}/omr/status/${id}`)
  if (!res.ok) throw new Error(`상태 조회 실패: ${res.statusText}`)
  return res.json()
}

export async function getScore(id: string) {
  const res = await fetch(`${API_BASE}/omr/score/${id}`)
  if (!res.ok) throw new Error(`악보 조회 실패: ${res.statusText}`)
  return res.json()
}

export async function transposeScore(scoreId: string, targetKey: string) {
  const res = await fetch(`${API_BASE}/omr/score/${scoreId}/transpose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ target_key: targetKey }),
  })
  if (!res.ok) throw new Error(`전조 실패: ${res.statusText}`)
  return res.json()
}

export async function correctNote(
  scoreId: string,
  noteId: number,
  pitch: string,
  duration: number,
) {
  const res = await fetch(`${API_BASE}/omr/score/${scoreId}/notes`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ note_id: noteId, pitch, duration }),
  })
  if (!res.ok) throw new Error(`수정 실패: ${res.statusText}`)
  return res.json()
}

export async function getKeyOptions(): Promise<KeyOption[]> {
  const res = await fetch(`${API_BASE}/omr/keys`)
  if (!res.ok) return []
  return res.json()
}
