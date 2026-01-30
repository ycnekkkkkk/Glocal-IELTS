'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { motion } from 'framer-motion'

const phases = [
  {
    value: 'listening_speaking',
    label: 'Listening & Speaking',
    description: 'Assess your listening comprehension and speaking skills',
    icon: '🎧',
    color: 'bg-blue-50 border-blue-200',
    features: ['4 listening sections (20 questions)', 'Speaking: Part 1, 2, 3', 'Voice recording enabled']
  },
  {
    value: 'reading_writing',
    label: 'Reading & Writing',
    description: 'Evaluate your reading comprehension and writing ability',
    icon: '📚',
    color: 'bg-purple-50 border-purple-200',
    features: ['2 passages (20 questions)', 'Writing Task 1 & Task 2', 'Chart analysis included']
  },
]

function PhaseSelectionContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [selectedPhase, setSelectedPhase] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sessionId) {
      router.push('/level-selection')
    }
  }, [sessionId, router])

  const handleSubmit = async () => {
    if (!selectedPhase || !sessionId) return

    setLoading(true)
    try {
      await apiClient.selectPhase(parseInt(sessionId), { phase: selectedPhase as any })
      router.push(`/test?sessionId=${sessionId}&phase=1`)
    } catch (error) {
      console.error('Error selecting phase:', error)
      alert('An error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (!sessionId) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="section-header">Choose Test Section</h1>
          <p className="section-subtitle">
            Select which section you'd like to complete first. The remaining section will be generated after you finish this one.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {phases.map((phase, index) => (
            <motion.label
              key={phase.value}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.1 * index }}
              whileHover={{ scale: 1.02 }}
              className="block cursor-pointer"
            >
              <input
                type="radio"
                name="phase"
                value={phase.value}
                checked={selectedPhase === phase.value}
                onChange={(e) => setSelectedPhase(e.target.value)}
                className="sr-only"
              />
              <div className={`card border-2 h-full transition-all ${
                selectedPhase === phase.value
                  ? `${phase.color} border-blue-600 shadow-lg ring-2 ring-blue-200`
                  : `${phase.color} hover:shadow-md`
              }`}>
                <div className="text-center mb-6">
                  <div className="text-5xl mb-4">{phase.icon}</div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{phase.label}</h3>
                  <p className="text-gray-600">{phase.description}</p>
                </div>
                <div className="space-y-3">
                  {phase.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
                {selectedPhase === phase.value && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="mt-6 text-center"
                  >
                    <span className="badge badge-primary">Selected</span>
                  </motion.div>
                )}
              </div>
            </motion.label>
          ))}
        </div>

        <div className="text-center">
          <motion.button
            whileHover={selectedPhase && !loading ? { scale: 1.02 } : {}}
            whileTap={selectedPhase && !loading ? { scale: 0.98 } : {}}
            onClick={handleSubmit}
            disabled={!selectedPhase || loading}
            className={`btn-primary text-lg px-8 py-4 ${
              !selectedPhase || loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Start Test'
            )}
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default function PhaseSelectionPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    }>
      <PhaseSelectionContent />
    </Suspense>
  )
}
