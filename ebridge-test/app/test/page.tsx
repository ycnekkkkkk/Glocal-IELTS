'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { CandidateInfo, UploadStatus } from '@/lib/types'

const PARTS = [
  {
    id: 1,
    title: 'Self Introduction',
    duration: 60,
    type: 'speaking' as const,
    icon: '🎤',
    color: 'indigo',
    question:
      'Please introduce yourself to the participants of the E-Bridge program.',
    bullets: [
      'Your name and city',
      'Your background (student, professional, entrepreneur)',
      'Why you joined E-Bridge',
      'What you want to learn from Vietnamese and Mongolian participants',
    ],
    tips: 'Speak continuously and confidently. Time: 1 minute.',
  },
  {
    id: 2,
    title: 'Cultural Sharing',
    duration: 90,
    type: 'speaking' as const,
    icon: '🌏',
    color: 'blue',
    question:
      'If you meet a participant from Mongolia/Vietnam for the first time, what cultural experience from your country would you like to introduce? Explain why it represents your culture.',
    bullets: ['Traditional food', 'Festivals', 'Lifestyle', 'Hospitality'],
    tips: 'Describe in detail and explain why it represents your culture. Time: 1 minute 30 seconds.',
  },
  {
    id: 3,
    title: 'Intercultural Discussion',
    duration: 90,
    type: 'speaking' as const,
    icon: '💬',
    color: 'violet',
    question:
      'What cultural differences might Vietnamese and Mongolian people notice when they interact for the first time? How can people respect and understand these differences?',
    bullets: [
      'Communication style',
      'Social values',
      'Traditions',
      'Daily lifestyle',
    ],
    tips: 'Analyze differences and suggest ways to respect them. Time: 1 minute 30 seconds.',
  },
  {
    id: 4,
    title: 'Leadership Scenario',
    duration: 90,
    type: 'speaking' as const,
    icon: '🏆',
    color: 'amber',
    question:
      'Imagine you are working in a Vietnam-Mongolia team during the E-Bridge program. Your team must organize a cultural activity. What would you do to communicate effectively and make your team successful?',
    bullets: [],
    tips: 'Propose specific steps and demonstrate leadership skills. Time: 1 minute 30 seconds.',
  },
  {
    id: 5,
    title: 'Writing Reflection',
    duration: 480,
    type: 'writing' as const,
    icon: '✍️',
    color: 'emerald',
    question:
      'Why are international exchange programs like E-Bridge important for young people? Write about cultural understanding and leadership development.',
    bullets: ['120–150 words', 'Paragraph structure: Introduction, Body, Conclusion'],
    tips: 'Write 120 to 150 words. Time: 8 minutes.',
  },
]

type Phase =
  | 'loading'
  | 'init-error'
  | 'welcome'
  | 'ready'
  | 'recording'
  | 'done'
  | 'grading'
  | 'submitting'

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
  ]
  return types.find(t => MediaRecorder.isTypeSupported(t)) ?? ''
}

function getFileExtension(mimeType: string): string {
  if (mimeType.includes('webm')) return 'webm'
  if (mimeType.includes('ogg')) return 'ogg'
  if (mimeType.includes('mp4') || mimeType.includes('aac')) return 'mp4'
  return 'webm'
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function CircleTimer({ timeLeft, total }: { timeLeft: number; total: number }) {
  const radius = 54
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? timeLeft / total : 1
  const offset = circumference * (1 - progress)

  const color =
    progress > 0.5 ? '#4f46e5' : progress > 0.25 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center w-36 h-36 mx-auto">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144">
        <circle cx="72" cy="72" r={radius} fill="none" stroke="#e0e7ff" strokeWidth="8" />
        <circle
          cx="72"
          cy="72"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
        />
      </svg>
      <span className="text-3xl font-bold" style={{ color }}>
        {formatTime(timeLeft)}
      </span>
    </div>
  )
}

function ProgressSteps({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-1 sm:gap-2 mb-4 sm:mb-6">
      {PARTS.map((p, i) => (
        <div key={p.id} className="flex items-center gap-1 sm:gap-2">
          <div
            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold transition-all duration-300 ${i < current
              ? 'bg-indigo-600 text-white'
              : i === current
                ? 'bg-indigo-600 text-white ring-2 sm:ring-4 ring-indigo-200'
                : 'bg-gray-200 text-gray-400'
              }`}
          >
            {i < current ? '✓' : p.id}
          </div>
          {i < PARTS.length - 1 && (
            <div
              className={`h-1 w-5 sm:w-8 rounded-full transition-all duration-300 ${i < current ? 'bg-indigo-600' : 'bg-gray-200'
                }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function TestPage() {
  const router = useRouter()
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null)
  const [partIndex, setPartIndex] = useState(0)
  const [phase, setPhase] = useState<Phase>('loading')
  const [timeLeft, setTimeLeft] = useState(0)
  const [folderId, setFolderId] = useState<string | null>(null)
  const [uploadStatus, setUploadStatus] = useState<Record<number, UploadStatus>>({})
  const [writingText, setWritingText] = useState('')
  const [wordCount, setWordCount] = useState(0)
  const [isRecording, setIsRecording] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const writingRef = useRef('')
  const folderIdRef = useRef<string | null>(null)
  const initCalledRef = useRef(false)
  const audioBlobsRef = useRef<Record<number, Blob>>({})

  const part = PARTS[partIndex]

  useEffect(() => {
    writingRef.current = writingText
    setWordCount(writingText.trim() === '' ? 0 : writingText.trim().split(/\s+/).length)
  }, [writingText])

  useEffect(() => {
    folderIdRef.current = folderId
  }, [folderId])

  useEffect(() => {
    if (initCalledRef.current) return
    initCalledRef.current = true

    const raw = localStorage.getItem('candidateInfo')
    if (!raw) { router.push('/'); return }
    const info: CandidateInfo = JSON.parse(raw)
    setCandidate(info)

    fetch('/api/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidateInfo: info }),
    })
      .then(r => r.json())
      .then(d => {
        if (d.folderId) { setFolderId(d.folderId); setPhase('welcome') }
        else setPhase('init-error')
      })
      .catch(() => setPhase('init-error'))
  }, [router])

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
  }, [])

  const uploadAudio = useCallback(async (blob: Blob, pid: number, fid: string, ext = 'webm') => {
    setUploadStatus(prev => ({ ...prev, [pid]: 'uploading' }))
    try {
      const fd = new FormData()
      fd.append('folderId', fid)
      fd.append('partId', String(pid))
      fd.append('type', 'audio')
      fd.append('file', blob, `part${pid}.${ext}`)
      await fetch('/api/upload-part', { method: 'POST', body: fd })
      setUploadStatus(prev => ({ ...prev, [pid]: 'done' }))
    } catch {
      setUploadStatus(prev => ({ ...prev, [pid]: 'error' }))
    }
  }, [])

  const uploadWriting = useCallback(async (text: string, fid: string) => {
    setUploadStatus(prev => ({ ...prev, 5: 'uploading' }))
    try {
      const fd = new FormData()
      fd.append('folderId', fid)
      fd.append('partId', '5')
      fd.append('type', 'writing')
      fd.append('text', text)
      await fetch('/api/upload-part', { method: 'POST', body: fd })
      setUploadStatus(prev => ({ ...prev, 5: 'done' }))
    } catch {
      setUploadStatus(prev => ({ ...prev, 5: 'error' }))
    }
  }, [])

  const startSpeakingTimer = useCallback((duration: number, onEnd: () => void) => {
    setTimeLeft(duration)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearTimer(); onEnd(); return 0 }
        return prev - 1
      })
    }, 1000)
  }, [clearTimer])

  const stopRecording = useCallback(() => {
    clearTimer()
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    setPhase('done')
  }, [clearTimer])

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const mr = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const actualMime = mr.mimeType || mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: actualMime })
        audioBlobsRef.current[part.id] = blob
        stream.getTracks().forEach(t => t.stop())
        const fid = folderIdRef.current
        if (fid) uploadAudio(blob, part.id, fid, getFileExtension(actualMime))
      }

      mediaRecorderRef.current = mr
      mr.start(500)
      setIsRecording(true)
      setPhase('recording')
      startSpeakingTimer(part.duration, stopRecording)
    } catch {
      alert('Cannot access microphone. Please allow microphone permission in your browser.')
    }
  }, [part.id, part.duration, uploadAudio, startSpeakingTimer, stopRecording])

  const startWriting = useCallback(() => {
    setPhase('recording')
    setTimeLeft(part.duration)
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearTimer()
          setPhase('done')
          const fid = folderIdRef.current
          if (fid) uploadWriting(writingRef.current, fid)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [part.duration, clearTimer, uploadWriting])

  const handleFinishWriting = useCallback(() => {
    clearTimer()
    setPhase('done')
    const fid = folderIdRef.current
    if (fid) uploadWriting(writingRef.current, fid)
  }, [clearTimer, uploadWriting])

  const submitToQueue = useCallback(async () => {
    try {
      const candidateInfo = JSON.parse(localStorage.getItem('candidateInfo') || '{}')
      await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateInfo,
          writing: writingRef.current,
          folderId: folderIdRef.current || '',
        }),
      })
    } catch (e) {
      console.error('Submit error:', e)
    }
    router.push('/done')
  }, [router])

  const handleNext = useCallback(() => {
    clearTimer()
    setIsRecording(false)
    setTimeLeft(0)
    if (partIndex < PARTS.length - 1) {
      setPartIndex(prev => prev + 1)
      setPhase('ready')
    } else {
      // Last part done — save to queue, AI will grade later
      setPhase('grading')
      submitToQueue()
    }
  }, [partIndex, clearTimer, submitToQueue])

  const allDone = Object.keys(uploadStatus).length === PARTS.length &&
    Object.values(uploadStatus).every(s => s === 'done')

  // ── SCREENS ──────────────────────────────────────────────────────────────

  if (phase === 'loading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
        <p className="text-indigo-600 font-medium">Initializing test...</p>
      </div>
    )
  }

  if (phase === 'init-error') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <div className="text-5xl">⚠️</div>
        <h2 className="text-xl font-bold text-red-600">Connection Failed</h2>
        <p className="text-gray-600 text-center max-w-md">
          Unable to initialize the test. Please check your internet connection and try again.
        </p>
        <button
          onClick={() => router.push('/')}
          className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition"
        >
          Go Back
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-indigo-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 min-w-0">
              <img src="/logo-glocal-ielts.png" alt="Glocal IELTS" className="h-8 sm:h-9 w-auto object-contain shrink-0" />
              <img src="/logo-ag.png" alt="Amazing Group" className="h-11 sm:h-12 w-auto object-contain shrink-0" />
            </div>
            <span className="font-bold text-indigo-900 text-xs sm:text-sm leading-tight truncate">Glocal IELTS E-Bridge Test</span>
          </div>
          {candidate && (
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-gray-700 truncate max-w-[120px] sm:max-w-none">{candidate.fullName}</p>
              <p className="text-xs text-gray-400">{candidate.phone}</p>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-6">

        {/* Welcome screen */}
        {phase === 'welcome' && (
          <div className="fade-in text-center">
            <ProgressSteps current={-1} />
            <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-5 sm:p-8 max-w-xl mx-auto">
              <div className="text-5xl sm:text-6xl mb-3 sm:mb-4">👋</div>
              <h2 className="text-xl sm:text-2xl font-bold text-indigo-900 mb-2">
                Hello {candidate?.fullName?.split(' ').pop()}!
              </h2>
              <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
                You are about to start the E-Bridge test. The test includes <strong>4 speaking parts</strong> and <strong>1 writing part</strong>.
              </p>
              <div className="text-left bg-indigo-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 space-y-2 text-xs sm:text-sm text-gray-700">
                <p className="font-semibold text-indigo-800 mb-1.5 sm:mb-2">Important notes:</p>
                <p>🎤 Allow <strong>microphone</strong> access when prompted by your browser.</p>
                <p>🔇 Sit in a <strong>quiet</strong> place, away from background noise.</p>
                <p>⏱️ Recording will <strong>stop automatically</strong> when time is up – no need to press any button.</p>
                <p>📶 Ensure a stable <strong>internet connection</strong> throughout the test.</p>
              </div>
              <button
                onClick={() => { setPartIndex(0); setPhase('ready') }}
                className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-base sm:text-lg py-3.5 sm:py-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Start Test →
              </button>
            </div>
          </div>
        )}

        {/* Ready screen */}
        {phase === 'ready' && (
          <div className="fade-in">
            <ProgressSteps current={partIndex} />
            <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-3xl shrink-0">{part.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-indigo-200 text-xs font-medium">Part {part.id} / {PARTS.length}</p>
                    <h2 className="text-white font-bold text-sm sm:text-xl leading-tight truncate">{part.title}</h2>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                <div className="bg-gray-50 rounded-xl p-4 sm:p-5 mb-4 sm:mb-5">
                  <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-2 sm:mb-3">Question</p>
                  <p className="text-gray-800 font-medium leading-relaxed text-sm sm:text-lg">{part.question}</p>
                  {part.bullets.length > 0 && (
                    <ul className="mt-3 sm:mt-4 space-y-1.5">
                      {part.bullets.map(b => (
                        <li key={b} className="flex items-start gap-2 text-gray-600 text-xs sm:text-sm">
                          <span className="text-indigo-400 mt-0.5 shrink-0">•</span>
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3 sm:px-4 py-3 mb-4 sm:mb-6">
                  <span className="text-amber-500 shrink-0">💡</span>
                  <p className="text-xs sm:text-sm text-amber-800">{part.tips}</p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm text-gray-500 mb-4">
                  <span>⏱️ Time: <strong className="text-indigo-700">{formatTime(part.duration)}</strong></span>
                  <span>{part.type === 'speaking' ? '🎙️ Speaking' : '⌨️ Writing'}</span>
                </div>

                {part.type === 'speaking' ? (
                  <button
                    onClick={startRecording}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold text-base sm:text-lg py-3.5 sm:py-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-3"
                  >
                    <span className="w-4 h-4 bg-white rounded-full animate-pulse" />
                    Start Recording
                  </button>
                ) : (
                  <button
                    onClick={startWriting}
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base sm:text-lg py-3.5 sm:py-4 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-3"
                  >
                    <span>✍️</span>
                    Start Writing
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Recording screen */}
        {phase === 'recording' && (
          <div className="fade-in">
            <ProgressSteps current={partIndex} />
            <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
                <span className="text-xl sm:text-3xl shrink-0">{part.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-indigo-200 text-xs">Part {part.id} / {PARTS.length}</p>
                  <h2 className="text-white font-bold text-sm sm:text-xl leading-tight truncate">{part.title}</h2>
                </div>
                {isRecording && (
                  <div className="ml-auto flex items-center gap-1.5 bg-red-500 text-white text-xs font-bold px-2.5 py-1.5 rounded-full shrink-0">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    REC
                  </div>
                )}
              </div>

              <div className="p-4 sm:p-6">
                {/* Question reminder */}
                <div className="bg-gray-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5">
                  <p className="text-gray-700 text-xs sm:text-sm leading-relaxed">{part.question}</p>
                </div>

                {part.type === 'speaking' ? (
                  <div className="text-center">
                    <CircleTimer timeLeft={timeLeft} total={part.duration} />
                    <p className="text-gray-500 text-sm mt-2 mb-4 sm:mb-6">
                      {isRecording ? 'Recording... Speak naturally' : 'Preparing...'}
                    </p>
                    <button
                      onClick={stopRecording}
                      className="pulse-recording w-full sm:w-auto bg-red-500 hover:bg-red-600 text-white font-bold px-8 py-3.5 sm:py-4 rounded-xl text-base sm:text-lg transition-all duration-200 shadow-lg flex items-center justify-center gap-3 mx-auto"
                    >
                      <span className="w-4 h-4 bg-white rounded-sm shrink-0" />
                      Stop Recording Early
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <CircleTimer timeLeft={timeLeft} total={part.duration} />
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${wordCount < 120 ? 'text-orange-500' : wordCount > 150 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {wordCount}
                        </p>
                        <p className="text-xs text-gray-400">words (120–150)</p>
                      </div>
                    </div>
                    <textarea
                      value={writingText}
                      onChange={e => setWritingText(e.target.value)}
                      placeholder="Start writing your answer here..."
                      className="w-full h-44 sm:h-48 px-3 sm:px-4 py-2.5 sm:py-3 border-2 border-indigo-200 rounded-xl resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-gray-800 leading-relaxed text-sm sm:text-base"
                    />
                    <div className="mt-3 sm:mt-4 flex gap-3">
                      <button
                        onClick={handleFinishWriting}
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm sm:text-base"
                      >
                        ✓ Submit Writing
                      </button>
                    </div>
                    {wordCount > 150 && (
                      <p className="text-red-500 text-xs mt-2 text-center">
                        ⚠️ You have exceeded 150 words ({wordCount} words)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Done screen */}
        {phase === 'done' && (
          <div className="fade-in">
            <ProgressSteps current={partIndex} />
            <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-5 sm:p-8 text-center">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-7 h-7 sm:w-8 sm:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-1.5 sm:mb-2">
                {part.type === 'speaking' ? 'Recording saved!' : 'Writing saved!'}
              </h3>
              <p className="text-sm text-gray-500 mb-2">
                <strong>Part {part.id} – {part.title}</strong> completed.
              </p>

              {/* Upload status indicator */}
              <div className="flex items-center justify-center gap-2 text-xs sm:text-sm mb-4 sm:mb-6">
                {uploadStatus[part.id] === 'uploading' && (
                  <span className="flex items-center gap-1.5 text-blue-600">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Saving results...
                  </span>
                )}
                {uploadStatus[part.id] === 'done' && (
                  <span className="text-green-600">✓ Results saved</span>
                )}
                {uploadStatus[part.id] === 'error' && (
                  <span className="text-red-500">⚠️ Save failed – data is still safe</span>
                )}
                {!uploadStatus[part.id] && (
                  <span className="text-gray-400">Preparing to save results...</span>
                )}
              </div>

              {partIndex < PARTS.length - 1 ? (
                <button
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold py-3.5 sm:py-4 rounded-xl transition-all duration-200 shadow-md flex flex-col items-center leading-tight"
                >
                  <span className="text-xs sm:text-sm text-indigo-200 font-medium">Next →</span>
                  <span className="text-sm sm:text-lg">Part {part.id + 1} – {PARTS[partIndex + 1].title}</span>
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base sm:text-lg py-3.5 sm:py-4 rounded-xl transition-all duration-200 shadow-md"
                >
                  🎉 Complete Test
                </button>
              )}
            </div>
          </div>
        )}
        {/* Grading screen */}
        {phase === 'grading' && (
          <div className="fade-in flex flex-col items-center justify-center py-16 text-center">
            <div className="relative w-28 h-28 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              <div className="absolute inset-3 rounded-full bg-indigo-50 flex items-center justify-center text-4xl">💾</div>
            </div>
            <h3 className="text-2xl font-bold text-indigo-900 mb-2">Saving your test...</h3>
            <p className="text-gray-500 mb-1">Your answers are being saved securely</p>
            <p className="text-xs text-gray-400">Please do not close this page</p>
            <div className="mt-6 flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  )
}
