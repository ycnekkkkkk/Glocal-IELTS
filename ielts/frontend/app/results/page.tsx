'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { motion, AnimatePresence } from 'framer-motion'

type TabType = 'overview' | 'ielts' | 'extended'

function ResultsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!sessionId) {
      router.push('/')
      return
    }
    loadSession()
  }, [sessionId, router])

  const loadSession = async () => {
    if (!sessionId) return
    try {
      const sessionData = await apiClient.getSession(parseInt(sessionId))
      setSession(sessionData)
      setLoading(false)
    } catch (error) {
      console.error('Error loading session:', error)
      setLoading(false)
    }
  }

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-xl text-gray-600">Loading results...</div>
        </div>
      </div>
    )
  }

  if (!session || !session.final_results) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="card max-w-md text-center">
          <div className="text-6xl mb-4">😕</div>
          <div className="text-xl text-gray-900 mb-4">No results found</div>
          <button onClick={() => router.push('/')} className="btn-primary">
            Return Home
          </button>
        </div>
      </div>
    )
  }

  const results = session.final_results

  const getBandColor = (band: number) => {
    if (band >= 7) return 'bg-green-500'
    if (band >= 5.5) return 'bg-yellow-500'
    if (band > 0) return 'bg-orange-500'
    return 'bg-gray-400'
  }

  const getBandLabel = (band: number) => {
    if (band >= 8) return 'Excellent'
    if (band >= 7) return 'Good'
    if (band >= 6) return 'Competent'
    if (band >= 5.5) return 'Modest'
    if (band > 0) return 'Limited'
    return 'No Score'
  }

  const BandCard = ({ title, band, icon }: { title: string; band: number; icon: string }) => {
    const percentage = (band / 9.0) * 100
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card text-center"
      >
        <div className="text-4xl mb-3">{icon}</div>
        <div className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">{title}</div>
        <div className={`${getBandColor(band)} text-white text-5xl font-bold rounded-xl w-20 h-20 flex items-center justify-center mx-auto shadow-lg mb-3`}>
          {band.toFixed(1)}
        </div>
        <div className="text-xs text-gray-500 mb-3">{getBandLabel(band)}</div>
        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ duration: 1, delay: 0.3 }}
            className={`h-full ${getBandColor(band)}`}
          />
        </div>
      </motion.div>
    )
  }

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: '📊' },
    // { id: 'ielts' as TabType, label: 'IELTS Analysis', icon: '📝' },
    { id: 'extended' as TabType, label: 'Extended Analysis', icon: '🔍' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container-custom max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="section-header">IELTS Test Results</h1>
          <div className="inline-flex items-center space-x-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <span className="text-gray-600">Level:</span>
            <span className="font-semibold capitalize text-blue-600">
              {session.level}
            </span>
          </div>
        </motion.div>

        {/* Overall Band Score */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card bg-gradient-to-r from-blue-600 to-indigo-600 text-white mb-8"
        >
          <div className="text-center">
            <div className="text-sm font-semibold opacity-90 mb-2">Overall Band Score</div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="text-7xl font-bold mb-2"
            >
              {results.overall?.toFixed(1) || '0.0'}
            </motion.div>
            <div className="text-blue-100 text-lg mb-4">out of 9.0</div>
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full text-sm">
              {getBandLabel(results.overall || 0)}
            </div>
          </div>
        </motion.div>

        {/* Individual Bands Grid */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12"
        >
          <BandCard title="Listening" band={results.listening || 0} icon="🎧" />
          <BandCard title="Reading" band={results.reading || 0} icon="📖" />
          <BandCard title="Writing" band={results.writing || 0} icon="✍️" />
          <BandCard title="Speaking" band={results.speaking || 0} icon="🎤" />
        </motion.div>

        {/* Tabs Navigation */}
        {session.final_results?.detailed_analysis && (
          <div className="mb-8">
            <div className="flex space-x-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-semibold transition-all ${activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <span className="text-xl">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && session.final_results?.detailed_analysis && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <div className="card bg-green-50 border-green-200">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center">
                  <span className="mr-2">✅</span>
                  Key Strengths
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  {results.overall >= 7 && (
                    <p>• Strong overall performance in IELTS test</p>
                  )}
                  {results.listening >= 7 && (
                    <p>• Excellent listening comprehension skills</p>
                  )}
                  {results.reading >= 7 && (
                    <p>• Outstanding reading comprehension ability</p>
                  )}
                  {results.writing >= 7 && (
                    <p>• Strong writing skills</p>
                  )}
                  {results.speaking >= 7 && (
                    <p>• Excellent speaking proficiency</p>
                  )}
                </div>
              </div>
              <div className="card bg-orange-50 border-orange-200">
                <h3 className="font-semibold text-orange-900 mb-3 flex items-center">
                  <span className="mr-2">📈</span>
                  Areas for Improvement
                </h3>
                <div className="space-y-2 text-sm text-gray-700">
                  {results.overall < 6 && (
                    <p>• Continue practicing to improve overall score</p>
                  )}
                  {results.listening < 6 && (
                    <p>• Focus on improving listening comprehension</p>
                  )}
                  {results.reading < 6 && (
                    <p>• Enhance reading comprehension skills</p>
                  )}
                  {results.writing < 6 && (
                    <p>• Practice writing more frequently</p>
                  )}
                  {results.speaking < 6 && (
                    <p>• Work on speaking fluency and accuracy</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* IELTS Analysis tab - Hidden */}
          {/* {activeTab === 'ielts' && session.final_results?.detailed_analysis?.ielts_analysis && (
            <motion.div
              key="ielts"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {session.final_results.detailed_analysis.ielts_analysis.reading && (
                <CollapsibleSection
                  title="📖 Reading Analysis"
                  id="reading"
                  expanded={expandedSections.has('reading')}
                  onToggle={() => toggleSection('reading')}
                >
                  <ReadingAnalysis data={session.final_results.detailed_analysis.ielts_analysis.reading} />
                </CollapsibleSection>
              )}

              {session.final_results.detailed_analysis.ielts_analysis.listening && (
                <CollapsibleSection
                  title="🎧 Listening Analysis"
                  id="listening"
                  expanded={expandedSections.has('listening')}
                  onToggle={() => toggleSection('listening')}
                >
                  <ListeningAnalysis data={session.final_results.detailed_analysis.ielts_analysis.listening} />
                </CollapsibleSection>
              )}

              {session.final_results.detailed_analysis.ielts_analysis.writing && (
                <CollapsibleSection
                  title="✍️ Writing Analysis"
                  id="writing"
                  expanded={expandedSections.has('writing')}
                  onToggle={() => toggleSection('writing')}
                >
                  <WritingAnalysis data={session.final_results.detailed_analysis.ielts_analysis.writing} />
                </CollapsibleSection>
              )}

              {session.final_results.detailed_analysis.ielts_analysis.speaking && (
                <CollapsibleSection
                  title="🎤 Speaking Analysis"
                  id="speaking"
                  expanded={expandedSections.has('speaking')}
                  onToggle={() => toggleSection('speaking')}
                >
                  <SpeakingAnalysis data={session.final_results.detailed_analysis.ielts_analysis.speaking} />
                </CollapsibleSection>
              )}
            </motion.div>
          )} */}

          {activeTab === 'extended' && session.final_results?.detailed_analysis?.extended_analysis && (
            <motion.div
              key="extended"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <ExtendedAnalysis data={session.final_results.detailed_analysis.extended_analysis} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-12"
        >
          <button
            onClick={() => router.push('/')}
            className="btn-primary text-lg px-8 py-4"
          >
            Take New Test
          </button>
        </motion.div>
      </div>
    </div >
  )
}

function CollapsibleSection({
  title,
  id,
  expanded,
  onToggle,
  children
}: {
  title: string
  id: string
  expanded: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div className="card">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left"
      >
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <motion.div
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.3 }}
          className="text-2xl text-gray-400"
        >
          ▼
        </motion.div>
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ReadingAnalysis({ data }: { data: any }) {
  // Handle both old format (question_type_analysis as object with stats) and new format (with strengths/weaknesses)
  const questionTypeAnalysis = data.question_type_analysis || {}
  const isNewFormat = data.strengths !== undefined || data.weaknesses !== undefined

  return (
    <div className="space-y-4">
      {data.strengths && data.strengths.length > 0 && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
          <div className="font-semibold text-green-900 mb-2 flex items-center">
            <span className="mr-2">✅</span>
            Điểm mạnh
          </div>
          <ul className="space-y-1 text-gray-700">
            {data.strengths.map((s: string, i: number) => (
              <li key={i} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.weaknesses && data.weaknesses.length > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
          <div className="font-semibold text-red-900 mb-2 flex items-center">
            <span className="mr-2">⚠️</span>
            Điểm yếu
          </div>
          <ul className="space-y-1 text-gray-700">
            {data.weaknesses.map((w: string, i: number) => (
              <li key={i} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {data.detailed_analysis && Object.keys(data.detailed_analysis).length > 0 && (
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 rounded-r-lg">
          <div className="font-semibold text-purple-900 mb-3 flex items-center">
            <span className="mr-2">📊</span>
            Phân tích chi tiết theo loại câu hỏi
          </div>
          <div className="space-y-3">
            {Object.entries(data.detailed_analysis).map(([type, analysis]: [string, any]) => (
              <div key={type} className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="font-medium text-purple-600 capitalize mb-2">{type.replace(/_/g, ' ')}</div>
                <div className="text-sm text-gray-700">{typeof analysis === 'string' ? analysis : JSON.stringify(analysis, null, 2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {data.recommendations && data.recommendations.length > 0 && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
          <div className="font-semibold text-blue-900 mb-2 flex items-center">
            <span className="mr-2">💡</span>
            Khuyến nghị
          </div>
          <ul className="space-y-1 text-gray-700">
            {data.recommendations.map((r: string, i: number) => (
              <li key={i} className="flex items-start">
                <span className="mr-2">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {Object.keys(questionTypeAnalysis).length > 0 && !isNewFormat && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="font-semibold mb-3 text-gray-900">Hiệu suất theo loại câu hỏi</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(questionTypeAnalysis).map(([type, stats]: [string, any]) => (
              <div key={type} className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="font-medium text-blue-600 capitalize mb-2">{type.replace(/_/g, ' ')}</div>
                {stats.correct !== undefined && stats.total !== undefined && (
                  <div className="text-sm text-gray-600">
                    Đúng: <span className="font-semibold text-green-600">{stats.correct}</span> / {stats.total}
                  </div>
                )}
                {stats.accuracy !== undefined && (
                  <div className="text-sm text-gray-600">
                    Độ chính xác: <span className="font-semibold text-blue-600">{stats.accuracy}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ListeningAnalysis({ data }: { data: any }) {
  return <ReadingAnalysis data={data} />
}

function WritingAnalysis({ data }: { data: any }) {
  const criteria = ['task_achievement', 'coherence_cohesion', 'lexical_resource', 'grammatical_range']

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {criteria.map((criterion) => {
          const critData = data[criterion]
          if (!critData) return null
          return (
            <div key={criterion} className="card">
              <div className="font-semibold mb-2 text-gray-700 capitalize">{criterion.replace(/_/g, ' ')}</div>
              <div className="text-3xl font-bold text-blue-600 mb-3">{critData.score?.toFixed(1)}</div>
              {critData.strengths && critData.strengths.length > 0 && (
                <div className="text-xs text-green-700 mb-2">
                  <div className="font-medium mb-1">✅ Điểm mạnh:</div>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    {critData.strengths.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {critData.weaknesses && critData.weaknesses.length > 0 && (
                <div className="text-xs text-red-700">
                  <div className="font-medium mb-1">⚠️ Điểm yếu:</div>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    {critData.weaknesses.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {data.overall_assessment && (
        <div className="card bg-blue-50 border-blue-200">
          <div className="font-semibold mb-2 text-gray-900">Đánh giá tổng thể</div>
          <div className="text-gray-700">{data.overall_assessment}</div>
        </div>
      )}
    </div>
  )
}

function SpeakingAnalysis({ data }: { data: any }) {
  const criteria = ['fluency_coherence', 'lexical_resource', 'grammatical_range', 'pronunciation']

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {criteria.map((criterion) => {
          const critData = data[criterion]
          if (!critData) return null
          return (
            <div key={criterion} className="card">
              <div className="font-semibold mb-2 text-gray-700 capitalize">{criterion.replace(/_/g, ' ')}</div>
              <div className="text-3xl font-bold text-purple-600 mb-3">{critData.score?.toFixed(1)}</div>
              {critData.strengths && critData.strengths.length > 0 && (
                <div className="text-xs text-green-700 mb-2">
                  <div className="font-medium mb-1">✅ Điểm mạnh:</div>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    {critData.strengths.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
              {critData.weaknesses && critData.weaknesses.length > 0 && (
                <div className="text-xs text-red-700">
                  <div className="font-medium mb-1">⚠️ Điểm yếu:</div>
                  <ul className="list-disc list-inside ml-2 space-y-0.5">
                    {critData.weaknesses.map((w: string, i: number) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        })}
      </div>
      {data.overall_assessment && (
        <div className="card bg-purple-50 border-purple-200">
          <div className="font-semibold mb-2 text-gray-900">Overall Assessment</div>
          <div className="text-gray-700">{data.overall_assessment}</div>
        </div>
      )}
    </div>
  )
}

function ExtendedAnalysis({ data }: { data: any }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['overall']))

  const toggle = (id: string) => {
    setExpanded(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const skills = [
    { key: 'listening', icon: '🎧', title: 'Listening', color: 'blue' },
    { key: 'reading', icon: '📖', title: 'Reading', color: 'purple' },
    { key: 'writing', icon: '✍️', title: 'Writing', color: 'green' },
    { key: 'speaking', icon: '🎤', title: 'Speaking', color: 'orange' },
  ]

  return (
    <div className="space-y-6">
      {/* Overall Summary */}
      {data.overall && (
        <CollapsibleSection
          title="📊 Overall Performance Analysis"
          id="overall"
          expanded={expanded.has('overall')}
          onToggle={() => toggle('overall')}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.overall.reflex_level && (
              <div className="card">
                <div className="font-semibold mb-2 text-gray-700 flex items-center">
                  <span className="mr-2">⚡</span>
                  Reflex Level
                </div>
                <div className="text-gray-700">{data.overall.reflex_level}</div>
              </div>
            )}
            {data.overall.reception_ability && (
              <div className="card">
                <div className="font-semibold mb-2 text-gray-700 flex items-center">
                  <span className="mr-2">🧠</span>
                  Reception Ability
                </div>
                <div className="text-gray-700">{data.overall.reception_ability}</div>
              </div>
            )}
            {data.overall.mother_tongue_influence && (
              <div className="card md:col-span-2">
                <div className="font-semibold mb-2 text-gray-700 flex items-center">
                  <span className="mr-2">🌍</span>
                  Mother Tongue Influence
                </div>
                <div className="text-gray-700">{data.overall.mother_tongue_influence}</div>
              </div>
            )}
            {data.overall.key_strengths && (
              <div className="card bg-green-50 border-green-200 md:col-span-2">
                <div className="font-semibold mb-2 text-green-700 flex items-center">
                  <span className="mr-2">✅</span>
                  Key Strengths
                </div>
                <div className="text-gray-700">{data.overall.key_strengths}</div>
              </div>
            )}
            {data.overall.key_weaknesses && (
              <div className="card bg-orange-50 border-orange-200 md:col-span-2">
                <div className="font-semibold mb-2 text-orange-700 flex items-center">
                  <span className="mr-2">⚠️</span>
                  Key Weaknesses
                </div>
                <div className="text-gray-700">{data.overall.key_weaknesses}</div>
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Individual Skills */}
      {skills.map(({ key, icon, title, color }) => {
        const skillData = data[key]
        if (!skillData || Object.keys(skillData).length === 0) return null

        return (
          <CollapsibleSection
            key={key}
            title={`${icon} ${title} Extended Analysis`}
            id={key}
            expanded={expanded.has(key)}
            onToggle={() => toggle(key)}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(skillData).map(([field, value]: [string, any]) => {
                if (!value || (typeof value === 'string' && value.trim() === '')) return null

                const displayValue = typeof value === 'object' && value !== null && !Array.isArray(value)
                  ? JSON.stringify(value, null, 2)
                  : String(value || '')

                const label = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())

                return (
                  <div key={field} className="card">
                    <div className="font-semibold mb-2 text-gray-700 text-sm">
                      {label}
                    </div>
                    <div className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">
                      {displayValue}
                    </div>
                  </div>
                )
              })}
            </div>
          </CollapsibleSection>
        )
      })}
    </div>
  )
}

export default function ResultsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-xl text-gray-600">Loading results...</div>
        </div>
      </div>
    }>
      <ResultsContent />
    </Suspense>
  )
}

