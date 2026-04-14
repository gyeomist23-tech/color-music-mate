'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getScore, getJobStatus } from '@/lib/api'
import { ColorScore as ColorScoreType, ColorNote } from '@/lib/color-mapping'
import { PlaybackControls } from '@/components/playback/PlaybackControls'

export default function StudentPage() {
  const params = useParams()
  const id = params.id as string
  const [score, setScore] = useState<ColorScoreType | null>(null)
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const jobData = await getJobStatus(id)
        if (jobData.score_id) {
          const scoreData = await getScore(jobData.score_id)
          setScore(scoreData)
        }
      } catch {
        setError('악보를 불러올 수 없습니다.')
      }
    }
    load()
  }, [id])

  const currentNote: ColorNote | undefined =
    score?.notes.find((n) => n.id === currentNoteIndex)

  return (
    <div className="min-h-screen" style={{ backgroundColor: currentNote ? `${currentNote.color}20` : '#f0f9ff' }}>
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-3xl font-black text-gray-800">🎵 색깔 악보</h1>
        <Link
          href={`/score/${id}`}
          className="text-gray-500 hover:text-gray-700 font-bold px-4 py-2 rounded-xl border transition-colors"
        >
          뒤로
        </Link>
      </header>

      {error && (
        <div className="text-center py-20 text-red-600 text-2xl font-bold">{error}</div>
      )}

      {!score && !error && (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-4xl animate-bounce">🎵</div>
          <p className="text-2xl text-gray-500 ml-4">불러오는 중...</p>
        </div>
      )}

      {score && (
        <main className="max-w-4xl mx-auto p-6 space-y-8">
          {/* 현재 음표 크게 표시 */}
          {currentNote && (
            <div
              className="flex items-center justify-center rounded-3xl p-8 text-white shadow-2xl transition-all duration-200"
              style={{ backgroundColor: currentNote.color }}
            >
              <div className="text-center">
                <div className="text-9xl font-black mb-2">{currentNote.solfege}</div>
                <div className="text-4xl font-bold opacity-80">{currentNote.degree}번 음</div>
              </div>
            </div>
          )}

          {/* 큰 음표 버튼들 */}
          <div className="bg-white rounded-3xl p-6 border shadow">
            <h2 className="text-2xl font-bold text-center text-gray-700 mb-6">{score.title}</h2>
            <div className="flex flex-wrap gap-4 justify-center">
              {score.notes.map((note) => {
                const isActive = note.id === currentNoteIndex
                return (
                  <button
                    key={note.id}
                    onClick={() => setCurrentNoteIndex(note.id)}
                    className={`
                      w-20 h-20 rounded-2xl flex flex-col items-center justify-center
                      font-black text-white shadow-md transition-all
                      ${isActive ? 'scale-125 shadow-2xl ring-4 ring-yellow-400' : 'hover:scale-110'}
                    `}
                    style={{
                      backgroundColor: note.color,
                      boxShadow: isActive ? `0 0 30px ${note.color}` : undefined,
                    }}
                    aria-label={note.solfege}
                  >
                    <span className="text-3xl">{note.degree}</span>
                    <span className="text-lg">{note.solfege}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 재생 컨트롤 */}
          <PlaybackControls score={score} onNoteChange={setCurrentNoteIndex} />
        </main>
      )}
    </div>
  )
}
