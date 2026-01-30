'use client'

import { useState, useEffect, useRef } from 'react'

interface UnifiedSpeakingProps {
    part1?: Array<{ id: number; question: string; time_limit?: number }>
    part2?: { topic: string; task_card: string; preparation_time?: number; speaking_time?: number }
    part3?: Array<{ id: number; question: string; time_limit?: number }>
    onAnswer: (key: string, answer: string) => void
    answers: { [key: string]: string }
    onComplete?: () => void
}

interface SpeakingItem {
    type: 'part1' | 'part2' | 'part3'
    id: number | string
    question: string
    topic?: string
    task_card?: string
    answerKey: string
    timeLimit?: number
    preparationTime?: number
    speakingTime?: number
}

export default function UnifiedSpeaking({
    part1,
    part2,
    part3,
    onAnswer,
    answers,
    onComplete,
}: UnifiedSpeakingProps) {
    const allQuestions: SpeakingItem[] = []

    if (part1) {
        part1.forEach((q) => {
            allQuestions.push({
                type: 'part1',
                id: q.id,
                question: q.question,
                answerKey: `speaking_part1_${q.id}`,
                timeLimit: q.time_limit || 20,
            })
        })
    }

    if (part2) {
        allQuestions.push({
            type: 'part2',
            id: 'part2',
            question: `${part2.topic}. ${part2.task_card}`,
            topic: part2.topic,
            task_card: part2.task_card,
            answerKey: 'speaking_part2',
            preparationTime: part2.preparation_time || 60,
            speakingTime: part2.speaking_time || 120,
        })
    }

    if (part3) {
        part3.forEach((q) => {
            allQuestions.push({
                type: 'part3',
                id: q.id,
                question: q.question,
                answerKey: `speaking_part3_${q.id}`,
                timeLimit: q.time_limit || 30,
            })
        })
    }

    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [isReadingQuestion, setIsReadingQuestion] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [isSupported, setIsSupported] = useState(false)
    const [transcript, setTranscript] = useState('')
    const [hasStarted, setHasStarted] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string>('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isCompleted, setIsCompleted] = useState(false)
    const [preparationTime, setPreparationTime] = useState<number | null>(null)
    const [recordingTime, setRecordingTime] = useState<number>(0)
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
    const [isPart2Preparation, setIsPart2Preparation] = useState(false)
    const [isPart2Speaking, setIsPart2Speaking] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const recognitionRef = useRef<any>(null)
    const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
    const timeIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const prepIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const recordingActiveRef = useRef<boolean>(false) // Track recording state for interval
    const prepFinishedRef = useRef<boolean>(false) // Track if Part 2 prep has finished (prevent double call)
    const currentQuestion = allQuestions[currentQuestionIndex]

    useEffect(() => {
        const SpeechRecognition =
            (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

        if (SpeechRecognition) {
            setIsSupported(true)
            const recognition = new SpeechRecognition()
            recognition.continuous = true
            recognition.interimResults = true
            recognition.lang = 'en-US'

            recognition.onresult = (event: any) => {
                let interimTranscript = ''
                let finalTranscript = ''

                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript + ' '
                    } else {
                        interimTranscript += transcript
                    }
                }

                const currentTranscript = finalTranscript + interimTranscript
                setTranscript(currentTranscript)
            }

            recognition.onerror = (event: any) => {
                if (event.error === 'no-speech') {
                    // no-speech is normal - user might pause or be quiet
                    // Do NOT break the flow, just log warning
                    console.warn('[Speaking] no-speech detected, continue recording')
                    return
                }

                if (event.error === 'not-allowed') {
                    console.error('[Speaking] Microphone permission denied')
                    setErrorMessage('Microphone permission denied. Please allow microphone access.')
                    stopRecording()
                    return
                }

                // Log other errors but don't break flow
                console.error('[Speaking] Speech recognition error:', event.error)
            }

            recognition.onend = () => {
                console.log('[Speaking] Recognition ended (ignored)')
                // Do NOT touch flow - no stop, no submit, no state change
                // Browser handles interim/final results automatically
            }

            recognitionRef.current = recognition
        }

        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            if (utteranceRef.current) {
                speechSynthesis.cancel()
            }
        }
    }, [])

    useEffect(() => {
        if (currentQuestion) {
            console.log('[Speaking] Question changed, resetting state. Index:', currentQuestionIndex)

            // Only reset transcript from answers when NOT started (not recording)
            if (!hasStarted) {
                const savedAnswer = answers[currentQuestion.answerKey] || ''
                setTranscript(savedAnswer)
            }

            setErrorMessage('')
            setIsSubmitting(false)
            setIsLocked(false)
            setRecordingTime(0)
            setPreparationTime(null)
            setTimeRemaining(null)
            setIsPart2Preparation(false)
            setIsPart2Speaking(false)
            recordingActiveRef.current = false // Reset recording flag
            prepFinishedRef.current = false // Reset prep finished flag

            // Clear intervals
            if (timeIntervalRef.current) {
                console.log('[Speaking] Clearing timeIntervalRef on question change')
                clearInterval(timeIntervalRef.current)
                timeIntervalRef.current = null
            }
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current)
                recordingIntervalRef.current = null
            }
            if (prepIntervalRef.current) {
                clearInterval(prepIntervalRef.current)
                prepIntervalRef.current = null
            }
        }
    }, [currentQuestionIndex]) // ONLY currentQuestionIndex - do NOT include answers or currentQuestion

    // Helper function to start Part 2 preparation (only called once)
    const startPart2Preparation = () => {
        // Reset prep finished flag
        prepFinishedRef.current = false

        setIsPart2Preparation(true)
        setIsPart2Speaking(false)

        const prepTime = currentQuestion?.preparationTime || 60
        console.log('[Speaking][Part 2] Preparation started:', prepTime, 'seconds')
        setPreparationTime(prepTime)

        prepIntervalRef.current = setInterval(() => {
            setPreparationTime((prev) => {
                if (prev === null || prev <= 1) {
                    // 🔒 LOCK: Only execute once
                    if (prepFinishedRef.current) {
                        console.warn('[Speaking][Part 2] Prep finished already - skipping duplicate call')
                        return null
                    }

                    prepFinishedRef.current = true // Set flag immediately
                    console.log('[Speaking][Part 2] Preparation finished → start speaking')

                    // Clear interval FIRST
                    if (prepIntervalRef.current) {
                        clearInterval(prepIntervalRef.current)
                        prepIntervalRef.current = null
                    }

                    // Transition from preparation to speaking
                    setIsPart2Preparation(false)
                    setIsPart2Speaking(true)

                    // 🔥 DUY NHẤT 1 CHỖ GỌI startRecording cho Part 2
                    setTimeout(() => {
                        startRecordingOnce()
                    }, 500)
                    return null
                }
                console.log('[Speaking][Part 2] Prep remaining:', prev - 1)
                return prev - 1
            })
        }, 1000)
    }

    // Wrapper to ensure startRecording is only called once
    const startRecordingOnce = () => {
        if (recordingActiveRef.current) {
            console.warn('[Speaking] startRecordingOnce blocked: already active')
            return
        }
        // Additional check: if recognition is already running, stop it first
        if (recognitionRef.current && (recognitionRef.current as any).state === 'running') {
            console.warn('[Speaking] Recognition already running - stopping first')
            try {
                recognitionRef.current.stop()
            } catch (e) {
                console.warn('[Speaking] Error stopping recognition:', e)
            }
            // Wait a bit before starting again
            setTimeout(() => {
                startRecording()
            }, 100)
            return
        }
        startRecording()
    }

    useEffect(() => {
        if (currentQuestion && hasStarted && 'speechSynthesis' in window) {
            if (isRecording) {
                stopRecording()
            }

            speechSynthesis.cancel()
            setIsReadingQuestion(true)
            const utterance = new SpeechSynthesisUtterance(currentQuestion.question)
            utterance.lang = 'en-US'
            utterance.rate = 0.85
            utterance.pitch = 1.0

            utterance.onend = () => {
                console.log('[Speaking] Question reading finished, type:', currentQuestion.type)
                setIsReadingQuestion(false)

                if (currentQuestion.type === 'part2') {
                    // Part 2: CHỈ PREP - TUYỆT ĐỐI KHÔNG startRecording Ở ĐÂY
                    console.log('[Speaking][Part 2] Starting preparation phase')
                    startPart2Preparation()
                } else {
                    // Part 1 & 3: Start recording
                    console.log('[Speaking] Part 1/3: Starting recording after 500ms delay')
                    setTimeout(() => {
                        startRecordingOnce()
                    }, 500)
                }
            }

            utteranceRef.current = utterance
            speechSynthesis.speak(utterance)
        }

        return () => {
            speechSynthesis.cancel()
        }
    }, [currentQuestionIndex, hasStarted])

    const startRecording = async () => {
        console.log('[Speaking] startRecording() called', {
            questionType: currentQuestion?.type,
            questionIndex: currentQuestionIndex,
            timeLimit: currentQuestion?.timeLimit,
            speakingTime: currentQuestion?.speakingTime,
            isRecording: isRecording,
            recordingActive: recordingActiveRef.current,
            hasRecognition: !!recognitionRef.current
        })

        // Lock: prevent double start
        if (recordingActiveRef.current) {
            console.warn('[Speaking] startRecording blocked: already active')
            return
        }

        if (!recognitionRef.current) {
            console.error('[Speaking] startRecording() FAILED: recognitionRef.current is null')
            setErrorMessage('Speech recognition not available')
            return
        }

        // Fail fast: check if recognition is already running
        if ((recognitionRef.current as any).state === 'running') {
            console.warn('[Speaking] Recognition already running – skip start')
            return
        }

        // Check microphone permission first
        try {
            console.log('[Speaking] Requesting microphone permission...')
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            stream.getTracks().forEach(track => track.stop())
            console.log('[Speaking] Microphone permission granted')
        } catch (err: any) {
            console.error('[Speaking] Microphone permission DENIED:', err)
            setErrorMessage('Microphone permission denied. Please allow microphone access.')
            // Even if permission denied, set countdown so UI shows something
            const timeLimit = currentQuestion?.timeLimit || (currentQuestion?.type === 'part2' ? currentQuestion.speakingTime : 30)
            if (timeLimit) {
                console.log('[Speaking] Setting countdown despite permission error:', timeLimit)
                setTimeRemaining(timeLimit)
            }
            return
        }

        setErrorMessage('')

        try {
            console.log('[Speaking] Starting SpeechRecognition...')
            recognitionRef.current.start()
            console.log('[Speaking] SpeechRecognition started successfully')

            // Only set isRecording AFTER successful start
            console.log('[Speaking] Setting isRecording = true')
            setIsRecording(true)
            recordingActiveRef.current = true // Set ref to track recording state
            setTranscript('')

            const timeLimit = currentQuestion?.timeLimit || (currentQuestion?.type === 'part2' ? currentQuestion.speakingTime : 30)
            console.log('[Speaking] Countdown started:', timeLimit, 'seconds')

            if (timeLimit) {
                console.log('[Speaking] Setting timeRemaining to:', timeLimit)

                // Set timeRemaining first
                setTimeRemaining(timeLimit)

                // Clear any existing interval first
                if (timeIntervalRef.current) {
                    console.log('[Speaking] Clearing existing interval before creating new one')
                    clearInterval(timeIntervalRef.current)
                    timeIntervalRef.current = null
                }

                // Start countdown interval immediately
                // Use closure to capture current state
                console.log('[Speaking] Creating countdown interval immediately...')
                let currentTime = timeLimit

                timeIntervalRef.current = setInterval(() => {
                    // Countdown runs independently - do NOT check recordingActiveRef
                    currentTime--
                    console.log('[Speaking] Countdown interval tick, currentTime:', currentTime)

                    setTimeRemaining(currentTime)

                    if (currentTime <= 0) {
                        console.log('[Speaking] Time remaining reached 0, auto submitting...')
                        if (timeIntervalRef.current) {
                            clearInterval(timeIntervalRef.current)
                            timeIntervalRef.current = null
                        }
                        // Use recordingActiveRef as semaphore - only submit once
                        if (recordingActiveRef.current) {
                            recordingActiveRef.current = false
                            console.log('[Speaking] Auto submit triggered (time up)')
                            autoSubmitAnswer()
                        } else {
                            console.warn('[Speaking] Auto submit skipped - already submitted')
                        }
                    }
                }, 1000)
                console.log('[Speaking] Countdown interval created, ref:', timeIntervalRef.current)
            } else {
                console.warn('[Speaking] No timeLimit found for question')
            }

            setRecordingTime(0)
            recordingIntervalRef.current = setInterval(() => {
                if (isRecording) {
                    setRecordingTime((prev) => prev + 1)
                } else {
                    if (recordingIntervalRef.current) {
                        clearInterval(recordingIntervalRef.current)
                    }
                }
            }, 1000)
        } catch (e: any) {
            console.error('[Speaking] Failed to start SpeechRecognition:', e)
            setErrorMessage(`Failed to start microphone: ${e.message || 'Unknown error'}`)
            setIsRecording(false)
            // Even on error, try to set countdown
            const timeLimit = currentQuestion?.timeLimit || (currentQuestion?.type === 'part2' ? currentQuestion.speakingTime : 30)
            if (timeLimit) {
                console.log('[Speaking] Setting countdown despite error:', timeLimit)
                setTimeRemaining(timeLimit)
            }
        }
    }

    const stopRecording = () => {
        console.log('[Speaking] stopRecording() called')
        recordingActiveRef.current = false // Reset flag to allow future starts (only used to prevent double start)
        if (recognitionRef.current && isRecording) {
            recognitionRef.current.stop()
            setIsRecording(false)

            // Clear recording interval (but NOT countdown - countdown runs independently)
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current)
                recordingIntervalRef.current = null
            }
            // Do NOT clear countdown interval here - countdown runs independently
        }
    }

    // Helper function to move to next question (atomic, no delay)
    const goNextQuestion = () => {
        setCurrentQuestionIndex((prev) => {
            if (prev < allQuestions.length - 1) {
                console.log('[Speaking] Moving to next question')
                return prev + 1
            } else {
                console.log('[Speaking] All questions completed')

                // Clear countdown interval when all questions completed
                if (timeIntervalRef.current) {
                    console.log('[Speaking] Clearing countdown interval - all questions completed')
                    clearInterval(timeIntervalRef.current)
                    timeIntervalRef.current = null
                }

                setIsCompleted(true)
                if (onComplete) {
                    onComplete()
                }
                return prev
            }
        })
    }

    const autoSubmitAnswer = () => {
        // Check semaphore - prevent double submit
        if (recordingActiveRef.current === false && isSubmitting) {
            console.warn('[Speaking] autoSubmitAnswer() blocked: already submitted')
            return
        }

        console.log('[Speaking] Auto submit (time up)', {
            questionIndex: currentQuestionIndex
        })

        recordingActiveRef.current = false // Set semaphore to prevent double call
        stopRecording()

        // Clear countdown interval before submitting
        if (timeIntervalRef.current) {
            console.log('[Speaking] Clearing countdown interval before submit')
            clearInterval(timeIntervalRef.current)
            timeIntervalRef.current = null
        }

        // Save answer (even if empty, to mark as answered)
        if (currentQuestion) {
            console.log('[Speaking] Saving answer for:', currentQuestion.answerKey)
            onAnswer(currentQuestion.answerKey, transcript.trim())
        }

        // IMMEDIATE transition (no delay, no setTimeout)
        goNextQuestion()
    }

    const submitAnswer = () => {
        console.log('[Speaking] Manual submit clicked')
        // Check semaphore - prevent double submit
        if (recordingActiveRef.current === false && isSubmitting) {
            console.warn('[Speaking] Manual submit blocked: already submitted')
            return
        }

        // Clear countdown interval before submitting
        if (timeIntervalRef.current) {
            console.log('[Speaking] Clearing countdown interval before manual submit')
            clearInterval(timeIntervalRef.current)
            timeIntervalRef.current = null
        }

        autoSubmitAnswer()
    }

    const skipQuestion = () => {
        if (isLocked || isSubmitting) return

        stopRecording()
        speechSynthesis.cancel()
        setIsReadingQuestion(false)
        setPreparationTime(null)
        setRecordingTime(0)
        setTimeRemaining(null)
        setIsLocked(true)

        if (currentQuestion) {
            onAnswer(currentQuestion.answerKey, transcript.trim() || '')
        }

        const isLastQuestion = currentQuestionIndex === allQuestions.length - 1
        if (isLastQuestion) {
            setIsCompleted(true)
            if (onComplete) {
                onComplete()
            }
        } else {
            setTimeout(() => {
                setCurrentQuestionIndex(currentQuestionIndex + 1)
            }, 500)
        }
    }

    const startSpeaking = () => {
        setHasStarted(true)
    }

    if (!isSupported) {
        return (
            <div className="card text-center">
                <p className="text-red-600 mb-4">Your browser does not support speech recognition.</p>
                <p className="text-gray-600">Please use Chrome or Edge for the Speaking section.</p>
            </div>
        )
    }

    if (allQuestions.length === 0) {
        return (
            <div className="card text-center">
                <p className="text-gray-600">No speaking questions available</p>
            </div>
        )
    }

    const isLastQuestion = currentQuestionIndex === allQuestions.length - 1

    return (
        <div className="card">
            <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {currentQuestion.type === 'part1' ? 'Part 1: Introduction' :
                            currentQuestion.type === 'part2' ? 'Part 2: Topic Card' :
                                'Part 3: Discussion'}
                    </h3>
                    <span className="badge badge-primary">
                        Question {currentQuestionIndex + 1} of {allQuestions.length}
                    </span>
                </div>
            </div>

            {currentQuestion.type === 'part2' && currentQuestion.topic && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <div className="font-semibold text-lg mb-2 text-blue-900">
                        {currentQuestion.topic}
                    </div>
                    <div className="text-gray-700">{currentQuestion.task_card}</div>
                </div>
            )}

            <div className="bg-gray-50 rounded-lg p-8 mb-6 min-h-[300px] flex items-center justify-center">
                {isCompleted ? (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Speaking Test Completed</h3>
                        <p className="text-gray-600">Your answers have been saved</p>
                    </div>
                ) : !hasStarted ? (
                    <div className="text-center">
                        <p className="text-lg text-gray-700 mb-4">Ready to start the Speaking test?</p>
                        <p className="text-sm text-gray-500 mb-6">Click "Start" to begin. The AI will read the first question.</p>
                        <button onClick={startSpeaking} className="btn-primary">
                            Start Speaking Test
                        </button>
                    </div>
                ) : isReadingQuestion ? (
                    <div className="text-center">
                        <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600">AI is reading the question...</p>
                    </div>
                ) : isPart2Preparation && preparationTime !== null && preparationTime > 0 ? (
                    <div className="text-center">
                        <div className="text-6xl font-bold text-blue-600 mb-4">{preparationTime}s</div>
                        <p className="text-xl font-semibold text-gray-700 mb-2">Preparation Time</p>
                        <p className="text-sm text-gray-600">Prepare your answer. Speaking will start automatically.</p>
                        <div className="w-full max-w-md mx-auto mt-4 bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all"
                                style={{ width: `${((currentQuestion?.preparationTime || 60) - preparationTime) / (currentQuestion?.preparationTime || 60) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                ) : isSubmitting ? (
                    <div className="text-center">
                        <div className="inline-block w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-lg font-semibold text-green-600">Saving your answer...</p>
                    </div>
                ) : isRecording ? (
                    <div className="text-center w-full">
                        <div className="mb-6">
                            {timeRemaining !== null && (
                                <div className="mb-4">
                                    <div className="text-4xl font-bold text-blue-600 mb-2">
                                        {timeRemaining}s
                                        {timeRemaining <= 5 && timeRemaining > 0 && (
                                            <span className="text-red-600 ml-2 animate-pulse">⚠️</span>
                                        )}
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${timeRemaining <= 5 && timeRemaining > 0 ? 'bg-red-600' : 'bg-blue-600'
                                                }`}
                                            style={{
                                                width: `${(timeRemaining / (currentQuestion?.timeLimit || (currentQuestion?.type === 'part2' ? (currentQuestion?.speakingTime || 120) : 30))) * 100}%`
                                            }}
                                        ></div>
                                    </div>
                                    {currentQuestion?.type === 'part2' && isPart2Speaking && (
                                        <p className="text-sm text-gray-600 mt-2">Speaking Time</p>
                                    )}
                                    {(currentQuestion?.type === 'part1' || currentQuestion?.type === 'part3') && (
                                        <p className="text-sm text-gray-600 mt-2">
                                            {currentQuestion?.type === 'part1' ? 'Part 1 Answer Time' : 'Part 3 Answer Time'}
                                        </p>
                                    )}
                                </div>
                            )}
                            <div className="flex items-center justify-center mb-4">
                                <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-2 animate-pulse"></span>
                                <span className="text-lg font-semibold text-red-600">Recording</span>
                            </div>
                            {/* <div className="text-sm text-gray-600 mb-4">
                                Elapsed: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                            </div> */}
                        </div>
                        <div className={`bg-white rounded-lg p-6 min-h-[120px] border border-gray-200 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}>
                            <p className="text-gray-700 text-sm">{transcript || 'Speak now...'}</p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500">
                        <p>Waiting for next question...</p>
                    </div>
                )}
            </div>

            {errorMessage && (
                <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm">{errorMessage}</p>
                </div>
            )}

            <div className="flex gap-3 justify-center">
                {!hasStarted ? null : (
                    <>
                        {isRecording && !isLocked && (
                            <button
                                onClick={submitAnswer}
                                disabled={isSubmitting || isLocked}
                                className={`btn-primary ${isSubmitting || isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                Submit Answer
                            </button>
                        )}
                        <button
                            onClick={skipQuestion}
                            disabled={isSubmitting || isLocked}
                            className={`btn-secondary ${isLastQuestion ? 'text-red-600 border-red-300 hover:bg-red-50' : ''} ${isSubmitting || isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {isLastQuestion ? 'End Test' : 'Skip Question'}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

