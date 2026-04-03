'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CandidateInfo } from '@/lib/types'

const countries = [
  'Mongolia', 'Vietnam', 'United States', 'United Kingdom', 'Australia', 'Canada',
  'Japan', 'South Korea', 'China', 'India', 'Thailand', 'Indonesia',
  'Philippines', 'Malaysia', 'Singapore', 'Germany', 'France', 'Netherlands',
  'Spain', 'Italy', 'Russia', 'Brazil', 'Mexico', 'Argentina',
  'South Africa', 'Egypt', 'Nigeria', 'Kenya', 'Saudi Arabia', 'UAE',
  'Other',
]

type FormData = Omit<CandidateInfo, 'submittedAt'>
type FormErrors = Partial<Record<keyof FormData, string>>

export default function RegistrationPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormData>({
    fullName: '',
    phone: '',
    email: '',
    dob: '',
    hometown: '',
    occupation: '',
    organization: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [agreed, setAgreed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const set = (field: keyof FormData, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }))
  }

  const validate = (): FormErrors => {
    const e: FormErrors = {}
    if (!form.fullName.trim()) e.fullName = 'Please enter your full name'
    if (!form.phone.trim()) e.phone = 'Please enter your phone number'
    else if (!/^[\d\s+()-]{9,15}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Invalid phone number'
    if (!form.email.trim()) e.email = 'Please enter your email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email'
    if (!form.dob) e.dob = 'Please select your date of birth'
    if (!form.hometown) e.hometown = 'Please select your country/region'
    if (!form.occupation) e.occupation = 'Please select your occupation'
    return e
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    if (!agreed) { alert('Please agree to the terms before continuing.'); return }

    setSubmitting(true)
    const info: CandidateInfo = { ...form, submittedAt: new Date().toISOString() }
    localStorage.setItem('candidateInfo', JSON.stringify(info))
    router.push('/test')
  }

  const inputCls = (field: keyof FormData) =>
    `w-full px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base rounded-lg sm:rounded-xl border bg-white text-gray-800 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
      errors[field]
        ? 'border-red-400 focus:border-red-400'
        : 'border-gray-200 focus:border-indigo-500'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-indigo-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <img src="/logo-glocal-ielts.png" alt="Glocal IELTS" className="h-9 sm:h-11 w-auto object-contain shrink-0" />
            <img src="/logo-ag.png" alt="Amazing Group" className="h-12 sm:h-14 w-auto object-contain shrink-0" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm sm:text-lg font-bold text-indigo-900 leading-tight">Glocal IELTS E-Bridge Test</h1>
            <p className="text-xs text-indigo-400 mt-0.5">Speaking & Writing Assessment</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-3 sm:px-4 py-4 sm:py-8">
        {/* Hero */}
        <div className="text-center mb-6 sm:mb-8 fade-in">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full mb-3 sm:mb-4">
            <span className="w-2 h-2 bg-indigo-500 rounded-full shrink-0"></span>
            E-Bridge English Assessment
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-indigo-900 mb-2 sm:mb-3">Candidate Information</h2>
          <p className="text-sm text-gray-500 max-w-xl mx-auto">
            Your information will be kept confidential and used only for post-test contact.
            Please fill in completely and accurately.
          </p>
        </div>

        {/* Test Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3 mb-6 sm:mb-8 fade-in">
          {[
            { part: 1, name: 'Self Intro', time: '1 min', icon: '🎤' },
            { part: 2, name: 'Cultural Sharing', time: '1.5 min', icon: '🌏' },
            { part: 3, name: 'Discussion', time: '1.5 min', icon: '💬' },
            { part: 4, name: 'Leadership', time: '1.5 min', icon: '🏆' },
            { part: 5, name: 'Writing', time: '8 min', icon: '✍️' },
          ].map(p => (
            <div key={p.part} className="bg-white rounded-xl p-3 text-center border border-indigo-100 shadow-sm">
              <div className="text-2xl mb-1">{p.icon}</div>
              <div className="text-xs font-bold text-indigo-700">Part {p.part}</div>
              <div className="text-xs text-gray-500 mt-0.5">{p.name}</div>
              <div className="text-xs text-indigo-500 mt-1 font-medium">{p.time}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-4 sm:p-6 md:p-8 fade-in">
          <h3 className="text-base sm:text-xl font-bold text-gray-800 mb-4 pb-3 border-b border-gray-100">
            Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            {/* Full Name */}
            <div className="col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                placeholder="John Smith"
                className={inputCls('fullName')}
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+1 234 567 8900"
                className={inputCls('phone')}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="example@gmail.com"
                className={inputCls('email')}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* DOB */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Date of Birth <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={form.dob}
                onChange={e => set('dob', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className={inputCls('dob')}
              />
              {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob}</p>}
            </div>

            {/* Country/Region */}
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Country / Region <span className="text-red-500">*</span>
              </label>
              <select
                value={form.hometown}
                onChange={e => set('hometown', e.target.value)}
                className={inputCls('hometown')}
              >
                <option value="">-- Select --</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.hometown && <p className="text-red-500 text-xs mt-1">{errors.hometown}</p>}
            </div>

            {/* Occupation */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                Occupation <span className="text-red-500">*</span>
              </label>
              <select
                value={form.occupation}
                onChange={e => set('occupation', e.target.value)}
                className={inputCls('occupation')}
              >
                <option value="">-- Select --</option>
                <option value="Student">Student</option>
                <option value="Employee">Employee</option>
                <option value="Entrepreneur">Entrepreneur</option>
                <option value="Teacher / Lecturer">Teacher / Lecturer</option>
                <option value="Other">Other</option>
              </select>
              {errors.occupation && <p className="text-red-500 text-xs mt-1">{errors.occupation}</p>}
            </div>

            {/* Organization */}
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1 sm:mb-2">
                School / Organization <span className="text-gray-400 font-normal text-xs">(optional)</span>
              </label>
              <input
                type="text"
                value={form.organization}
                onChange={e => set('organization', e.target.value)}
                placeholder="School or workplace name"
                className={inputCls('organization')}
              />
            </div>
          </div>

          {/* Consent */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 sm:w-5 sm:h-5 rounded border-indigo-300 text-indigo-600 accent-indigo-600 cursor-pointer shrink-0"
              />
              <span className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                I agree to allow the <strong>E-Bridge Program</strong> to store my personal information,
                recordings and written responses for assessment purposes and post-test contact.
                My information will be kept confidential and not shared with third parties.
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-4 sm:mt-6 w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-base sm:text-lg py-3.5 sm:py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                Start Test
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </form>
      </main>

      <footer className="text-center py-4 text-xs text-gray-400">
        © 2026 E-Bridge Program · Vietnam – Mongolia Exchange
      </footer>
    </div>
  )
}
