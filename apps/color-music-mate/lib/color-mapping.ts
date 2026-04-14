export const COLOR_MAP: Record<number, { color: string; solfege: string; name: string }> = {
  1: { color: '#FF4444', solfege: '도', name: 'Do' },
  2: { color: '#FF8C00', solfege: '레', name: 'Re' },
  3: { color: '#FFD700', solfege: '미', name: 'Mi' },
  4: { color: '#4CAF50', solfege: '파', name: 'Fa' },
  5: { color: '#87CEEB', solfege: '솔', name: 'Sol' },
  6: { color: '#4169E1', solfege: '라', name: 'La' },
  7: { color: '#9370DB', solfege: '시', name: 'Si' },
}

export type NoteDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface ColorNote {
  id: number
  pitch: string
  degree: NoteDegree
  solfege: string
  color: string
  duration: number
  measure: number
  beat: number
}

export interface ColorScore {
  id: string
  title: string
  bpm: number
  key: string
  timeSignature?: string
  notes: ColorNote[]
}

export function getDegreeFromPitch(pitch: string): NoteDegree {
  const noteMap: Record<string, NoteDegree> = {
    C: 1, D: 2, E: 3, F: 4, G: 5, A: 6, B: 7,
  }
  const noteName = pitch.replace(/[0-9#b]/g, '').toUpperCase()
  return noteMap[noteName] ?? 1
}
