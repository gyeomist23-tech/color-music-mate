'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getJobStatus, getScore } from '@/lib/api'
import { ColorScore as ColorScoreType } from '@/lib/color-mapping'
import { ColorScore } from '@/components/score/ColorScore'
import { PlaybackControls } from '@/components/playback/PlaybackControls'

type Status = 'pending' | 'processing' | 'done' | 'error'

export default function ScorePage() {
  const params = useParams()
  const router = useRouter()
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

  const handleSaveImage = async () => {
    alert('PNG 저장 기능은 준비 중입니다. (html2canvas 설치 필요)')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* 헤더 */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black text-gray-800 hover:text-blue-600">
          🎨🎵 Color Music Mate
        </Link>
        {score && (
          <div className="flex gap-3">
            <Link
              href={`/teacher/${id}`}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-2 rounded-xl transition-colors"
            >
              교사용 화면
            </Link>
            <Link
              href={`/student/${id}`}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-5 py-2 rounded-xl transition-colors"
            >
              학생용 화면
            </Link>
            <button
              onClick={handleSaveImage}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-5 py-2 rounded-xl transition-colors"
            >
              PNG 저장
            </button>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* 로딩 상태 */}
        {status !== 'done' && status !== 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="text-6xl mb-6 animate-bounce">🎵</div>
            <h2 className="text-3xl font-bold text-gray-700 mb-4">{message}</h2>
            <div className="w-full max-w-md bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 rounded-full"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-gray-500 mt-3 text-lg">{progress}%</p>
          </div>
        )}

        {/* 오류 상태 */}
        {status === 'error' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="text-6xl mb-6">⚠️</div>
            <h2 className="text-3xl font-bold text-red-600 mb-4">오류가 발생했습니다</h2>
            <p className="text-gray-600 text-xl mb-8">{error ?? message}</p>
            <Link
              href="/"
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold text-xl px-8 py-4 rounded-2xl transition-colors"
            >
              처음으로 돌아가기
            </Link>
          </div>
        )}

        {/* 완료 - 악보 표시 */}
        {status === 'done' && score && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2" id="color-score-content">
              <ColorScore
                score={score}
                currentNoteIndex={currentNoteIndex}
                onNoteClick={setCurrentNoteIndex}
              />
            </div>
            <div className="lg:col-span-1">
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
