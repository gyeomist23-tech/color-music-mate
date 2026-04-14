'use client'

import { useRef } from 'react'
import { ColorNote, ColorScore as ColorScoreType } from '@/lib/color-mapping'

interface ColorScoreProps {
  score: ColorScoreType
  currentNoteIndex?: number
  onNoteClick?: (index: number) => void
  showDownload?: boolean
}

/** 마디별로 음표를 그룹화 */
function groupByMeasure(notes: ColorNote[]): { measure: number; notes: ColorNote[] }[] {
  const map = new Map<number, ColorNote[]>()
  for (const note of notes) {
    const m = note.measure ?? 0
    if (!map.has(m)) map.set(m, [])
    map.get(m)!.push(note)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([measure, notes]) => ({ measure, notes }))
}

/** 한 줄에 들어갈 마디 수 (화면 크기에 따라 조절 가능) */
const MEASURES_PER_ROW = 4

export function ColorScore({ score, currentNoteIndex = -1, onNoteClick, showDownload = true }: ColorScoreProps) {
  const scoreRef = useRef<HTMLDivElement>(null)
  const measures = groupByMeasure(score.notes)

  // 줄(row) 단위로 마디 그룹화
  const rows: { measure: number; notes: ColorNote[] }[][] = []
  for (let i = 0; i < measures.length; i += MEASURES_PER_ROW) {
    rows.push(measures.slice(i, i + MEASURES_PER_ROW))
  }

  // 박자 표시 텍스트
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
      alert('다운로드 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="w-full">
      {/* 다운로드 버튼 */}
      {showDownload && (
        <div className="flex justify-end gap-2 mb-4">
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
      <div ref={scoreRef} className="bg-white p-6 rounded-2xl">
        {/* 제목 & 정보 */}
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-gray-800">{score.title}</h2>
          <p className="text-gray-500 mt-1">
            빠르기: {score.bpm} BPM · 조성: {score.key} · 박자: {timeSignature}
          </p>
        </div>

        {/* 계이름 범례 */}
        <div className="flex flex-wrap justify-center gap-3 mb-8 p-4 bg-gray-50 rounded-2xl border">
          {[
            { degree: 1, solfege: '도', color: '#FF4444' },
            { degree: 2, solfege: '레', color: '#FF8C00' },
            { degree: 3, solfege: '미', color: '#FFD700' },
            { degree: 4, solfege: '파', color: '#4CAF50' },
            { degree: 5, solfege: '솔', color: '#87CEEB' },
            { degree: 6, solfege: '라', color: '#4169E1' },
            { degree: 7, solfege: '시', color: '#9370DB' },
          ].map((item) => (
            <div key={item.degree} className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-full border-2 border-gray-300 flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: item.color }}
              >
                {item.degree}
              </div>
              <span className="font-bold text-gray-700">{item.solfege}</span>
            </div>
          ))}
        </div>

        {/* 마디별 악보 */}
        <div className="space-y-3">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex items-stretch gap-0 bg-gray-50 rounded-2xl border overflow-hidden">
              {row.map((measureGroup, mIdx) => (
                <div
                  key={measureGroup.measure}
                  className={`flex-1 flex items-center gap-1 p-3 ${
                    mIdx < row.length - 1 ? 'border-r-2 border-gray-400' : ''
                  }`}
                >
                  {/* 마디 번호 */}
                  <span className="text-gray-400 text-xs font-mono w-5 text-center shrink-0">
                    {measureGroup.measure}
                  </span>
                  {/* 마디 내 음표들 */}
                  <div className="flex flex-wrap gap-1.5 flex-1 justify-center">
                    {measureGroup.notes.map((note) => {
                      const isActive = note.id === currentNoteIndex
                      // 크기: 음표 길이에 비례
                      const sizeClass =
                        note.duration <= 0.25
                          ? 'w-11 h-11 text-xs'
                          : note.duration <= 0.5
                          ? 'w-14 h-14 text-sm'
                          : note.duration <= 1
                          ? 'w-16 h-16 text-base'
                          : 'w-20 h-20 text-lg'
                      return (
                        <button
                          key={note.id}
                          onClick={() => onNoteClick?.(note.id)}
                          className={`
                            relative flex flex-col items-center justify-center rounded-xl
                            transition-all duration-150 font-bold select-none
                            ${sizeClass}
                            ${isActive ? 'scale-110 shadow-xl ring-4 ring-yellow-400 z-10' : 'hover:scale-105 shadow-md'}
                          `}
                          style={{
                            backgroundColor: note.color,
                            boxShadow: isActive ? `0 0 20px ${note.color}80` : undefined,
                          }}
                          aria-label={`${note.solfege} (${note.pitch})`}
                        >
                          <span className="text-white font-black drop-shadow">{note.degree}</span>
                          <span className="text-white drop-shadow leading-tight">{note.solfege}</span>
                          {isActive && (
                            <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
              {/* 빈 마디 채우기 (마지막 줄이 짧을 때) */}
              {row.length < MEASURES_PER_ROW &&
                Array.from({ length: MEASURES_PER_ROW - row.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="flex-1 border-r-0" />
                ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
