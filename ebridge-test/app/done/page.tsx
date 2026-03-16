'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CandidateInfo } from '@/lib/types'



export default function DonePage() {
  const router = useRouter()
  const [candidate, setCandidate] = useState<CandidateInfo | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('candidateInfo')
    if (raw) setCandidate(JSON.parse(raw))
    localStorage.removeItem('candidateInfo')
    localStorage.removeItem('gradeResult')
    localStorage.removeItem('gradeOverloaded')
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="max-w-lg w-full text-center fade-in">

        {/* Success animation */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-30" />
          <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-indigo-900 mb-2">Bài thi hoàn thành!</h1>
        {candidate && (
          <p className="text-indigo-600 font-medium text-lg mb-4">
            Cảm ơn bạn, <strong>{candidate.fullName}</strong>! 🎉
          </p>
        )}
        <p className="text-gray-600 mb-8 leading-relaxed">
          Tất cả bài làm của bạn đã được lưu lại. Đội ngũ <strong>E-Bridge</strong> sẽ
          xem xét và liên hệ với bạn qua số điện thoại hoặc email đã đăng ký.
        </p>

        {/* Summary card */}
        <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-6 mb-6 text-left">
          <h3 className="font-bold text-gray-700 mb-4 text-sm uppercase tracking-wide">
            Tóm tắt bài thi
          </h3>
          <div className="space-y-3">
            {[
              { icon: '🎤', label: 'Part 1 – Self Introduction', time: '1 phút', type: 'Nói' },
              { icon: '🌏', label: 'Part 2 – Cultural Sharing', time: '1.5 phút', type: 'Nói' },
              { icon: '💬', label: 'Part 3 – Intercultural Discussion', time: '1.5 phút', type: 'Nói' },
              { icon: '🏆', label: 'Part 4 – Leadership Scenario', time: '1.5 phút', type: 'Nói' },
              { icon: '✍️', label: 'Part 5 – Writing Reflection', time: '8 phút', type: 'Viết' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                <span className="text-xl">{item.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">{item.label}</p>
                  <p className="text-xs text-gray-400">{item.type} · {item.time}</p>
                </div>
                <span className="text-green-500 font-bold text-sm">✓</span>
              </div>
            ))}
          </div>
        </div>

        {candidate && (
          <div className="bg-indigo-50 rounded-xl p-4 mb-6 text-sm text-indigo-800 text-left">
            <p className="font-semibold mb-2">📋 Thông tin liên hệ của bạn:</p>
            <p>📞 {candidate.phone}</p>
            <p>📧 {candidate.email}</p>
          </div>
        )}

        {/* Email notification */}
        <div className="rounded-2xl p-5 mb-4 text-left bg-linear-to-r from-indigo-600 to-blue-600">
          <div className="flex items-start gap-3">
            <span className="text-3xl">📧</span>
            <div className="flex-1">
              <h4 className="font-bold text-white mb-1">Kết quả sẽ gửi qua email</h4>
              <p className="text-indigo-200 text-sm leading-relaxed mb-2">
                Hệ thống sẽ chấm điểm bài thi của bạn và gửi kết quả chi tiết về email trong vài giờ.
              </p>
              {candidate?.email && (
                <p className="text-indigo-100 text-xs font-medium">
                  📬 Kết quả gửi về: <strong>{candidate.email}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/')}
          className="text-indigo-500 hover:text-indigo-700 text-sm underline transition"
        >
          Quay về trang chủ
        </button>
      </div>

      <footer className="mt-12 text-center text-xs text-gray-400">
        © 2026 E-Bridge Program · Vietnam – Mongolia Exchange
      </footer>
    </div>
  )
}
