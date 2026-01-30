'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { motion } from 'framer-motion'

const levels = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Just starting to learn English',
    color: 'bg-green-50 border-green-200 hover:border-green-300',
    icon: '🌱',
    ielts: 'IELTS 3.0-4.0'
  },
  {
    value: 'elementary',
    label: 'Elementary',
    description: 'Basic level',
    color: 'bg-blue-50 border-blue-200 hover:border-blue-300',
    icon: '📚',
    ielts: 'IELTS 4.0-4.5'
  },
  {
    value: 'intermediate',
    label: 'Intermediate',
    description: 'Intermediate level',
    color: 'bg-yellow-50 border-yellow-200 hover:border-yellow-300',
    icon: '📖',
    ielts: 'IELTS 5.0-5.5'
  },
  {
    value: 'upper_intermediate',
    label: 'Upper Intermediate',
    description: 'Upper intermediate level',
    color: 'bg-purple-50 border-purple-200 hover:border-purple-300',
    icon: '🎓',
    ielts: 'IELTS 6.0-6.5'
  },
  {
    value: 'advanced',
    label: 'Advanced',
    description: 'Advanced level',
    color: 'bg-red-50 border-red-200 hover:border-red-300',
    icon: '🏆',
    ielts: 'IELTS 7.5-8.0'
  },
]

export default function LevelSelectionPage() {
  const router = useRouter()
  const [selectedLevel, setSelectedLevel] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!selectedLevel) return

    setLoading(true)
    try {
      const session = await apiClient.createSession({ level: selectedLevel as any })
      router.push(`/phase-selection?sessionId=${session.id}`)
    } catch (error) {
      console.error('Error creating session:', error)
      alert('An error occurred. Please try again.')
      setLoading(false)
    }
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
          <h1 className="section-header">Select Your English Level</h1>
          <p className="section-subtitle">
            Choose the level that best matches your current English proficiency
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 max-w-6xl mx-auto">
          {levels.map((level, index) => (
            <motion.label
              key={level.value}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 * index }}
              whileHover={{ y: -2 }}
              className={`relative block cursor-pointer`}
            >
              <input
                type="radio"
                name="level"
                value={level.value}
                checked={selectedLevel === level.value}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="sr-only"
              />
              <div className={`card border-2 transition-all ${
                selectedLevel === level.value
                  ? `${level.color} border-blue-600 shadow-lg ring-2 ring-blue-200`
                  : level.color
              }`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{level.icon}</div>
                  {selectedLevel === level.value && (
                    <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{level.label}</h3>
                <p className="text-sm text-gray-600 mb-4">{level.description}</p>
                <div className="pt-4 border-t border-gray-200">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {level.ielts}
                  </span>
                </div>
              </div>
            </motion.label>
          ))}
        </div>

        <div className="text-center">
          <motion.button
            whileHover={selectedLevel && !loading ? { scale: 1.02 } : {}}
            whileTap={selectedLevel && !loading ? { scale: 0.98 } : {}}
            onClick={handleSubmit}
            disabled={!selectedLevel || loading}
            className={`btn-primary text-lg px-8 py-4 ${
              !selectedLevel || loading ? 'opacity-50 cursor-not-allowed' : ''
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
              'Continue'
            )}
          </motion.button>
          {!selectedLevel && (
            <p className="text-sm text-gray-500 mt-4">Please select a level to continue</p>
          )}
        </div>
      </div>
    </div>
  )
}
