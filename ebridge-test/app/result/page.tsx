'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface PartGrade {
  total: number
  feedback: string
  [key: string]: number | string
}

interface OverallGrade {
  totalScore: number
  maxScore: number
  percentage: number
  cefrLevel: string
  summary: string
  strengths: string
  improvements: string
}

interface GradeResult {
  part1: PartGrade & { fluency: number; pronunciation: number; vocabulary: number; grammar: number }
  part2: PartGrade & { contentRelevance: number; vocabulary: number; fluency: number; grammar: number }
  part3: PartGrade & { ideaDevelopment: number; communicationClarity: number; vocabulary: number; grammar: number }
  part4: PartGrade & { problemExplanation: number; communicationSkills: number; fluency: number; vocabulary: number }
  part5: PartGrade & { taskResponse: number; organization: number; vocabulary: number; grammar: number; wordCount: number }
  overall: OverallGrade
}

const CEFR_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  A1: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'Beginner' },
  A2: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'Elementary' },
  B1: { color: 'text-indigo-600', bg: 'bg-indigo-100', label: 'Intermediate' },
  B2: { color: 'text-violet-600', bg: 'bg-violet-100', label: 'Upper Intermediate' },
  C1: { color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'Advanced' },
  C2: { color: 'text-rose-600', bg: 'bg-rose-100', label: 'Proficient' },
}

function ScoreBar({ label, score, max = 5 }: { label: string; score: number; max?: number }) {
  const pct = (score / max) * 100
  const color = score >= 4 ? 'bg-emerald-500' : score >= 3 ? 'bg-indigo-500' : score >= 2 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-600 w-44 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-sm font-bold w-10 text-right ${score >= 4 ? 'text-emerald-600' : score >= 3 ? 'text-indigo-600' : score >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
        {score}/{max}
      </span>
    </div>
  )
}

function PartCard({
  icon, partNum, title, total, criteria, feedback,
}: {
  icon: string; partNum: number; title: string; total: number
  criteria: { label: string; score: number }[]; feedback: string
}) {
  const pct = (total / 20) * 100
  const color = pct >= 75 ? 'text-emerald-600' : pct >= 60 ? 'text-indigo-600' : pct >= 40 ? 'text-amber-600' : 'text-red-500'
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="text-xs text-gray-400 font-medium">Part {partNum}</p>
            <p className="font-bold text-gray-800">{title}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-2xl font-bold ${color}`}>{total}</p>
          <p className="text-xs text-gray-400">/20 pts</p>
        </div>
      </div>
      <div className="px-5 py-4 space-y-3">
        {criteria.map(c => <ScoreBar key={c.label} label={c.label} score={c.score} />)}
        {feedback && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 mb-1">💬 Feedback:</p>
            <p className="text-sm text-gray-700 leading-relaxed">{feedback}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function ScoreCircle({ score, max }: { score: number; max: number }) {
  const pct = score / max
  const r = 70
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - pct)
  const color = pct >= 0.8 ? '#10b981' : pct >= 0.65 ? '#4f46e5' : pct >= 0.5 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative inline-flex items-center justify-center w-44 h-44">
      <svg className="-rotate-90 absolute" width="176" height="176">
        <circle cx="88" cy="88" r={r} fill="none" stroke="#e5e7eb" strokeWidth="12" />
        <circle cx="88" cy="88" r={r} fill="none" stroke={color} strokeWidth="12"
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.5s ease' }} />
      </svg>
      <div className="text-center z-10">
        <p className="text-4xl font-bold" style={{ color }}>{score}</p>
        <p className="text-sm text-gray-400">/{max}</p>
      </div>
    </div>
  )
}

export default function ResultPage() {
  const router = useRouter()
  const [grades, setGrades] = useState<GradeResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const raw = localStorage.getItem('gradeResult')
    if (!raw) { router.push('/done'); return }
    try {
      setGrades(JSON.parse(raw))
      setLoading(false)
    } catch {
      setError('Unable to read grading results')
      setLoading(false)
    }
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-100" />
        <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
        <div className="absolute inset-3 rounded-full bg-indigo-50 flex items-center justify-center text-2xl">🤖</div>
      </div>
      <div className="text-center">
        <p className="text-lg font-bold text-indigo-900">Grading in progress...</p>
        <p className="text-gray-500 text-sm mt-1">The system is analyzing all 5 parts of your test</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold text-red-600">Unable to grade</h2>
      <p className="text-gray-600 text-center max-w-md text-sm">{error}</p>
      <p className="text-gray-500 text-sm">Please check the grading system</p>
      <button onClick={() => router.push('/done')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
        Go Back
      </button>
    </div>
  )

  if (!grades) return null

  const { overall } = grades
  const cefr = CEFR_CONFIG[overall.cefrLevel] || CEFR_CONFIG['B1']

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-white border-b border-indigo-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo-glocal-ielts.png" alt="Glocal IELTS" className="h-9 w-auto object-contain shrink-0" />
            <span className="font-bold text-indigo-900 text-sm">Glocal IELTS E-Bridge Test</span>
          </div>
          <button onClick={() => window.print()} className="text-xs text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition">
            🖨️ Print Results
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-5 fade-in">

        {/* Overall Score Hero */}
        <div className="bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl p-6 text-white">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ScoreCircle score={overall.totalScore} max={overall.maxScore} />
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${cefr.bg} ${cefr.color}`}>
                  CEFR {overall.cefrLevel} — {cefr.label}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-bold bg-white/20 text-white">
                  {overall.percentage}%
                </span>
              </div>
              <p className="text-indigo-100 text-sm leading-relaxed">{overall.summary}</p>
            </div>
          </div>
        </div>

        {/* 5-part score bar overview */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">Part Overview</h3>
          <div className="space-y-3">
            {[
              { icon: '🎤', label: 'Part 1 – Self Introduction', score: grades.part1.total },
              { icon: '🌏', label: 'Part 2 – Cultural Sharing', score: grades.part2.total },
              { icon: '💬', label: 'Part 3 – Intercultural Discussion', score: grades.part3.total },
              { icon: '🏆', label: 'Part 4 – Leadership Scenario', score: grades.part4.total },
              { icon: '✍️', label: 'Part 5 – Writing Reflection', score: grades.part5.total },
            ].map(p => (
              <div key={p.label} className="flex items-center gap-3">
                <span className="text-xl w-7">{p.icon}</span>
                <span className="text-sm text-gray-600 w-52 shrink-0">{p.label}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${p.score >= 15 ? 'bg-emerald-500' : p.score >= 12 ? 'bg-indigo-500' : p.score >= 8 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${(p.score / 20) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-700 w-12 text-right">{p.score}/20</span>
              </div>
            ))}
          </div>
        </div>

        {/* Part 1 */}
        <PartCard
          icon="🎤" partNum={1} title="Self Introduction"
          total={grades.part1.total}
          criteria={[
            { label: 'Fluency', score: grades.part1.fluency },
            { label: 'Pronunciation', score: grades.part1.pronunciation },
            { label: 'Vocabulary', score: grades.part1.vocabulary },
            { label: 'Grammar', score: grades.part1.grammar },
          ]}
          feedback={grades.part1.feedback}
        />

        {/* Part 2 */}
        <PartCard
          icon="🌏" partNum={2} title="Cultural Sharing"
          total={grades.part2.total}
          criteria={[
            { label: 'Content Relevance', score: grades.part2.contentRelevance },
            { label: 'Vocabulary', score: grades.part2.vocabulary },
            { label: 'Fluency', score: grades.part2.fluency },
            { label: 'Grammar', score: grades.part2.grammar },
          ]}
          feedback={grades.part2.feedback}
        />

        {/* Part 3 */}
        <PartCard
          icon="💬" partNum={3} title="Intercultural Discussion"
          total={grades.part3.total}
          criteria={[
            { label: 'Idea Development', score: grades.part3.ideaDevelopment },
            { label: 'Communication Clarity', score: grades.part3.communicationClarity },
            { label: 'Vocabulary', score: grades.part3.vocabulary },
            { label: 'Grammar', score: grades.part3.grammar },
          ]}
          feedback={grades.part3.feedback}
        />

        {/* Part 4 */}
        <PartCard
          icon="🏆" partNum={4} title="Leadership Scenario"
          total={grades.part4.total}
          criteria={[
            { label: 'Problem Explanation', score: grades.part4.problemExplanation },
            { label: 'Communication Skills', score: grades.part4.communicationSkills },
            { label: 'Fluency', score: grades.part4.fluency },
            { label: 'Vocabulary', score: grades.part4.vocabulary },
          ]}
          feedback={grades.part4.feedback}
        />

        {/* Part 5 */}
        <PartCard
          icon="✍️" partNum={5} title={`Writing Reflection (${grades.part5.wordCount} words)`}
          total={grades.part5.total}
          criteria={[
            { label: 'Task Response', score: grades.part5.taskResponse },
            { label: 'Organization', score: grades.part5.organization },
            { label: 'Vocabulary', score: grades.part5.vocabulary },
            { label: 'Grammar', score: grades.part5.grammar },
          ]}
          feedback={grades.part5.feedback}
        />

        {/* Strengths & Improvements */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <h4 className="font-bold text-emerald-800 mb-2 flex items-center gap-2">
              <span>💪</span> Strengths
            </h4>
            <p className="text-sm text-emerald-700 leading-relaxed">{overall.strengths}</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
            <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
              <span>📈</span> Areas for Improvement
            </h4>
            <p className="text-sm text-amber-700 leading-relaxed">{overall.improvements}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <button
            onClick={() => router.push('/')}
            className="flex-1 bg-white border-2 border-indigo-200 text-indigo-600 font-semibold py-3 rounded-xl hover:bg-indigo-50 transition"
          >
            Home
          </button>
          <button
            onClick={() => window.print()}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold py-3 rounded-xl hover:from-indigo-700 hover:to-blue-700 transition shadow-md"
          >
            🖨️ Print / Save PDF
          </button>
        </div>
      </main>
    </div>
  )
}
