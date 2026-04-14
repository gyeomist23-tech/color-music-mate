'use client'

import { useState, useCallback, useRef } from 'react'
import { uploadScore } from '@/lib/api'

interface UploadZoneProps {
  onUploadStart: (id: string) => void
  onError: (message: string) => void
}

export function UploadZone({ onUploadStart, onError }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      onError('PNG 또는 JPG 파일만 업로드할 수 있습니다.')
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      onError('파일 크기는 10MB 이하여야 합니다.')
      return
    }

    setIsUploading(true)
    try {
      const res = await uploadScore(file)
      onUploadStart(res.id)
    } catch (err) {
      onError(err instanceof Error ? err.message : '업로드에 실패했습니다.')
    } finally {
      setIsUploading(false)
    }
  }, [onUploadStart, onError])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => !isUploading && fileInputRef.current?.click()}
      className={`
        relative border-4 border-dashed rounded-3xl p-16 text-center cursor-pointer
        transition-all duration-200 min-h-[300px] flex flex-col items-center justify-center
        ${isDragging
          ? 'border-blue-500 bg-blue-50 scale-105'
          : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
        }
        ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg"
        onChange={handleInputChange}
        className="hidden"
        disabled={isUploading}
      />

      <div className="text-7xl mb-6">🎵</div>

      {isUploading ? (
        <>
          <div className="text-3xl font-bold text-blue-600 mb-3">업로드 중...</div>
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mt-4" />
        </>
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-700 mb-4">
            악보 이미지를 올려주세요
          </div>
          <div className="text-xl text-gray-500 mb-8">
            드래그하거나 클릭해서 파일 선택
          </div>
          <div className="bg-blue-500 hover:bg-blue-600 text-white text-2xl font-bold px-10 py-5 rounded-2xl transition-colors">
            📁 파일 선택하기
          </div>
          <div className="text-gray-400 mt-6 text-base">
            PNG, JPG 파일 · 최대 10MB
          </div>
        </>
      )}
    </div>
  )
}
