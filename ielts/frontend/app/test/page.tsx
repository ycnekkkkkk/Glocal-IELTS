'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { apiClient } from '@/lib/api'
import UnifiedSpeaking from '@/components/UnifiedSpeaking'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

function getAudioRate(level: string): number {
  const rateMap: { [key: string]: number } = {
    'beginner': 0.7,
    'elementary': 0.75,
    'intermediate': 0.8,
    'upper_intermediate': 0.85,
    'advanced': 0.9,
  }
  return rateMap[level] || 0.8
}

function ListeningSection({ section, handleAnswerChange, level, answers }: {
  section: any,
  handleAnswerChange: (key: string, value: string) => void,
  level: string,
  answers: any
}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasPlayed, setHasPlayed] = useState(false)
  const isPlayingRef = useRef<boolean>(false)
  const maleVoiceRef = useRef<SpeechSynthesisVoice | null>(null)
  const femaleVoiceRef = useRef<SpeechSynthesisVoice | null>(null)

  // Load voices when component mounts
  useEffect(() => {
    const loadVoices = () => {
      const voices = speechSynthesis.getVoices()
      if (voices.length > 0) {
        console.log('Voices loaded:', voices.length, 'voices available')

        // Cache male voice ONCE
        const maleVoice = voices.find((v: any) =>
          v.name.toLowerCase().includes('david') || // Windows male voice
          v.name.toLowerCase().includes('alex') || // macOS male voice
          v.name.toLowerCase().includes('daniel') || // macOS male voice
          v.name.toLowerCase().includes('tom') || // macOS male voice
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('man')
        ) || voices.find((v: any) => v.lang.startsWith('en') && v.localService) || null

        // Cache female voice ONCE
        const femaleVoice = voices.find((v: any) =>
          v.name.toLowerCase().includes('zira') || // Windows female voice
          v.name.toLowerCase().includes('samantha') || // macOS female voice
          v.name.toLowerCase().includes('karen') || // macOS female voice
          v.name.toLowerCase().includes('susan') || // macOS female voice
          v.name.toLowerCase().includes('victoria') || // macOS female voice
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('woman')
        ) || null

        maleVoiceRef.current = maleVoice
        femaleVoiceRef.current = femaleVoice

        console.log('Cached voices:', {
          male: maleVoice?.name || 'not found',
          female: femaleVoice?.name || 'not found'
        })
      }
    }

    // Voices may not be loaded immediately
    if ('speechSynthesis' in window) {
      loadVoices()
      speechSynthesis.onvoiceschanged = loadVoices
    }
  }, [])

  const playAudio = () => {
    if (!section.audio_transcript || hasPlayed || isPlayingRef.current) {
      console.log('Cannot play audio:', { hasPlayed, isPlaying: isPlayingRef.current })
      return
    }

    if (!('speechSynthesis' in window)) {
      alert('Speech synthesis is not supported in your browser.')
      return
    }

    // Handle both array format (new) and string format (legacy)
    let audioScript: Array<{ speaker: string, text: string }> | string = section.audio_transcript

    // Convert string to array format if needed (backward compatibility)
    if (typeof audioScript === 'string') {
      // Split by sentences and create array format
      const sentences = audioScript.split(/[.!?]+/).filter(s => s.trim().length > 0)
      audioScript = sentences.map((sentence, index) => ({
        speaker: index % 2 === 0 ? 'male' : 'female',
        text: sentence.trim()
      }))
    }

    // Ensure it's an array
    if (!Array.isArray(audioScript) || audioScript.length === 0) {
      console.error('Invalid audio_transcript format:', audioScript)
      alert('Audio data format error. Please regenerate the test.')
      return
    }

    console.log(`Starting audio playback: ${audioScript.length} lines`)

    // Validate audio script format
    const speakers = audioScript.map((l: any) => l?.speaker).filter(Boolean)
    if (speakers.length === 0) {
      alert('Audio data incomplete: No speakers found. Please regenerate the test.')
      return
    }

    // Check if both male and female are present (for dialogue sections)
    if (section.id === 1 || section.id === 3) {
      if (!speakers.includes('female') || !speakers.includes('male')) {
        alert('Audio data incomplete: Dialogue sections must include both male and female speakers. Please regenerate the test.')
        return
      }

      // Check if speakers alternate
      for (let i = 0; i < speakers.length - 1; i++) {
        if (speakers[i] === speakers[i + 1]) {
          alert('Audio data error: Dialogue sections must alternate speakers. Please regenerate the test.')
          return
        }
      }
    }

    // Check minimum length
    if (audioScript.length < 10) {
      alert(`Audio data incomplete: Section must have at least 10 lines. Found only ${audioScript.length}. Please regenerate the test.`)
      return
    }

    // Reset state before playing
    isPlayingRef.current = true
    setIsPlaying(true)

    // Play linearly - ONLY rely on onend callback
    const playLine = (index: number) => {
      // Check if stopped
      if (!isPlayingRef.current) {
        console.log('Playback stopped')
        return
      }

      if (index >= audioScript.length) {
        console.log('All lines played, finishing')
        isPlayingRef.current = false
        setIsPlaying(false)
        setHasPlayed(true)
        return
      }

      const line = audioScript[index]
      if (!line || !line.text) {
        console.error('Invalid line at index:', index, line)
        playLine(index + 1) // Skip invalid line
        return
      }

      console.log(`Playing line ${index + 1}/${audioScript.length} (${line.speaker}):`, line.text.substring(0, 50))

      const utterance = new SpeechSynthesisUtterance(line.text)
      utterance.lang = 'en-US'
      utterance.rate = getAudioRate(level)

      // Use cached voices (NO searching each time)
      if (line.speaker === 'female' && femaleVoiceRef.current) {
        utterance.voice = femaleVoiceRef.current
        console.log(`Using voice: ${femaleVoiceRef.current.name} for female`)
      } else if (line.speaker === 'male' && maleVoiceRef.current) {
        utterance.voice = maleVoiceRef.current
        console.log(`Using voice: ${maleVoiceRef.current.name} for male`)
      } else {
        // Fallback: use pitch adjustment if no voice found
        utterance.pitch = line.speaker === 'female' ? 1.2 : 0.9
        console.log(`No voice cached for ${line.speaker}, using pitch adjustment`)
      }

      utterance.onend = () => {
        if (isPlayingRef.current) {
          // Play next line immediately - NO setTimeout, NO delay
          playLine(index + 1)
        }
      }

      utterance.onerror = (event: any) => {
        const errorType = event?.error || 'unknown'

        // interrupted = symptom of utterance being killed, not a real error
        // Just skip and continue - don't try to "fix" it
        if (errorType === 'interrupted') {
          console.warn(`Line ${index + 1} interrupted, skipping to next`)
        } else {
          console.error('Speech synthesis error:', errorType, event)
        }

        // Skip utterance and continue to next line
        if (isPlayingRef.current) {
          playLine(index + 1)
        }
      }

      // Utterance lives outside React lifecycle - NO setState
      speechSynthesis.speak(utterance)
    }

    // Start playing from line 0
    playLine(0)
  }

  const stopAudio = () => {
    if ('speechSynthesis' in window) {
      // ONLY cancel when user clicks stop
      speechSynthesis.cancel()
      isPlayingRef.current = false
      setIsPlaying(false)
      setHasPlayed(true)
    }
  }

  return (
    <div className="card mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-semibold text-gray-900">{section.title}</h3>
        {section.audio_transcript && (
          <button
            onClick={isPlaying ? stopAudio : playAudio}
            disabled={hasPlayed && !isPlaying}
            className={`px-4 py-2 rounded-lg font-medium transition ${hasPlayed && !isPlaying
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : isPlaying
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
          >
            {isPlaying ? (
              <>
                <span className="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
                Stop
              </>
            ) : hasPlayed ? (
              'Already Played'
            ) : (
              `Listen to Section ${section.id}`
            )}
          </button>
        )}
      </div>
      <p className="text-gray-600 mb-4">{section.instructions}</p>
      {section.audio_transcript && !hasPlayed && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> Click the button above to play the audio. You can only listen once.
          </p>
        </div>
      )}
      <div className="space-y-6">
        {section.questions?.map((q: any) => {
          // Helper function to safely get question text
          const getQuestionText = (question: any): string => {
            if (typeof question === 'string') return question
            if (question && typeof question === 'object') {
              return question.item || question.question || 'Question'
            }
            return 'Question'
          }

          const questionText = getQuestionText(q.question)

          return (
            <div key={q.id} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="font-semibold text-gray-900 mb-3">Question {q.id}: {questionText}</div>
              {q.type === 'multiple_choice' && q.options ? (
                <div className="space-y-2">
                  {q.options.map((opt: string, idx: number) => (
                    <label key={idx} className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                      <input
                        type="radio"
                        name={`listening_s${section.id}_q${q.id}`}
                        value={opt.split('.')[0].trim()}
                        checked={answers[`listening_s${section.id}_q${q.id}`] === opt.split('.')[0].trim()}
                        onChange={(e) => handleAnswerChange(`listening_s${section.id}_q${q.id}`, e.target.value)}
                        className="mr-3 w-4 h-4"
                      />
                      <span className="text-gray-700">{opt}</span>
                    </label>
                  ))}
                </div>
              ) : q.type === 'matching' && Array.isArray(q.items) && Array.isArray(q.options) ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 mb-3 font-medium">{questionText}</p>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    {q.items.map((item: any, itemIdx: number) => {
                      // Handle both string and object formats
                      const itemValue = typeof item === 'string' ? item : (item?.item || item?.text || String(item))
                      const answerKey = `listening_s${section.id}_q${q.id}_${itemValue}`
                      return (
                        <div key={itemIdx} className="flex items-center gap-3 mb-3 last:mb-0">
                          <div className="font-semibold text-gray-700 min-w-[100px]">
                            {itemValue}:
                          </div>
                          <select
                            className="input-field flex-1"
                            value={answers[answerKey] || ''}
                            onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                          >
                            <option value="">-- Choose option --</option>
                            {q.options.map((opt: string, optIdx: number) => {
                              // Extract value from option: "i. Option 1" -> "i", "i) Option" -> "i", "A. Option" -> "A"
                              let value = opt.trim()
                              if (opt.includes('.')) {
                                value = opt.split('.')[0].trim()
                              } else if (opt.includes(')')) {
                                value = opt.split(')')[0].trim()
                              } else if (opt.includes('-')) {
                                value = opt.split('-')[0].trim()
                              } else if (opt.includes(':')) {
                                value = opt.split(':')[0].trim()
                              }
                              // Keep original case - backend will normalize to lowercase for comparison
                              value = value.trim()
                              return (
                                <option key={optIdx} value={value}>{opt}</option>
                              )
                            })}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ) : q.type === 'true_false_not_given' || q.type === 'tf_ng' || q.type === 'true_false' ? (
                <div className="space-y-2">
                  {['True', 'False', 'Not Given'].map((option) => (
                    <label key={option} className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                      <input
                        type="radio"
                        name={`listening_s${section.id}_q${q.id}`}
                        value={option}
                        checked={answers[`listening_s${section.id}_q${q.id}`] === option}
                        onChange={(e) => handleAnswerChange(`listening_s${section.id}_q${q.id}`, e.target.value)}
                        className="mr-3 w-4 h-4"
                      />
                      <span className="font-medium text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
              ) : q.type === 'short_answer' ? (
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your short answer..."
                  value={answers[`listening_s${section.id}_q${q.id}`] || ''}
                  onChange={(e) => handleAnswerChange(`listening_s${section.id}_q${q.id}`, e.target.value)}
                />
              ) : q.type === 'fill_blank' || q.type === 'fill_in_blank' ? (
                <input
                  type="text"
                  className="input-field"
                  placeholder="Fill in the blank..."
                  value={answers[`listening_s${section.id}_q${q.id}`] || ''}
                  onChange={(e) => handleAnswerChange(`listening_s${section.id}_q${q.id}`, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className="input-field"
                  placeholder="Enter your answer..."
                  value={answers[`listening_s${section.id}_q${q.id}`] || ''}
                  onChange={(e) => handleAnswerChange(`listening_s${section.id}_q${q.id}`, e.target.value)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function ChartRenderer({ chartData }: { chartData: any }) {
  if (!chartData || !chartData.type) return null

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  const chartDataArray = chartData.labels?.map((label: string, idx: number) => ({
    name: label,
    value: chartData.data?.[idx] || 0
  })) || []

  if (chartData.type === 'pie' || (chartData.type === 'bar' && chartDataArray.length <= 6)) {
    return (
      <div className="w-full">
        <h4 className="text-lg font-semibold mb-4 text-center text-gray-900">{chartData.title || 'Chart'}</h4>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={chartDataArray}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(props: any) => {
                const name = props.name || ''
                const percent = props.percent || 0
                return `${name}: ${(percent * 100).toFixed(0)}%`
              }}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {chartDataArray.map((entry: any, index: number) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartData.type === 'line') {
    return (
      <div className="w-full">
        <h4 className="text-lg font-semibold mb-4 text-center text-gray-900">{chartData.title || 'Chart'}</h4>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartDataArray}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="w-full">
      <h4 className="text-lg font-semibold mb-4 text-center text-gray-900">{chartData.title || 'Chart'}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={chartDataArray}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="value" fill="#3b82f6" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function TestContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')
  const phaseParam = searchParams.get('phase')

  const [session, setSession] = useState<any>(null)
  const phase = phaseParam ? parseInt(phaseParam) : 1
  const [content, setContent] = useState<any>(null)
  const [answers, setAnswers] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      router.push('/level-selection')
      return
    }

    // Reset submitting state when component mounts or phase changes
    setSubmitting(false)

    const loadSession = async () => {
      try {
        const sessionData = await apiClient.getSession(parseInt(sessionId))
        setSession(sessionData)

        if (phase === 1 && !sessionData.phase1_content) {
          await apiClient.generatePhase(parseInt(sessionId))
          const updated = await apiClient.getSession(parseInt(sessionId))
          setSession(updated)
          setContent(updated.phase1_content)
        } else if (phase === 1 && sessionData.phase1_content) {
          setContent(sessionData.phase1_content)
        } else if (phase === 2 && !sessionData.phase2_content) {
          await apiClient.generatePhase2(parseInt(sessionId))
          const updated = await apiClient.getSession(parseInt(sessionId))
          setSession(updated)
          setContent(updated.phase2_content)
        } else if (phase === 2 && sessionData.phase2_content) {
          setContent(sessionData.phase2_content)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error loading session:', error)
        setLoading(false)
        setSubmitting(false) // Reset submitting on error
      }
    }

    setLoading(true)
    setContent(null)
    setAnswers({})
    loadSession()
  }, [sessionId, phaseParam, router])

  const handleAnswerChange = (key: string, value: string) => {
    setAnswers({ ...answers, [key]: value })
  }

  const countWords = (text: string): number => {
    if (!text || !text.trim()) return 0
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  const getWordCountStatus = (current: number, min: number, max: number): { color: string; message: string } => {
    if (current === 0) {
      return { color: 'text-gray-500', message: 'Not written' }
    }
    if (current < min) {
      return { color: 'text-red-600', message: `Missing ${min - current} words` }
    }
    if (current > max) {
      return { color: 'text-orange-600', message: `Exceeded ${current - max} words` }
    }
    return { color: 'text-green-600', message: 'Met target' }
  }

  const handleSubmit = async () => {
    if (!sessionId || submitting) return // Prevent double submission
    setSubmitting(true)

    try {
      if (phase === 1) {
        await apiClient.submitPhase1(parseInt(sessionId), answers)
        // Reset submitting before navigation to prevent stuck state
        setSubmitting(false)
        router.push(`/test?sessionId=${sessionId}&phase=2`)
      } else {
        await apiClient.submitPhase2(parseInt(sessionId), answers)
        await apiClient.aggregateResults(parseInt(sessionId))
        // Reset submitting before navigation to prevent stuck state
        setSubmitting(false)
        router.push(`/results?sessionId=${sessionId}`)
      }
    } catch (error: any) {
      console.error('Error submitting:', error)
      const errorMessage = error?.response?.data?.detail || error?.message || 'An error occurred. Please try again.'
      alert(errorMessage)
      setSubmitting(false)
    } finally {
      // Safety: Always reset submitting after a timeout to prevent stuck state
      setTimeout(() => {
        setSubmitting(false)
      }, 10000) // Reset after 10 seconds as safety net
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-xl text-gray-600">Creating your test...</div>
          <p className="text-sm text-gray-500 mt-2">Please wait while we generate your personalized test</p>
        </div>
      </div>
    )
  }

  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-xl text-red-600 mb-4">No test content found</div>
          <button onClick={() => router.push('/')} className="btn-primary">Return Home</button>
        </div>
      </div>
    )
  }

  const isListeningSpeaking = session?.selected_phase === 'listening_speaking'
  const isPhase1 = phase === 1
  const showListening = (isListeningSpeaking && isPhase1) || (!isListeningSpeaking && !isPhase1)
  const showSpeaking = (isListeningSpeaking && isPhase1) || (!isListeningSpeaking && !isPhase1)
  const showReading = (!isListeningSpeaking && isPhase1) || (isListeningSpeaking && !isPhase1)
  const showWriting = (!isListeningSpeaking && isPhase1) || (isListeningSpeaking && !isPhase1)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container-custom max-w-5xl">
        {/* Header */}
        <div className="card mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">
                Phase {phase}: {isPhase1 ? (showListening ? 'Listening & Speaking' : 'Reading & Writing') : (showListening ? 'Listening & Speaking' : 'Reading & Writing')}
              </h1>
              <div className="flex items-center space-x-4 text-blue-100 text-sm">
                <span>⏱️ Time: 30 minutes</span>
                {showListening && <span>4 sections, 20 questions</span>}
                {showReading && <span>2 passages, 20 questions</span>}
              </div>
            </div>
            <div className="badge bg-white/20 text-white border-white/30">
              {session?.level?.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Listening Section */}
          {showListening && content.listening && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🎧</span>
                Listening
              </h2>
              {content.listening.sections?.map((section: any) => (
                <ListeningSection
                  key={section.id}
                  section={section}
                  handleAnswerChange={handleAnswerChange}
                  level={session?.level || 'intermediate'}
                  answers={answers}
                />
              ))}
            </div>
          )}

          {/* Reading Section */}
          {showReading && content.reading && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">📖</span>
                Reading
              </h2>
              {content.reading.passages?.map((passage: any) => (
                <div key={passage.id} className="card mb-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-4">{passage.title}</h3>
                  <div className="bg-gray-50 p-6 rounded-lg mb-6 whitespace-pre-wrap text-gray-700 leading-relaxed border border-gray-200">
                    {passage.content}
                  </div>
                  {/* Chart for Passage 1 */}
                  {passage.id === 1 && passage.chart_data && (
                    <div className="mb-6 bg-white border-2 border-blue-200 rounded-lg p-4">
                      <div className="font-semibold text-blue-900 mb-3 flex items-center">
                        <span className="mr-2">📊</span>
                        Visual Data
                      </div>
                      <ChartRenderer chartData={passage.chart_data} />
                    </div>
                  )}
                  <div className="space-y-6">
                    {passage.questions?.map((q: any) => {
                      // Helper function to safely get question text
                      const getQuestionText = (question: any): string => {
                        if (typeof question === 'string') return question
                        if (question && typeof question === 'object') {
                          return question.item || question.question || 'Question'
                        }
                        return 'Question'
                      }

                      const questionText = getQuestionText(q.question)

                      return (
                        <div key={q.id} className="border-b border-gray-200 pb-4 last:border-b-0">
                          <div className="font-semibold text-gray-900 mb-3">Question {q.id}: {questionText}</div>
                          {q.type === 'multiple_choice' && q.options ? (
                            <div className="space-y-2">
                              {q.options.map((opt: string, idx: number) => (
                                <label key={idx} className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                                  <input
                                    type="radio"
                                    name={`reading_p${passage.id}_q${q.id}`}
                                    value={opt.split('.')[0].trim()}
                                    checked={answers[`reading_p${passage.id}_q${q.id}`] === opt.split('.')[0].trim()}
                                    onChange={(e) => handleAnswerChange(`reading_p${passage.id}_q${q.id}`, e.target.value)}
                                    className="mr-3 w-4 h-4"
                                  />
                                  <span className="text-gray-700">{opt}</span>
                                </label>
                              ))}
                            </div>
                          ) : q.type === 'true_false_not_given' || q.type === 'tf_ng' || q.type === 'true_false' ? (
                            <div className="space-y-2">
                              {['True', 'False', 'Not Given'].map((option) => (
                                <label key={option} className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                                  <input
                                    type="radio"
                                    name={`reading_p${passage.id}_q${q.id}`}
                                    value={option}
                                    checked={answers[`reading_p${passage.id}_q${q.id}`] === option}
                                    onChange={(e) => handleAnswerChange(`reading_p${passage.id}_q${q.id}`, e.target.value)}
                                    className="mr-3 w-4 h-4"
                                  />
                                  <span className="font-medium text-gray-700">{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : q.type === 'yes_no_not_given' || q.type === 'yn_ng' ? (
                            <div className="space-y-2">
                              {['Yes', 'No', 'Not Given'].map((option) => (
                                <label key={option} className="flex items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer border border-gray-200">
                                  <input
                                    type="radio"
                                    name={`reading_p${passage.id}_q${q.id}`}
                                    value={option}
                                    checked={answers[`reading_p${passage.id}_q${q.id}`] === option}
                                    onChange={(e) => handleAnswerChange(`reading_p${passage.id}_q${q.id}`, e.target.value)}
                                    className="mr-3 w-4 h-4"
                                  />
                                  <span className="font-medium text-gray-700">{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : q.type === 'matching_headings' && Array.isArray(q.items) && Array.isArray(q.options) ? (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-700 mb-3 font-medium">{questionText}</p>
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                {q.items.map((item: any, itemIdx: number) => {
                                  // Handle both string and object formats
                                  const itemValue = typeof item === 'string' ? item : (item?.item || item?.text || String(item))
                                  const answerKey = `reading_p${passage.id}_q${q.id}_${itemValue}`
                                  return (
                                    <div key={itemIdx} className="flex items-center gap-3 mb-3 last:mb-0">
                                      <div className="font-semibold text-gray-700 min-w-[80px]">
                                        Paragraph {itemValue}:
                                      </div>
                                      <select
                                        className="input-field flex-1"
                                        value={answers[answerKey] || ''}
                                        onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                                      >
                                        <option value="">-- Choose heading --</option>
                                        {q.options.map((opt: string, optIdx: number) => {
                                          const value = opt.includes('.') ? opt.split('.')[0].trim() : opt.trim()
                                          return (
                                            <option key={optIdx} value={value}>{opt}</option>
                                          )
                                        })}
                                      </select>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : q.type === 'matching_information' && Array.isArray(q.items) && Array.isArray(q.options) ? (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-700 mb-3 font-medium">{questionText}</p>
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                {q.items.map((item: any, itemIdx: number) => {
                                  // Handle both string and object formats
                                  const itemValue = typeof item === 'string' ? item : (item?.item || item?.text || String(item))
                                  const answerKey = `reading_p${passage.id}_q${q.id}_${itemValue}`
                                  return (
                                    <div key={itemIdx} className="flex items-center gap-3 mb-3 last:mb-0">
                                      <div className="font-semibold text-gray-700 min-w-[100px]">
                                        {itemValue}:
                                      </div>
                                      <select
                                        className="input-field flex-1"
                                        value={answers[answerKey] || ''}
                                        onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                                      >
                                        <option value="">-- Choose option --</option>
                                        {q.options.map((opt: string, optIdx: number) => {
                                          const value = opt.includes('.') ? opt.split('.')[0].trim() : opt.trim()
                                          return (
                                            <option key={optIdx} value={value}>{opt}</option>
                                          )
                                        })}
                                      </select>
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          ) : q.type === 'classification' && Array.isArray(q.items) && Array.isArray(q.options) ? (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-700 mb-3 font-medium">{questionText}</p>
                              {q.items.length === 0 ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-800 text-sm">
                                  ⚠️ No items to classify. Please check the question data.
                                </div>
                              ) : (
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <p className="text-xs text-gray-600 mb-3 font-medium">Items to classify:</p>
                                  {q.items.map((item: any, itemIdx: number) => {
                                    // Handle both string and object formats
                                    const itemValue = typeof item === 'string' ? item : (item?.item || item?.text || String(item))
                                    // For classification, itemValue might be a label (A, B, C) or full text
                                    // If it's just a label, try to get full text from item object
                                    const itemText = typeof item === 'string'
                                      ? item
                                      : (item?.text || item?.description || item?.item || String(item))
                                    const itemLabel = typeof item === 'object' && item?.label
                                      ? item.label
                                      : (typeof item === 'string' && item.length <= 3 ? item : null)
                                    const answerKey = `reading_p${passage.id}_q${q.id}_${itemValue}`
                                    return (
                                      <div key={itemIdx} className="flex items-center gap-3 mb-3 last:mb-0 bg-white p-3 rounded border border-gray-200">
                                        <div className="flex-1">
                                          {itemLabel && (
                                            <span className="font-semibold text-gray-700 mr-2">{itemLabel}.</span>
                                          )}
                                          <span className="text-gray-700">{itemText}</span>
                                        </div>
                                        <select
                                          className="input-field min-w-[200px] ml-3"
                                          value={answers[answerKey] || ''}
                                          onChange={(e) => handleAnswerChange(answerKey, e.target.value)}
                                        >
                                          <option value="">-- Choose category --</option>
                                          {q.options.map((opt: string, optIdx: number) => {
                                            const value = opt.includes('.') ? opt.split('.')[0].trim() : opt.trim()
                                            return (
                                              <option key={optIdx} value={value}>{opt}</option>
                                            )
                                          })}
                                        </select>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          ) : q.type === 'sentence_completion' ? (
                            <div className="space-y-3">
                              <p className="text-sm text-gray-700 mb-3 font-medium">{q.question}</p>
                              <input
                                type="text"
                                className="input-field"
                                placeholder="Complete the sentence..."
                                value={answers[`reading_p${passage.id}_q${q.id}`] || ''}
                                onChange={(e) => handleAnswerChange(`reading_p${passage.id}_q${q.id}`, e.target.value)}
                              />
                            </div>
                          ) : q.type === 'short_answer' ? (
                            <input
                              type="text"
                              className="input-field"
                              placeholder="Enter your answer..."
                              value={answers[`reading_p${passage.id}_q${q.id}`] || ''}
                              onChange={(e) => handleAnswerChange(`reading_p${passage.id}_q${q.id}`, e.target.value)}
                            />
                          ) : (
                            <input
                              type="text"
                              className="input-field"
                              placeholder="Enter your answer..."
                              value={answers[`reading_p${passage.id}_q${q.id}`] || ''}
                              onChange={(e) => handleAnswerChange(`reading_p${passage.id}_q${q.id}`, e.target.value)}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Speaking Section */}
          {showSpeaking && content.speaking && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">🎤</span>
                Speaking
              </h2>
              <UnifiedSpeaking
                part1={content.speaking.part1}
                part2={content.speaking.part2}
                part3={content.speaking.part3}
                onAnswer={(key, answer) => handleAnswerChange(key, answer)}
                answers={answers}
              />
            </div>
          )}

          {/* Writing Section */}
          {showWriting && content.writing && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center">
                <span className="mr-2">✍️</span>
                Writing
              </h2>

              {/* Task 1 */}
              {content.writing.task1 && (
                <div className="card mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Task 1: Describe Chart/Graph</h3>
                    <span className="badge badge-primary">
                      {content.writing.task1.min_words || 50}-{content.writing.task1.max_words || 80} words
                    </span>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <div className="font-semibold mb-2 text-blue-900">Instructions:</div>
                    <div className="text-blue-800">{content.writing.task1.instructions || "Summarise the information by selecting and reporting the main features, and make comparisons where relevant."}</div>
                  </div>
                  {(content.writing.task1.chart_data || content.writing.task1.chart_description) && (
                    <div className="bg-white border-2 border-blue-200 rounded-lg p-4 mb-4">
                      <div className="font-semibold text-blue-900 mb-3 flex items-center">
                        <span className="mr-2">📊</span>
                        Chart Data
                      </div>
                      {content.writing.task1.chart_data ? (
                        <ChartRenderer chartData={content.writing.task1.chart_data} />
                      ) : (
                        <div className="bg-gray-50 p-4 rounded border border-gray-200">
                          <div className="text-sm text-gray-700 whitespace-pre-wrap">
                            {content.writing.task1.chart_description}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <textarea
                    className="input-field"
                    rows={8}
                    placeholder={`Write ${content.writing.task1.min_words || 50}-${content.writing.task1.max_words || 80} words...`}
                    value={answers.writing_task1 || ''}
                    onChange={(e) => handleAnswerChange('writing_task1', e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm text-gray-600">
                      Target: <span className="font-semibold">{content.writing.task1.min_words || 50}-{content.writing.task1.max_words || 80} words</span>
                    </div>
                    <div className={`text-sm font-semibold ${getWordCountStatus(
                      countWords(answers.writing_task1 || ''),
                      content.writing.task1.min_words || 50,
                      content.writing.task1.max_words || 80
                    ).color}`}>
                      {countWords(answers.writing_task1 || '')} words - {getWordCountStatus(
                        countWords(answers.writing_task1 || ''),
                        content.writing.task1.min_words || 50,
                        content.writing.task1.max_words || 80
                      ).message}
                    </div>
                  </div>
                </div>
              )}

              {/* Task 2 */}
              {content.writing.task2 && (
                <div className="card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-semibold text-gray-900">Task 2: Essay</h3>
                    <span className="badge badge-primary">
                      {content.writing.task2.min_words || 100}-{content.writing.task2.max_words || 120} words
                    </span>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                    <div className="font-semibold mb-2 text-purple-900">Question:</div>
                    <div className="text-purple-800 leading-relaxed">{content.writing.task2.question}</div>
                  </div>
                  <textarea
                    className="input-field"
                    rows={12}
                    placeholder={`Write an essay ${content.writing.task2.min_words || 100}-${content.writing.task2.max_words || 120} words...`}
                    value={answers.writing_task2 || ''}
                    onChange={(e) => handleAnswerChange('writing_task2', e.target.value)}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="text-sm text-gray-600">
                      Target: <span className="font-semibold">{content.writing.task2.min_words || 100}-{content.writing.task2.max_words || 120} words</span>
                    </div>
                    <div className={`text-sm font-semibold ${getWordCountStatus(
                      countWords(answers.writing_task2 || ''),
                      content.writing.task2.min_words || 100,
                      content.writing.task2.max_words || 120
                    ).color}`}>
                      {countWords(answers.writing_task2 || '')} words - {getWordCountStatus(
                        countWords(answers.writing_task2 || ''),
                        content.writing.task2.min_words || 100,
                        content.writing.task2.max_words || 120
                      ).message}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="card bg-gray-900 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold mb-1">Ready to Submit?</h3>
                <p className="text-gray-300 text-sm">
                  {phase === 1 ? 'Submit Phase 1 and continue to Phase 2' : 'Submit Phase 2 and view your results'}
                </p>
              </div>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className={`px-8 py-3 rounded-lg font-semibold transition ${submitting
                  ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                  : 'bg-white text-gray-900 hover:bg-gray-100'
                  }`}
              >
                {submitting ? 'Processing...' : phase === 1 ? 'Submit & Continue →' : 'Submit & View Results →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TestPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-xl text-gray-600">Loading test...</div>
        </div>
      </div>
    }>
      <TestContent />
    </Suspense>
  )
}

