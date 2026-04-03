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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-indigo-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-2.5 sm:py-3 flex items-center gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <img src="/logo-glocal-ielts.png" alt="Glocal IELTS" className="h-8 sm:h-10 w-auto object-contain shrink-0" />
            <img src="/logo-ag.png" alt="Amazing Group" className="h-11 sm:h-13 w-auto object-contain shrink-0" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-indigo-900 leading-tight">Glocal IELTS E-Bridge Test</h1>
            <p className="text-xs text-indigo-400 hidden sm:block">Speaking & Writing Assessment</p>
          </div>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-3 sm:px-4 py-8">
      <div className="max-w-lg w-full text-center fade-in">

        {/* Success animation */}
        <div className="relative inline-flex items-center justify-center mb-4 sm:mb-6">
          <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-30" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 bg-linear-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-xl">
            <svg className="w-10 h-10 sm:w-12 sm:h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-indigo-900 mb-2">Test Completed!</h1>
        {candidate && (
          <p className="text-indigo-600 font-medium text-base sm:text-lg mb-3 sm:mb-4">
            Thank you, <strong>{candidate.fullName}</strong>! 🎉
          </p>
        )}
        <p className="text-sm sm:text-base text-gray-600 mb-5 sm:mb-8 leading-relaxed">
          All your answers have been saved. The <strong>E-Bridge</strong> team will
          review and contact you via the phone number or email you provided.
        </p>

        {/* Summary card */}
        <div className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-4 sm:p-6 mb-4 sm:mb-6 text-left">
          <h3 className="font-bold text-gray-700 mb-3 text-xs sm:text-sm uppercase tracking-wide">
            Test Summary
          </h3>
          <div className="space-y-1.5 sm:space-y-3">
            {[
              { icon: '🎤', label: 'Self Introduction', part: 1, time: '1 min', type: 'Speaking' },
              { icon: '🌏', label: 'Cultural Sharing', part: 2, time: '1.5 min', type: 'Speaking' },
              { icon: '💬', label: 'Intercultural Discussion', part: 3, time: '1.5 min', type: 'Speaking' },
              { icon: '🏆', label: 'Leadership Scenario', part: 4, time: '1.5 min', type: 'Speaking' },
              { icon: '✍️', label: 'Writing Reflection', part: 5, time: '8 min', type: 'Writing' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-2.5 py-1.5 sm:py-2 border-b border-gray-100 last:border-0">
                <span className="text-lg sm:text-xl shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-700">
                    <span className="text-indigo-500 font-semibold">P{item.part}</span> – {item.label}
                  </p>
                  <p className="text-xs text-gray-400">{item.type} · {item.time}</p>
                </div>
                <span className="text-green-500 font-bold text-sm shrink-0">✓</span>
              </div>
            ))}
          </div>
        </div>

        {candidate && (
          <div className="bg-indigo-50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 text-xs sm:text-sm text-indigo-800 text-left">
            <p className="font-semibold mb-1.5">📋 Your contact information:</p>
            <p>📞 {candidate.phone}</p>
            <p className="truncate">📧 {candidate.email}</p>
          </div>
        )}

        {/* Email notification */}
        <div className="rounded-2xl p-4 sm:p-5 mb-4 text-left bg-linear-to-r from-indigo-600 to-blue-600">
          <div className="flex items-start gap-2.5 sm:gap-3">
            <span className="text-2xl sm:text-3xl shrink-0">📧</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-white mb-1 text-sm sm:text-base">Results will be sent by email</h4>
              <p className="text-indigo-200 text-xs sm:text-sm leading-relaxed mb-2">
                The system will grade your test and send detailed results to your email within a few hours.
              </p>
              {candidate?.email && (
                <p className="text-indigo-100 text-xs font-medium truncate">
                  📬 Sending to: <strong>{candidate.email}</strong>
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => router.push('/')}
          className="text-indigo-500 hover:text-indigo-700 text-sm underline transition"
        >
          Back to Home
        </button>
      </div>

      <footer className="mt-8 sm:mt-12 text-center text-xs text-gray-400">
        © 2026 E-Bridge Program · Vietnam – Mongolia Exchange
      </footer>
    </div>

    </div>
  )
}
