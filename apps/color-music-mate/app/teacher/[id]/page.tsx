'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { getScore, getJobStatus, transposeScore, correctNote, getKeyOptions, KeyOption } from '@/lib/api'
import { ColorScore as ColorScoreType, ColorNote, COLOR_MAP } from '@/lib/color-mapping'
import { PlaybackControls } from '@/components/playback/PlaybackControls'

const ALL_PITCHES = [
  'C3','D3','E3','F3','G3','A3','B3',
  'C4','D4','E4','F4','G4','A4','B4',
  'C5','D5','E5','F5','G5',
]

const DURATION_OPTIONS = [
  { value: 0.25, label: '8분음표' },
  { value: 0.5,  label: '4분음표' },
  { value: 1.0,  label: '2분음표' },
  { value: 2.0,  label: '온음표' },
]

export default function TeacherPage() {
  const params = useParams()
  const id = params.id as string

  const [score, setScore] = useState<ColorScoreType | null>(null)
  const [scoreId, setScoreId] = useState<string | null>(null)
  const [currentNoteIndex, setCurrentNoteIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)

  // 수정 모드
  const [editMode, setEditMode] = useState(false)
  const [selectedNote, setSelectedNote] = useState<ColorNote | null>(null)
  const [editPitch, setEditPitch] = useState('')
  const [editDuration, setEditDuration] = useState(0.5)
  const [saving, setSaving] = useState(false)

  // 조성 변경
  const [keyOptions, setKeyOptions] = useState<KeyOption[]>([])
  const [transposing, setTransposing] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const jobData = await getJobStatus(id)
        if (jobData.score_id) {
          setScoreId(jobData.score_id)
          const scoreData = await getScore(jobData.score_id)
          setScore(scoreData)
        }
        const keys = await getKeyOptions()
        setKeyOptions(keys)
      } catch {
        setError('악보를 불러올 수 없습니다.')
      }
    }
    load()
  }, [id])

  const handleNoteClick = useCallback((index: number) => {
    if (!editMode || !score) return
    const note = score.notes[index]
    setSelectedNote(note)
    setEditPitch(note.pitch)
    setEditDuration(note.duration)
  }, [editMode, score])

  const handleSaveNote = async () => {
    if (!scoreId || !selectedNote) return
    setSaving(true)
    try {
      const updated = await correctNote(scoreId, selectedNote.id, editPitch, editDuration)
      setScore((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          notes: prev.notes.map((n) => n.id === updated.id ? updated : n),
        }
      })
      setSelectedNote(null)
    } catch {
      alert('수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleTranspose = async (targetKey: string) => {
    if (!scoreId || !score || targetKey === score.key) return
    setTransposing(true)
    try {
      const newScore = await transposeScore(scoreId, targetKey)
      setScore(newScore)
    } catch {
      alert('조성 변경 중 오류가 발생했습니다.')
    } finally {
      setTransposing(false)
    }
  }

  const NOTES_PER_ROW = 8

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-blue-700 text-white px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black">🎓 교사용 화면</h1>
          <p className="text-blue-200 text-sm">색깔악보 확인 · 수정 · 조성 변경</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => { setEditMode(!editMode); setSelectedNote(null) }}
            className={`font-bold px-4 py-2 rounded-xl transition-colors
              ${editMode ? 'bg-yellow-400 text-gray-900' : 'bg-white/20 hover:bg-white/30 text-white'}`}
          >
            {editMode ? '✏️ 수정 모드 ON' : '✏️ 수정 모드'}
          </button>
          <Link
            href={`/student/${id}`}
            className="bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-xl transition-colors"
          >
            학생용 화면 →
          </Link>
          <Link href="/" className="bg-white/20 hover:bg-white/30 text-white font-bold px-4 py-2 rounded-xl">
            처음으로
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {error && <div className="text-center py-20 text-red-600 text-xl">{error}</div>}
        {!score && !error && <div className="text-center py-20 text-gray-500 text-xl animate-pulse">불러오는 중...</div>}

        {score && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 왼쪽 패널 */}
            <div className="xl:col-span-1 space-y-4">

              {/* 악보 정보 + 조성 변경 */}
              <div className="bg-white rounded-2xl p-6 border space-y-4">
                <h2 className="text-xl font-bold text-gray-800">악보 정보</h2>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">제목</dt>
                    <dd className="font-bold">{score.title}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">현재 조성</dt>
                    <dd className="font-bold text-blue-600">{score.key}장조</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">총 음표</dt>
                    <dd className="font-bold">{score.notes.length}개</dd>
                  </div>
                </dl>

                {/* 조성 변경 */}
                <div>
                  <p className="text-sm font-bold text-gray-600 mb-2">🎵 조성 변경</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {keyOptions.map((k) => (
                      <button
                        key={k.key}
                        onClick={() => handleTranspose(k.key)}
                        disabled={transposing || k.key === score.key}
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border-2 transition-all
                          ${k.key === score.key
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-blue-300 text-gray-600'
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                      >
                        {k.key}
                      </button>
                    ))}
                  </div>
                  {transposing && <p className="text-center text-blue-500 text-sm mt-2 animate-pulse">전조 중...</p>}
                </div>
              </div>

              {/* 음표 수정 패널 */}
              {editMode && (
                <div className="bg-yellow-50 rounded-2xl p-5 border-2 border-yellow-300 space-y-4">
                  <h3 className="font-black text-gray-800">✏️ 음표 수정</h3>
                  {!selectedNote ? (
                    <p className="text-gray-500 text-sm">악보에서 음표를 클릭하세요</p>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600">
                        선택: <strong>{selectedNote.solfege}({selectedNote.pitch})</strong> {selectedNote.measure}마디
                      </p>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 block">음 높이</label>
                        <div className="grid grid-cols-4 gap-1">
                          {ALL_PITCHES.map((p) => {
                            const noteName = p.replace(/[0-9]/g, '')
                            const solfegeMap: Record<string,string> = {C:'도',D:'레',E:'미',F:'파',G:'솔',A:'라',B:'시'}
                            return (
                              <button
                                key={p}
                                onClick={() => setEditPitch(p)}
                                className={`py-1 rounded-lg text-xs font-bold border transition-all
                                  ${editPitch === p
                                    ? 'border-blue-500 bg-blue-100 text-blue-700'
                                    : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                  }`}
                              >
                                {solfegeMap[noteName]}{p.slice(-1)}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700 block">음표 길이</label>
                        <div className="grid grid-cols-2 gap-1">
                          {DURATION_OPTIONS.map((d) => (
                            <button
                              key={d.value}
                              onClick={() => setEditDuration(d.value)}
                              className={`py-1.5 rounded-lg text-xs font-bold border transition-all
                                ${editDuration === d.value
                                  ? 'border-blue-500 bg-blue-100 text-blue-700'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-600'
                                }`}
                            >
                              {d.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveNote}
                          disabled={saving}
                          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl disabled:opacity-50"
                        >
                          {saving ? '저장 중...' : '저장'}
                        </button>
                        <button
                          onClick={() => setSelectedNote(null)}
                          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl"
                        >
                          취소
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 재생 컨트롤 */}
              <PlaybackControls score={score} onNoteChange={setCurrentNoteIndex} />

              {/* 색깔 안내 */}
              <div className="bg-white rounded-2xl p-5 border">
                <h2 className="text-lg font-bold text-gray-800 mb-3">색깔 안내</h2>
                <div className="space-y-1.5">
                  {(Object.entries(COLOR_MAP) as [string, { color: string; solfege: string }][]).map(([deg, info]) => (
                    <div key={deg} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: info.color }}>
                        {deg}
                      </div>
                      <span className="font-bold text-gray-700">{info.solfege}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 오른쪽: 색깔악보 */}
            <div className="xl:col-span-2">
              <div className="bg-white rounded-2xl p-6 border">
                <div className="mb-4 text-center">
                  <h2 className="text-2xl font-bold text-gray-800">{score.title}</h2>
                  <p className="text-gray-500 mt-1">
                    {score.key}장조 · {score.bpm} BPM
                    {editMode && <span className="ml-2 text-yellow-600 font-bold">✏️ 수정 모드 — 음표를 클릭하세요</span>}
                  </p>
                </div>

                <div className="space-y-3">
                  {Array.from({ length: Math.ceil(score.notes.length / NOTES_PER_ROW) }, (_, rowIdx) => {
                    const rowNotes = score.notes.slice(rowIdx * NOTES_PER_ROW, (rowIdx + 1) * NOTES_PER_ROW)
                    return (
                      <div key={rowIdx} className="flex items-center gap-2 bg-gray-50 p-3 rounded-2xl">
                        <span className="text-gray-400 text-xs w-5 text-center">{rowIdx + 1}</span>
                        <div className="flex flex-wrap gap-2 flex-1">
                          {rowNotes.map((note) => {
                            const isActive = note.id === currentNoteIndex
                            const isSelected = selectedNote?.id === note.id
                            return (
                              <button
                                key={note.id}
                                onClick={() => editMode ? handleNoteClick(note.id) : setCurrentNoteIndex(note.id)}
                                className={`relative flex flex-col items-center justify-center rounded-2xl font-bold select-none transition-all duration-150
                                  ${note.duration <= 0.25 ? 'w-14 h-14' : note.duration <= 0.5 ? 'w-16 h-16' : 'w-20 h-20'}
                                  ${isActive ? 'scale-110 ring-4 ring-yellow-400 shadow-xl' : ''}
                                  ${isSelected ? 'ring-4 ring-blue-400 scale-110' : ''}
                                  ${editMode ? 'hover:opacity-80 cursor-pointer' : 'hover:scale-105'}
                                  shadow-md
                                `}
                                style={{
                                  backgroundColor: note.color,
                                  boxShadow: isActive ? `0 0 20px ${note.color}80` : undefined,
                                }}
                                aria-label={`${note.solfege} (${note.pitch})`}
                              >
                                <span className="text-white text-lg font-black drop-shadow">{note.degree}</span>
                                <span className="text-white text-xs drop-shadow">{note.solfege}</span>
                                {isActive && (
                                  <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-yellow-400 rounded-full animate-ping" />
                                )}
                                {isSelected && (
                                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-blue-400 rounded-full" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
