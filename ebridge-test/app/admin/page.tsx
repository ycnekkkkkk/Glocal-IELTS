'use client'

import { useState, useEffect, useCallback } from 'react'

interface QueueItem {
  fileId: string
  fileName: string
  timestamp?: string
  candidateInfo?: { fullName?: string; email?: string; phone?: string; province?: string }
}

interface PartGrade {
  total: number
  feedback?: string
  [key: string]: unknown
}

interface Grades {
  part1?: PartGrade
  part2?: PartGrade
  part3?: PartGrade
  part4?: PartGrade
  part5?: PartGrade & { wordCount?: number }
  overall?: {
    totalScore: number; maxScore: number; percentage: number
    cefrLevel: string; summary?: string; strengths?: string; improvements?: string
  }
}

interface GradeResult {
  fileId: string
  candidate: string
  score: number
  cefr: string
  emailSent: boolean
  savedToDrive: boolean
  grades: Grades
  candidateInfo: Record<string, unknown>
  writing: string
  folderId: string
  gradedAt?: string
}

// ── helpers ──────────────────────────────────────────────────────
const CEFR_COLOR: Record<string, string> = {
  A1: 'bg-red-100 text-red-700', A2: 'bg-orange-100 text-orange-700',
  B1: 'bg-yellow-100 text-yellow-700', B2: 'bg-green-100 text-green-700',
  C1: 'bg-blue-100 text-blue-700', C2: 'bg-purple-100 text-purple-700',
}

const PARTS_META = [
  { key: 'part1', label: 'Part 1', title: 'Self Introduction', icon: '🎤', fields: ['fluency', 'pronunciation', 'vocabulary', 'grammar'] },
  { key: 'part2', label: 'Part 2', title: 'Cultural Sharing', icon: '🌏', fields: ['contentRelevance', 'vocabulary', 'fluency', 'grammar'] },
  { key: 'part3', label: 'Part 3', title: 'Intercultural Discussion', icon: '💬', fields: ['ideaDevelopment', 'communicationClarity', 'vocabulary', 'grammar'] },
  { key: 'part4', label: 'Part 4', title: 'Leadership Scenario', icon: '🏆', fields: ['problemExplanation', 'communicationSkills', 'fluency', 'vocabulary'] },
  { key: 'part5', label: 'Part 5', title: 'Writing Reflection', icon: '✍️', fields: ['taskResponse', 'organization', 'vocabulary', 'grammar'] },
]

const FIELD_LABELS: Record<string, string> = {
  fluency: 'Fluency', pronunciation: 'Pronunciation', vocabulary: 'Vocabulary',
  grammar: 'Grammar', contentRelevance: 'Content', communicationClarity: 'Clarity',
  ideaDevelopment: 'Ideas', problemExplanation: 'Problem', communicationSkills: 'Comm.',
  taskResponse: 'Task', organization: 'Structure',
}

function ScoreBar({ score, max = 5 }: { score: number; max?: number }) {
  const pct = Math.min((score / max) * 100, 100)
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-indigo-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
        <div className={`${color} h-1.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-700 w-6 text-right">{score}</span>
    </div>
  )
}

// ── Result Modal ─────────────────────────────────────────────────
function ResultModal({ result, onClose }: { result: GradeResult; onClose: () => void }) {
  const g = result.grades
  const overall = g.overall
  const cefrClass = CEFR_COLOR[overall?.cefrLevel ?? ''] ?? 'bg-gray-100 text-gray-700'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,15,35,0.65)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal header */}
        <div className="bg-linear-to-r from-indigo-600 to-blue-600 px-6 py-5 flex items-start justify-between shrink-0">
          <div>
            <h2 className="text-white font-bold text-lg leading-none">{result.candidate}</h2>
            <p className="text-indigo-200 text-sm mt-1">
              {(result.candidateInfo?.email as string) || '—'} &nbsp;·&nbsp; {(result.candidateInfo?.phone as string) || '—'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-white leading-none">{overall?.totalScore ?? 0}</div>
              <div className="text-indigo-200 text-xs">/100</div>
            </div>
            <span className={`text-sm font-bold px-3 py-1.5 rounded-full ${cefrClass}`}>
              {overall?.cefrLevel ?? '—'}
            </span>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition text-lg font-bold">
              ×
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Overall summary */}
          {(overall?.summary || overall?.strengths || overall?.improvements) && (
            <div className="space-y-3">
              {overall.summary && (
                <div className="bg-indigo-50 rounded-xl p-4">
                  <p className="text-xs font-semibold text-indigo-500 uppercase tracking-wide mb-1">Nhận xét tổng quát</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{overall.summary}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {overall.strengths && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-600 mb-1">✅ Điểm mạnh</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{overall.strengths}</p>
                  </div>
                )}
                {overall.improvements && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-600 mb-1">📈 Cần cải thiện</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{overall.improvements}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parts */}
          {PARTS_META.map(({ key, label, title, icon, fields }) => {
            const part = g[key as keyof Grades] as PartGrade | undefined
            if (!part) return null
            const wordCount = key === 'part5' ? (g.part5 as (PartGrade & { wordCount?: number }) | undefined)?.wordCount : undefined
            return (
              <div key={key} className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Part header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{icon}</span>
                    <div>
                      <span className="text-xs font-semibold text-gray-500">{label}</span>
                      <p className="text-sm font-bold text-gray-900 leading-none">{title}
                        {wordCount !== undefined && <span className="text-xs font-normal text-gray-400 ml-2">({wordCount} từ)</span>}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-bold text-indigo-700">{part.total ?? 0}</span>
                    <span className="text-sm text-gray-400">/20</span>
                  </div>
                </div>
                {/* Criteria grid */}
                <div className="px-4 py-3 grid grid-cols-2 gap-x-6 gap-y-2">
                  {fields.map(f => (
                    <div key={f}>
                      <div className="flex justify-between items-center mb-0.5">
                        <span className="text-xs text-gray-500">{FIELD_LABELS[f] ?? f}</span>
                        <span className="text-xs font-semibold text-gray-700">{String(part[f] ?? 0)}/5</span>
                      </div>
                      <ScoreBar score={Number(part[f] ?? 0)} />
                    </div>
                  ))}
                </div>
                {/* Feedback */}
                {part.feedback && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2">
                      💬 {part.feedback}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 shrink-0 flex justify-end">
          <button onClick={onClose}
            className="bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition text-sm">
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

// ── helpers ─────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function historyToResult(item: Record<string, any>): GradeResult {
  return {
    fileId: item.historyFileId ?? item.folderId ?? Math.random().toString(),
    candidate: item.candidateInfo?.fullName ?? '—',
    score: item.grades?.overall?.totalScore ?? 0,
    cefr: item.grades?.overall?.cefrLevel ?? '—',
    emailSent: item.emailSent ?? false,
    savedToDrive: item.savedToDrive ?? false,
    grades: item.grades ?? {},
    candidateInfo: item.candidateInfo ?? {},
    writing: item.writing ?? '',
    folderId: item.folderId ?? '',
    gradedAt: item.gradedAt,
  }
}

// ── Main page ────────────────────────────────────────────────────
export default function AdminPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState(false)
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [history, setHistory] = useState<GradeResult[]>([])
  const [loadingQueue, setLoadingQueue] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [gradingAll, setGradingAll] = useState(false)
  const [gradingItemId, setGradingItemId] = useState<string | null>(null)
  const [modalResult, setModalResult] = useState<GradeResult | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [gradingLog, setGradingLog] = useState<string[]>([])
  const [storedPassword, setStoredPassword] = useState('')
  const [extraApiKey, setExtraApiKey] = useState('')
  const [quotaError, setQuotaError] = useState(false)
  const [pausedFileId, setPausedFileId] = useState<string | null>(null)
  const [retrying, setRetrying] = useState<Record<string, 'drive' | 'email' | null>>({})
  const [activeTab, setActiveTab] = useState<'pending' | 'graded'>('pending')

  useEffect(() => {
    const saved = sessionStorage.getItem('adminPwd')
    if (saved) { setStoredPassword(saved); loadAll(saved) }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  const loadQueue = useCallback(async (pwd: string) => {
    setLoadingQueue(true)
    try {
      const res = await fetch('/api/admin/queue', { headers: { 'x-admin-password': pwd } })
      if (res.status === 401) { setAuthed(false); setAuthError(true); return }
      const data = await res.json()
      if (data.success) { setQueue(data.items || []); setAuthed(true); setAuthError(false) }
    } catch { setGradingLog(prev => [...prev, '❌ Không thể tải hàng đợi']) }
    finally { setLoadingQueue(false) }
  }, [])

  const loadHistory = useCallback(async (pwd: string) => {
    setLoadingHistory(true)
    try {
      const res = await fetch('/api/admin/history', { headers: { 'x-admin-password': pwd } })
      const data = await res.json()
      if (data.success) {
        setHistory((data.items || []).filter((i: Record<string, unknown>) => !i.error).map(historyToResult))
      }
    } catch { /* silent */ }
    finally { setLoadingHistory(false) }
  }, [])

  const loadAll = useCallback(async (pwd: string) => {
    await Promise.all([loadQueue(pwd), loadHistory(pwd)])
  }, [loadQueue, loadHistory])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    sessionStorage.setItem('adminPwd', password)
    setStoredPassword(password)
    await loadAll(password)
  }

  const callGradeNext = useCallback(async (fileId?: string, key?: string) => {
    const res = await fetch('/api/admin/grade-next', {
      method: 'POST',
      headers: { 'x-admin-password': storedPassword, 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, extraApiKey: key || extraApiKey || undefined }),
    })
    return { res, data: await res.json() }
  }, [storedPassword, extraApiKey])

  const processGradeResponse = useCallback((data: Record<string, unknown>): GradeResult => ({
    fileId: data.fileId as string,
    candidate: data.candidate as string,
    score: data.score as number,
    cefr: data.cefr as string,
    emailSent: data.emailSent as boolean,
    savedToDrive: data.savedToDrive as boolean,
    grades: data.grades as Grades,
    candidateInfo: data.candidateInfo as Record<string, unknown>,
    writing: data.writing as string,
    folderId: data.folderId as string,
    gradedAt: data.gradedAt as string | undefined,
  }), [])

  const addToHistory = useCallback((result: GradeResult) => {
    setHistory(prev => {
      const exists = prev.some(r => r.fileId === result.fileId)
      return exists ? prev.map(r => r.fileId === result.fileId ? result : r) : [result, ...prev]
    })
  }, [])

  const gradeOne = useCallback(async (item: QueueItem) => {
    setGradingItemId(item.fileId)
    setQuotaError(false)
    try {
      const { res, data } = await callGradeNext(item.fileId)
      if (res.status === 429 || data.quotaExhausted) {
        setQuotaError(true); setPausedFileId(item.fileId)
        setGradingLog(prev => [...prev, `⛔ Hết quota khi chấm "${item.candidateInfo?.fullName}". Nhập key mới để tiếp tục.`])
        return
      }
      if (!data.success) { setGradingLog(prev => [...prev, `❌ Lỗi: ${data.error}`]); return }
      const result = processGradeResponse(data)
      addToHistory(result)
      setActiveTab('graded')
      setGradingLog(prev => [...prev, `✅ ${data.candidate} — ${data.score}/100 (${data.cefr}) ${data.savedToDrive ? '💾' : '⚠️Drive'} ${data.emailSent ? '📧' : ''}`])
      await loadQueue(storedPassword)
    } catch (err) { setGradingLog(prev => [...prev, `❌ Lỗi kết nối: ${err}`]) }
    finally { setGradingItemId(null) }
  }, [callGradeNext, loadQueue, storedPassword, processGradeResponse, addToHistory])

  const resumeWithNewKey = useCallback(async () => {
    if (!extraApiKey.trim()) return
    setQuotaError(false)
    const fileId = pausedFileId ?? undefined
    setPausedFileId(null)
    if (fileId) {
      const item = queue.find(q => q.fileId === fileId) ?? { fileId, candidateInfo: {} } as QueueItem
      await gradeOne(item)
    } else if (gradingAll) {
      setGradingLog(prev => [...prev, `🔑 Đang tiếp tục với key mới...`])
    }
  }, [extraApiKey, pausedFileId, gradingAll, gradeOne, queue])

  const gradeAll = useCallback(async () => {
    if (queue.length === 0) return
    setGradingAll(true); setQuotaError(false); setPausedFileId(null)
    setProgress({ current: 0, total: queue.length })
    setGradingLog([`🚀 Bắt đầu chấm ${queue.length} bài thi...`])

    let remaining = queue.length; let current = 0
    while (remaining > 0) {
      current++
      setProgress(p => ({ ...p, current }))
      setGradingLog(prev => [...prev, `⏳ Bài ${current}/${queue.length}...`])
      const { res, data } = await callGradeNext(undefined, extraApiKey || undefined)
      if (res.status === 429 || data.quotaExhausted) {
        setQuotaError(true); setPausedFileId(data.fileId ?? null)
        setGradingLog(prev => [...prev, `⛔ Hết quota ở bài ${current}. Nhập key mới và nhấn "Tiếp tục".`])
        setGradingAll(false); return
      }
      if (data.done) { setGradingLog(prev => [...prev, '✅ Hàng đợi đã trống!']); break }
      if (!data.success) { setGradingLog(prev => [...prev, `❌ Lỗi bài ${current}: ${data.error}`]); break }
      const result = processGradeResponse(data)
      addToHistory(result)
      setGradingLog(prev => [...prev, `✅ ${data.candidate} — ${data.score}/100 (${data.cefr}) ${data.savedToDrive ? '💾' : '⚠️Drive'} ${data.emailSent ? '📧' : ''}`])
      remaining = data.remaining ?? 0
    }
    setGradingAll(false)
    setGradingLog(prev => [...prev, `🎉 Hoàn thành! Đã chấm ${current} bài.`])
    setActiveTab('graded')
    await loadQueue(storedPassword)
  }, [queue.length, storedPassword, loadQueue, callGradeNext, extraApiKey, processGradeResponse, addToHistory])

  const retry = useCallback(async (result: GradeResult, action: 'drive' | 'email') => {
    setRetrying(prev => ({ ...prev, [result.fileId + action]: action }))
    try {
      const res = await fetch('/api/admin/retry', {
        method: 'POST',
        headers: { 'x-admin-password': storedPassword, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, candidateInfo: result.candidateInfo, grades: result.grades, writing: result.writing, folderId: result.folderId }),
      })
      const data = await res.json()
      if (data.success) {
        setHistory(prev => prev.map(r =>
          r.fileId === result.fileId
            ? { ...r, savedToDrive: action === 'drive' ? true : r.savedToDrive, emailSent: action === 'email' ? true : r.emailSent }
            : r
        ))
        if (modalResult?.fileId === result.fileId) {
          setModalResult(prev => prev ? { ...prev, savedToDrive: action === 'drive' ? true : prev.savedToDrive, emailSent: action === 'email' ? true : prev.emailSent } : null)
        }
      } else {
        alert(`Lỗi: ${data.error}`)
      }
    } catch (err) { alert(`Lỗi kết nối: ${err}`) }
    finally { setRetrying(prev => ({ ...prev, [result.fileId + action]: null })) }
  }, [storedPassword, modalResult])

  const isGrading = gradingAll || !!gradingItemId

  // ── Login screen ─────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-indigo-50 to-blue-50 px-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <div className="flex justify-center gap-0 mb-3">
              <img src="/logo-ag.png" alt="" className="h-12 w-auto object-contain" />
              <img src="/logo-gi.png" alt="" className="h-12 w-auto object-contain" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-sm text-gray-500 mt-1">Glocal IELTS E-Bridge Test</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mật khẩu admin"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            {authError && <p className="text-red-500 text-sm">Mật khẩu không đúng</p>}
            <button type="submit" disabled={loadingQueue}
              className="w-full bg-indigo-600 text-white font-semibold rounded-xl py-3 hover:bg-indigo-700 transition disabled:opacity-50">
              {loadingQueue ? 'Đang kiểm tra...' : 'Đăng nhập'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Main dashboard ────────────────────────────────────────────
  return (
    <>
      {/* Modal overlay */}
      {modalResult && <ResultModal result={modalResult} onClose={() => setModalResult(null)} />}

      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-sm">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-2 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-2">
              <img src="/logo-ag.png" alt="" className="h-7 sm:h-9 w-auto object-contain shrink-0" />
              <img src="/logo-gi.png" alt="" className="h-7 sm:h-9 w-auto object-contain shrink-0" />
              <div>
                <h1 className="font-bold text-gray-900 text-sm sm:text-base leading-none">Admin Panel</h1>
                <p className="text-xs text-gray-400 mt-0.5">Glocal IELTS E-Bridge Test</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => loadAll(storedPassword)} disabled={loadingQueue || loadingHistory}
                className="flex-1 sm:flex-none text-xs sm:text-sm text-indigo-600 border border-indigo-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-indigo-50 transition disabled:opacity-50 text-center">
                {(loadingQueue || loadingHistory) ? '⏳' : '🔄'} Làm mới
              </button>
              <button onClick={() => { sessionStorage.removeItem('adminPwd'); setAuthed(false) }}
                className="flex-1 sm:flex-none text-xs sm:text-sm text-gray-500 border border-gray-200 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-gray-100 transition text-center">
                Đăng xuất
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Chờ chấm', value: queue.length, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
              { label: 'Đã chấm', value: history.length, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
              { label: 'Email đã gửi', value: history.filter(r => r.emailSent).length, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
              { label: 'Drive đã lưu', value: history.filter(r => r.savedToDrive).length, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl border ${s.border} p-3 sm:p-5 text-center`}>
                <div className={`text-2xl sm:text-3xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            <button onClick={() => setActiveTab('pending')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'pending' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              ⏳ Chờ chấm
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'}`}>{queue.length}</span>
            </button>
            <button onClick={() => setActiveTab('graded')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-sm font-semibold transition ${activeTab === 'graded' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              ✅ Đã chấm
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === 'graded' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>{history.length}</span>
            </button>
          </div>

          {/* Grade All Panel */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="font-bold text-gray-900">Chấm điểm hàng loạt</h2>
                <p className="text-sm text-gray-500 mt-0.5">AI chấm lần lượt, lưu Drive + gửi email tự động</p>
              </div>
              <button onClick={gradeAll} disabled={isGrading || queue.length === 0}
                className="w-full sm:w-auto bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {gradingAll
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Đang chấm...</>
                  : <>🤖 Chấm tất cả ({queue.length} bài)</>}
              </button>
            </div>

            {/* Extra API Key */}
            <div className={`rounded-xl p-3 sm:p-4 border ${quotaError ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">🔑 Gemini API Key dự phòng</span>
                {quotaError && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">⛔ Hết quota — cần key mới</span>}
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="text" value={extraApiKey} onChange={e => setExtraApiKey(e.target.value)}
                  placeholder="AIzaSy... (chỉ dùng khi 5 key trong .env đã hết quota)"
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-w-0" />
                {quotaError && (
                  <button onClick={resumeWithNewKey} disabled={!extraApiKey.trim()}
                    className="w-full sm:w-auto bg-green-600 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-green-700 transition disabled:opacity-40">
                    ▶ Tiếp tục
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">5 key trong .env.local được dùng trước, key này là phương án cuối</p>
            </div>

            {/* Progress */}
            {gradingAll && (
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Tiến độ</span><span>{progress.current}/{progress.total}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: progress.total > 0 ? `${(progress.current / progress.total) * 100}%` : '0%' }} />
                </div>
              </div>
            )}

            {/* Log */}
            {gradingLog.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-3 max-h-36 overflow-y-auto space-y-0.5">
                {gradingLog.map((log, i) => (
                  <p key={i} className="text-xs text-gray-300 font-mono">{log}</p>
                ))}
              </div>
            )}
          </div>

          {/* Queue List — only visible on pending tab */}
          {activeTab === 'pending' && <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Hàng đợi chờ chấm</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold px-3 py-1 rounded-full">{queue.length} bài</span>
            </div>
            {queue.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="text-4xl mb-3">🎉</div>
                <p className="text-gray-500">Không có bài nào trong hàng đợi</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {queue.map((item, idx) => (
                  <div key={item.fileId} className="px-4 sm:px-6 py-3 sm:py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-bold shrink-0">{idx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{item.candidateInfo?.fullName || '—'}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          📧 {item.candidateInfo?.email || '—'} · 📞 {item.candidateInfo?.phone || '—'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5 sm:hidden">{item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : ''}</p>
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        <p className="text-xs text-gray-400">{item.candidateInfo?.province || '—'}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : '—'}</p>
                      </div>
                      <button onClick={() => gradeOne(item)} disabled={isGrading}
                        className="shrink-0 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-2.5 sm:px-3 py-2 rounded-lg transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
                        {gradingItemId === item.fileId
                          ? <><span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />Chấm...</>
                          : <>🤖 Chấm</>}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>}

          {/* Results — only visible on graded tab */}
          {activeTab === 'graded' && (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="font-bold text-gray-900">Lịch sử đã chấm</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {loadingHistory ? '⏳ Đang tải...' : `${history.length} bài · ${history.filter(r => r.emailSent).length} email đã gửi · ${history.filter(r => r.savedToDrive).length} Drive đã lưu`}
                  </p>
                </div>
                <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1 rounded-full shrink-0">{history.length} bài</span>
              </div>
              {history.length === 0 && !loadingHistory ? (
                <div className="px-6 py-12 text-center">
                  <div className="text-4xl mb-3">📭</div>
                  <p className="text-gray-500">Chưa có bài nào được chấm</p>
                </div>
              ) : (
              <div className="divide-y divide-gray-100">
                {history.map((r) => (
                  <div key={r.fileId} className="px-4 sm:px-6 py-3 sm:py-4">
                    {/* Top row: icon + info + score */}
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 sm:w-9 sm:h-9 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold text-sm sm:text-base shrink-0">✓</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{r.candidate}</p>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {(r.candidateInfo?.email as string) || '—'} · {(r.candidateInfo?.phone as string) || '—'}
                        </p>
                      </div>
                      <div className="text-center shrink-0">
                        <div className="text-lg sm:text-xl font-bold text-indigo-700">{r.score}<span className="text-xs sm:text-sm text-gray-400">/100</span></div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${CEFR_COLOR[r.cefr] ?? 'bg-gray-100 text-gray-600'}`}>{r.cefr}</span>
                      </div>
                    </div>

                    {/* Bottom row: status badges + view button */}
                    <div className="flex items-center justify-between mt-2 pl-11 sm:pl-12 gap-2">
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {r.savedToDrive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />💾 Drive đã lưu
                          </span>
                        ) : (
                          <button onClick={() => retry(r, 'drive')} disabled={!!retrying[r.fileId + 'drive']}
                            className="inline-flex items-center gap-1 text-xs text-red-600 font-medium hover:text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-lg transition disabled:opacity-50">
                            {retrying[r.fileId + 'drive'] ? <span className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" /> : '⚠️'}
                            Lưu Drive
                          </button>
                        )}
                        {r.emailSent ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />📧 Email đã gửi
                          </span>
                        ) : (
                          <button onClick={() => retry(r, 'email')} disabled={!!retrying[r.fileId + 'email']}
                            className="inline-flex items-center gap-1 text-xs text-amber-700 font-medium hover:text-amber-800 border border-amber-200 bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg transition disabled:opacity-50">
                            {retrying[r.fileId + 'email'] ? <span className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin" /> : '📤'}
                            Gửi email
                          </button>
                        )}
                      </div>
                      <button onClick={() => setModalResult(r)}
                        className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition flex items-center gap-1">
                        📊 Xem kết quả
                      </button>
                    </div>

                    {r.gradedAt && (
                      <p className="text-xs text-gray-400 mt-1.5 pl-11 sm:pl-[52px]">
                        🕐 {new Date(r.gradedAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          )}
        </main>
      </div>
    </>
  )
}
