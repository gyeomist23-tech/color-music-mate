'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UploadZone } from '@/components/upload/UploadZone'

export default function Home() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  const handleUploadStart = (id: string) => {
    router.push(`/score/${id}`)
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col items-center justify-center p-6">
      {/* 로고 */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-4">🎨🎵</div>
        <h1 className="text-5xl font-black text-gray-800 mb-3">
          Color Music Mate
        </h1>
        <p className="text-2xl text-gray-600">
          색깔로 배우는 피아노 악보
        </p>
        <p className="text-lg text-gray-400 mt-2">
          악보 사진을 올리면 색깔악보로 변환해 드립니다
        </p>
      </div>

      {/* 업로드 영역 */}
      <div className="w-full max-w-2xl">
        <UploadZone onUploadStart={handleUploadStart} onError={setError} />

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-lg font-bold text-center">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* 색깔 안내 */}
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        {[
          { label: '도', color: '#FF4444' },
          { label: '레', color: '#FF8C00' },
          { label: '미', color: '#FFD700' },
          { label: '파', color: '#4CAF50' },
          { label: '솔', color: '#87CEEB' },
          { label: '라', color: '#4169E1' },
          { label: '시', color: '#9370DB' },
        ].map((item) => (
          <div
            key={item.label}
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-black shadow-lg"
            style={{ backgroundColor: item.color }}
          >
            {item.label}
          </div>
        ))}
      </div>
    </main>
  )
}
