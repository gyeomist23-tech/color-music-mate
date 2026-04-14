'use client'

import { ColorNote, ColorScore as ColorScoreType } from '@/lib/color-mapping'

interface ColorScoreProps {
  score: ColorScoreType
  currentNoteIndex?: number
  onNoteClick?: (index: number) => void
}

const NOTES_PER_ROW = 8

export function ColorScore({ score, currentNoteIndex = -1, onNoteClick }: ColorScoreProps) {
  const rows: ColorNote[][] = []
  for (let i = 0; i < score.notes.length; i += NOTES_PER_ROW) {
    rows.push(score.notes.slice(i, i + NOTES_PER_ROW))
  }

  return (
    <div className="w-full">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-gray-800">{score.title}</h2>
        <p className="text-gray-500 mt-1">빠르기: {score.bpm} BPM · 조성: {score.key}</p>
      </div>

      {/* 계이름 범례 */}
      <div className="flex flex-wrap justify-center gap-3 mb-8 p-4 bg-white rounded-2xl border">
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

      {/* 악보 */}
      <div className="space-y-4">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-2 bg-white p-4 rounded-2xl border">
            <span className="text-gray-400 text-sm w-6 text-center">{rowIndex + 1}</span>
            <div className="flex flex-wrap gap-2 flex-1">
              {row.map((note) => {
                const isActive = note.id === currentNoteIndex
                return (
                  <button
                    key={note.id}
                    onClick={() => onNoteClick?.(note.id)}
                    className={`
                      relative flex flex-col items-center justify-center rounded-2xl
                      transition-all duration-150 font-bold select-none
                      ${note.duration <= 0.25 ? 'w-14 h-14' : note.duration <= 0.5 ? 'w-16 h-16' : 'w-20 h-20'}
                      ${isActive ? 'scale-110 shadow-xl ring-4 ring-yellow-400' : 'hover:scale-105 shadow-md'}
                    `}
                    style={{
                      backgroundColor: note.color,
                      boxShadow: isActive ? `0 0 20px ${note.color}80` : undefined,
                    }}
                    aria-label={`${note.solfege} (${note.pitch})`}
                  >
                    <span className="text-white text-xl font-black drop-shadow">{note.degree}</span>
                    <span className="text-white text-sm drop-shadow">{note.solfege}</span>
                    {isActive && (
                      <div className="absolute -top-2 -right-2 w-5 h-5 bg-yellow-400 rounded-full animate-ping" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
