'use client'

import { useRef } from 'react'
import { ColorNote, ColorScore as ColorScoreType } from '@/lib/color-mapping'

interface ColorScoreProps {
  score: ColorScoreType
  currentNoteIndex?: number
  onNoteClick?: (index: number) => void
  showDownload?: boolean
  compact?: boolean
}

/** 마디별로 음표를 그룹화 */
function groupByMeasure(notes: ColorNote[]): { measure: number; notes: ColorNote[] }[] {
  const map = new Map<number, ColorNote[]>()
  for (const note of notes) {
    const m = note.measure ?? 1
    if (!map.has(m)) map.set(m, [])
    map.get(m)!.push(note)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([measure, notes]) => ({ measure, notes }))
}

/** 한 줄에 들어갈 마디 수 */
const MEASURES_PER_ROW = 4

/** 음표 크기별 원 크기 (px) */
function noteSize(duration: number, compact: boolean): number {
  if (compact) {
    if (duration <= 0.25) return 36
    if (duration <= 0.5) return 42
    if (duration <= 1) return 50
    return 58
  }
  if (duration <= 0.25) return 44
  if (duration <= 0.5) return 52
  if (duration <= 1) return 60
  return 72
}

export function ColorScore({
  score,
  currentNoteIndex = -1,
  onNoteClick,
  showDownload = true,
  compact = false,
}: ColorScoreProps) {
  const scoreRef = useRef<HTMLDivElement>(null)
  const measures = groupByMeasure(score.notes)

  // 줄 단위로 마디 그룹화
  const rows: { measure: number; notes: ColorNote[] }[][] = []
  for (let i = 0; i < measures.length; i += MEASURES_PER_ROW) {
    rows.push(measures.slice(i, i + MEASURES_PER_ROW))
  }

  const timeSignature = score.timeSignature || '4/4'

  const handleDownload = async (format: 'png' | 'jpg') => {
    if (!scoreRef.current) return
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(scoreRef.current, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      })
      const link = document.createElement('a')
      link.download = `${score.title || '색깔악보'}.${format}`
      link.href = canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.95)
      link.click()
    } catch {
      alert('다운로드 중 오류가 발생했습니다.')
    }
  }

  return (
    <div className="w-full">
      {/* 다운로드 버튼 */}
      {showDownload && (
        <div className="flex justify-end gap-2 mb-3 print:hidden">
          <button
            onClick={() => handleDownload('png')}
            className="flex items-center gap-1 bg-purple-500 hover:bg-purple-600 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm"
          >
            📥 PNG 저장
          </button>
          <button
            onClick={() => handleDownload('jpg')}
            className="flex items-center gap-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm"
          >
            📥 JPG 저장
          </button>
        </div>
      )}

      {/* 인쇄용 악보 영역 */}
      <div ref={scoreRef} className="bg-white p-5 rounded-2xl shadow-sm">
        {/* 제목 */}
        <div className="text-center mb-4">
          <h2 className={`font-black text-gray-800 ${compact ? 'text-2xl' : 'text-3xl'}`}>
            {score.title}
          </h2>
          <p className="text-gray-400 mt-1 text-sm">
            {score.key}장조 · {timeSignature} · ♩={score.bpm}
          </p>
        </div>

        {/* 계이름 범례 */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {[
            { solfege: '도', color: '#FF4444' },
            { solfege: '레', color: '#FF8C00' },
            { solfege: '미', color: '#FFD700' },
            { solfege: '파', color: '#4CAF50' },
            { solfege: '솔', color: '#87CEEB' },
            { solfege: '라', color: '#4169E1' },
            { solfege: '시', color: '#9370DB' },
          ].map((item) => (
            <div key={item.solfege} className="flex items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs border-2 border-white shadow"
                style={{ backgroundColor: item.color }}
              >
                {item.solfege}
              </div>
            </div>
          ))}
        </div>

        {/* ── 표 형태 색깔악보 ── */}
        <div className="border-2 border-gray-800 rounded-lg overflow-hidden">
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className={`flex ${rowIndex < rows.length - 1 ? 'border-b-2 border-gray-800' : ''}`}
            >
              {row.map((measureGroup, mIdx) => {
                const maxNotesInRow = Math.max(...row.map(m => m.notes.length))
                return (
                  <div
                    key={measureGroup.measure}
                    className={`flex-1 ${mIdx < row.length - 1 ? 'border-r-2 border-gray-800' : ''}`}
                  >
                    {/* 음표 행 */}
                    <div className={`flex items-center justify-center gap-1 ${compact ? 'p-2 min-h-[56px]' : 'p-3 min-h-[72px]'}`}>
                      {measureGroup.notes.map((note) => {
                        const isActive = note.id === currentNoteIndex
                        const size = noteSize(note.duration, compact)
                        return (
                          <button
                            key={note.id}
                            onClick={() => onNoteClick?.(note.id)}
                            className={`
                              rounded-full flex items-center justify-center
                              text-white font-black shadow-md
                              transition-all duration-150 select-none shrink-0
                              ${isActive
                                ? 'ring-4 ring-yellow-400 scale-110 z-10'
                                : 'hover:scale-105'
                              }
                            `}
                            style={{
                              width: size,
                              height: size,
                              backgroundColor: note.color,
                              fontSize: compact ? '0.85rem' : '1.05rem',
                              boxShadow: isActive
                                ? `0 0 16px ${note.color}88`
                                : `0 2px 4px rgba(0,0,0,0.15)`,
                            }}
                            aria-label={`${note.solfege} (${note.pitch})`}
                          >
                            {note.solfege}
                          </button>
                        )
                      })}
                      {/* 빈 슬롯 (정렬용) */}
                      {measureGroup.notes.length < maxNotesInRow &&
                        Array.from({ length: maxNotesInRow - measureGroup.notes.length }).map((_, i) => (
                          <div key={`pad-${i}`} style={{ width: noteSize(0.5, compact), height: noteSize(0.5, compact) }} className="shrink-0" />
                        ))
                      }
                    </div>
                    {/* 마디 번호 */}
                    <div className="border-t border-gray-300 bg-gray-50 text-center text-xs text-gray-400 py-0.5">
                      {measureGroup.measure}
                    </div>
                  </div>
                )
              })}
              {/* 빈 마디 채우기 */}
              {row.length < MEASURES_PER_ROW &&
                Array.from({ length: MEASURES_PER_ROW - row.length }).map((_, i) => (
                  <div
                    key={`empty-${i}`}
                    className={`flex-1 ${i + row.length < MEASURES_PER_ROW ? 'border-r-2 border-gray-800' : ''}`}
                  >
                    <div className={compact ? 'p-2 min-h-[56px]' : 'p-3 min-h-[72px]'} />
                    <div className="border-t border-gray-300 bg-gray-50 py-0.5">&nbsp;</div>
                  </div>
                ))
              }
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
