'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ColorScore } from '@/lib/color-mapping'

type SynthType = 'piano' | 'marimba' | 'organ' | 'bell'

const SYNTH_CONFIGS: Record<SynthType, { label: string; emoji: string; options: object }> = {
  piano: {
    label: '피아노', emoji: '🎹',
    options: { oscillator: { type: 'triangle' }, envelope: { attack: 0.02, decay: 0.3, sustain: 0.4, release: 0.8 } },
  },
  marimba: {
    label: '마림바', emoji: '🪘',
    options: { oscillator: { type: 'sine' }, envelope: { attack: 0.005, decay: 0.4, sustain: 0.1, release: 0.6 } },
  },
  organ: {
    label: '오르간', emoji: '🎺',
    options: { oscillator: { type: 'square' }, envelope: { attack: 0.05, decay: 0.1, sustain: 0.8, release: 0.3 } },
  },
  bell: {
    label: '벨', emoji: '🔔',
    options: { oscillator: { type: 'sine' }, envelope: { attack: 0.001, decay: 1.2, sustain: 0.0, release: 0.5 } },
  },
}

interface PlaybackControlsProps {
  score: ColorScore
  onNoteChange: (index: number) => void
}

export function PlaybackControls({ score, onNoteChange }: PlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [bpm, setBpm] = useState(score.bpm)
  const [synthType, setSynthType] = useState<SynthType>('piano')
  const [toneLoaded, setToneLoaded] = useState(false)
  const toneRef = useRef<typeof import('tone') | null>(null)
  const synthRef = useRef<unknown>(null)

  useEffect(() => {
    let cancelled = false
    import('tone').then((Tone) => {
      if (!cancelled) { toneRef.current = Tone; setToneLoaded(true) }
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

    let time = 0
    for (let i = 0; i < score.notes.length; i++) {
      const note = score.notes[i]
      const durationSec = (60 / bpm) * (note.duration * 4)
      const idx = i
      Tone.getTransport().schedule((t) => {
        synth.triggerAttackRelease(note.pitch, durationSec * 0.9, t)
        Tone.getDraw().schedule(() => { onNoteChange(idx) }, t)
      }, time)
      time += durationSec
    }
    Tone.getTransport().schedule((t) => {
      Tone.getDraw().schedule(() => stopPlayback(), t)
    }, time + 0.1)

    Tone.getTransport().start()
    setIsPlaying(true)
  }, [toneLoaded, bpm, synthType, score.notes, onNoteChange, stopPlayback])

  useEffect(() => { return () => { stopPlayback() } }, [stopPlayback])
  useEffect(() => { stopPlayback() }, [score.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-wrap items-center justify-center gap-4">
      {/* 소리 스타일 */}
      <div className="flex gap-1">
        {(Object.entries(SYNTH_CONFIGS) as [SynthType, typeof SYNTH_CONFIGS[SynthType]][]).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => { if (!isPlaying) setSynthType(key) }}
            disabled={isPlaying}
            className={`px-3 py-2 rounded-xl text-sm font-bold border-2 transition-all
              ${synthType === key ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'}
              ${isPlaying ? 'opacity-50' : ''}
            `}
          >
            {cfg.emoji} {cfg.label}
          </button>
        ))}
      </div>

      {/* 재생/정지 */}
      <button
        onClick={isPlaying ? stopPlayback : startPlayback}
        disabled={!toneLoaded}
        className={`w-14 h-14 rounded-full text-2xl font-bold shadow-lg transition-all active:scale-95
          ${isPlaying ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}
          ${!toneLoaded ? 'opacity-50' : ''}
        `}
      >
        {isPlaying ? '⏹' : '▶'}
      </button>

      {/* BPM */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-500">♩=</span>
        <input
          type="range" min={40} max={200} value={bpm}
          onChange={(e) => setBpm(Number(e.target.value))}
          className="w-28 h-3 accent-blue-500"
          disabled={isPlaying}
        />
        <span className="text-lg font-black text-blue-600 w-12">{bpm}</span>
        <div className="flex gap-1">
          {[50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => setBpm(Math.round(score.bpm * pct / 100))}
              disabled={isPlaying}
              className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-500 disabled:opacity-50"
            >
              {pct}%
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
