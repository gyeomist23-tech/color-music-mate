'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ColorScore } from '@/lib/color-mapping'

type SynthType = 'piano' | 'marimba' | 'organ' | 'bell'

const SYNTH_CONFIGS: Record<SynthType, { label: string; emoji: string; options: object }> = {
  piano: {
    label: '피아노',
    emoji: '🎹',
    options: {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 },
    },
  },
  marimba: {
    label: '마림바',
    emoji: '🪘',
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.005, decay: 0.4, sustain: 0.1, release: 0.6 },
    },
  },
  organ: {
    label: '오르간',
    emoji: '🎺',
    options: {
      oscillator: { type: 'square' },
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3 },
    },
  },
  bell: {
    label: '벨',
    emoji: '🔔',
    options: {
      oscillator: { type: 'sine' },
      envelope: { attack: 0.001, decay: 1.2, sustain: 0.0, release: 0.5 },
    },
  },
}

interface PlaybackControlsProps {
  score: ColorScore
  onNoteChange: (index: number) => void
}

export function PlaybackControls({ score, onNoteChange }: PlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(score.bpm)
  const [currentIndex, setCurrentIndex] = useState(-1)
  const [loopStart, setLoopStart] = useState(0)
  const [loopEnd, setLoopEnd] = useState(score.notes.length - 1)
  const [isLooping, setIsLooping] = useState(false)
  const [synthType, setSynthType] = useState<SynthType>('piano')
  const [toneLoaded, setToneLoaded] = useState(false)
  const toneRef = useRef<typeof import('tone') | null>(null)
  const synthRef = useRef<unknown>(null)

  useEffect(() => {
    let cancelled = false
    import('tone').then((Tone) => {
      if (!cancelled) {
        toneRef.current = Tone
        setToneLoaded(true)
      }
    })
    return () => { cancelled = true }
  }, [])

  const stopPlayback = useCallback(() => {
    if (toneRef.current) {
      toneRef.current.getTransport().stop()
      toneRef.current.getTransport().cancel()
    }
    if (synthRef.current) {
      const s = synthRef.current as { dispose?: () => void }
      s.dispose?.()
      synthRef.current = null
    }
    setIsPlaying(false)
    setCurrentIndex(-1)
    onNoteChange(-1)
  }, [onNoteChange])

  const startPlayback = useCallback(async () => {
    if (!toneLoaded || !toneRef.current) return
    const Tone = toneRef.current

    await Tone.start()
    Tone.getTransport().stop()
    Tone.getTransport().cancel()
    Tone.getTransport().bpm.value = bpm

    const config = SYNTH_CONFIGS[synthType]
    const synth = new Tone.PolySynth(Tone.Synth, config.options as ConstructorParameters<typeof Tone.Synth>[0]).toDestination()
    synthRef.current = synth

    const startIdx = isLooping ? loopStart : 0
    const endIdx = isLooping ? loopEnd : score.notes.length - 1
    const notesToPlay = score.notes.slice(startIdx, endIdx + 1)

    let time = 0
    for (let i = 0; i < notesToPlay.length; i++) {
      const note = notesToPlay[i]
      const durationSec = (60 / bpm) * (note.duration * 4)
      const capturedTime = time
      const capturedIndex = startIdx + i

      Tone.getTransport().schedule((t) => {
        synth.triggerAttackRelease(note.pitch, durationSec * 0.9, t)
        Tone.getDraw().schedule(() => {
          setCurrentIndex(capturedIndex)
          onNoteChange(capturedIndex)
        }, t)
      }, capturedTime)

      time += durationSec
    }

    Tone.getTransport().schedule((t) => {
      Tone.getDraw().schedule(() => stopPlayback(), t)
    }, time + 0.1)

    Tone.getTransport().start()
    setIsPlaying(true)
  }, [toneLoaded, bpm, synthType, score.notes, isLooping, loopStart, loopEnd, onNoteChange, stopPlayback])

  useEffect(() => { return () => { stopPlayback() } }, [stopPlayback])

  // 악보 바뀌면 재생 멈춤
  useEffect(() => { stopPlayback() }, [score.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-white rounded-3xl border p-6 space-y-5">
      <h3 className="text-2xl font-bold text-gray-800 text-center">🎹 재생 컨트롤</h3>

      {/* 소리 스타일 */}
      <div>
        <p className="text-sm font-bold text-gray-600 mb-2">소리 스타일</p>
        <div className="grid grid-cols-4 gap-2">
          {(Object.entries(SYNTH_CONFIGS) as [SynthType, typeof SYNTH_CONFIGS[SynthType]][]).map(([key, cfg]) => (
            <button
              key={key}
              onClick={() => { if (!isPlaying) setSynthType(key) }}
              disabled={isPlaying}
              className={`py-2 px-1 rounded-xl text-center transition-all text-sm font-bold border-2
                ${synthType === key
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300'
                }
                ${isPlaying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="text-xl">{cfg.emoji}</div>
              <div>{cfg.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 재생 버튼 */}
      <div className="flex justify-center">
        <button
          onClick={isPlaying ? stopPlayback : startPlayback}
          disabled={!toneLoaded}
          className={`w-24 h-24 rounded-full text-5xl font-bold transition-all shadow-lg active:scale-95
            ${isPlaying ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}
            ${!toneLoaded ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          aria-label={isPlaying ? '정지' : '재생'}
        >
          {isPlaying ? '⏹' : '▶'}
        </button>
      </div>

      {/* BPM */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-lg font-bold text-gray-700">빠르기</label>
          <span className="text-2xl font-black text-blue-600">{bpm} BPM</span>
        </div>
        <input
          type="range" min={40} max={200} value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-full h-4 accent-blue-500 cursor-pointer"
          disabled={isPlaying}
        />
        <div className="flex justify-between text-sm text-gray-400">
          <span>느리게 (40)</span><span>빠르게 (200)</span>
        </div>
        <div className="flex gap-2 justify-center">
          {[50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => setBpm(Math.round(score.bpm * pct / 100))}
              disabled={isPlaying}
              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-sm font-bold text-gray-600 disabled:opacity-50"
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>

      {/* 구간 반복 */}
      <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox" checked={isLooping}
            onChange={(e) => setIsLooping(e.target.checked)}
            className="w-6 h-6 accent-purple-500"
          />
          <span className="text-lg font-bold text-gray-700">구간 반복</span>
        </label>
        {isLooping && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-bold text-gray-600 block mb-1">시작: {loopStart + 1}번</label>
              <input type="range" min={0} max={score.notes.length - 2} value={loopStart}
                onChange={(e) => setLoopStart(Math.min(Number(e.target.value), loopEnd - 1))}
                className="w-full accent-purple-500"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-600 block mb-1">끝: {loopEnd + 1}번</label>
              <input type="range" min={1} max={score.notes.length - 1} value={loopEnd}
                onChange={(e) => setLoopEnd(Math.max(Number(e.target.value), loopStart + 1))}
                className="w-full accent-purple-500"
              />
            </div>
          </div>
        )}
      </div>

      {!toneLoaded && <p className="text-center text-gray-400 text-sm">음원 엔진 로딩 중...</p>}
    </div>
  )
}
