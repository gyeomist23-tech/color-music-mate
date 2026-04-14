'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getJobStatus, getScore } from '@/lib/api'
import { ColorScore as ColorScoreType } from '@/lib/color-mapping'
import { ColorScore } from '@/components/score/ColorScore'
import { PlaybackControls } from '@/components/playback/PlaybackControls'

type Status = 'pending' | 'processing' | 'done' | 'error'

export default function ScorePage() {
  const params = useParams()
  const id = params.id as string

  const [status, setStatus] = useState<Status>('pending')
  const [progress, setProgress] = useState(0)
  const [message, setMessage] = useState('악보 분석을 시작합니다...')
  const [score, setScore] = useState<ColorScoreType | null>(null)
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  const pollStatus = useCallback(async () => {
    try {
      const data = await getJobStatus(id)
      setStatus(data.status)
      setProgress(data.progress)
      setMessage(data.message)

      if (data.status === 'done' && data.score_id) {
        const scoreData = await getScore(data.score_id)
        setScore(scoreData)
      }
    } catch {
      setError('서버와 연결할 수 없습니다. FastAPI 서버가 실행 중인지 확인하세요.')
      setStatus('error')
    }
  }, [id])

  useEffect(() => {
    if (status === 'done' || status === 'error') return
    const interval = setInterval(pollStatus, 1500)
    pollStatus()
    return () => clearInterval(interval)
  }, [status, pollStatus])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between shrink-0">
        <Link href="/" className="text-xl font-black text-gray-800 hover:text-blue-600 flex items-center gap-2">
          🎨🎵 <span className="hidden sm:inline">Color Music Mate</span>
        </Link>

        <div className="flex gap-2">
          {score && (
            <>
              <Link
                href={`/teacher/${id}`}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm"
              >
                ✏️ 교사 수정
              </Link>
              <Link
                href={`/student/${id}`}
                className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-xl transition-colors text-sm"
              >
                👁️ 학생용
              </Link>
            </>
          )}
          <Link
            href="/"
            className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-4 py-2 rounded-xl transition-colors text-sm"
          >
            🏠 처음으로
          </Link>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 overflow-auto">
        {/* 로딩 */}
        {status !== 'done' && status !== 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
            <div className="text-6xl mb-6 animate-bounce">🎵</div>
            <h2 className="text-2xl font-bold text-gray-700 mb-4">{message}</h2>
            <div className="w-full max-w-md bg-gray-200 rounded-full h-5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-500 mt-3">{progress}%</p>
          </div>
        )}

        {/* 오류 */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-6">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-2xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
            <p className="text-gray-600 text-lg mb-6">{error ?? message}</p>
            <Link
              href="/"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-8 py-3 rounded-2xl transition-colors"
            >
              처음으로 돌아가기
            </Link>
          </div>
        )}

        {/* 완료 - 악보 + 컨트롤 한 화면에 */}
        {status === 'done' && score && (
          <div className="max-w-5xl mx-auto p-4 space-y-4">
            {/* 색깔악보 */}
            <ColorScore
              score={score}
              currentNoteIndex={currentNoteIndex}
              onNoteClick={setCurrentNoteIndex}
              compact
            />

            {/* 재생 컨트롤 */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <PlaybackControls
                score={score}
                onNoteChange={setCurrentNoteIndex}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
