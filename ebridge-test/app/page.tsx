'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { CandidateInfo } from '@/lib/types'

const provinces = [
  'An Giang', 'Bà Rịa - Vũng Tàu', 'Bắc Giang', 'Bắc Kạn', 'Bạc Liêu', 'Bắc Ninh',
  'Bến Tre', 'Bình Định', 'Bình Dương', 'Bình Phước', 'Bình Thuận', 'Cà Mau',
  'Cần Thơ', 'Cao Bằng', 'Đà Nẵng', 'Đắk Lắk', 'Đắk Nông', 'Điện Biên',
  'Đồng Nai', 'Đồng Tháp', 'Gia Lai', 'Hà Giang', 'Hà Nam', 'Hà Nội',
  'Hà Tĩnh', 'Hải Dương', 'Hải Phòng', 'Hậu Giang', 'Hòa Bình', 'Hưng Yên',
  'Khánh Hòa', 'Kiên Giang', 'Kon Tum', 'Lai Châu', 'Lâm Đồng', 'Lạng Sơn',
  'Lào Cai', 'Long An', 'Nam Định', 'Nghệ An', 'Ninh Bình', 'Ninh Thuận',
  'Phú Thọ', 'Phú Yên', 'Quảng Bình', 'Quảng Nam', 'Quảng Ngãi', 'Quảng Ninh',
  'Quảng Trị', 'Sóc Trăng', 'Sơn La', 'Tây Ninh', 'Thái Bình', 'Thái Nguyên',
  'Thanh Hóa', 'Thừa Thiên Huế', 'Tiền Giang', 'TP. Hồ Chí Minh', 'Trà Vinh',
  'Tuyên Quang', 'Vĩnh Long', 'Vĩnh Phúc', 'Yên Bái',
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
    if (!form.fullName.trim()) e.fullName = 'Vui lòng nhập họ và tên'
    if (!form.phone.trim()) e.phone = 'Vui lòng nhập số điện thoại'
    else if (!/^(0|\+84)[0-9]{9,10}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Số điện thoại không hợp lệ'
    if (!form.email.trim()) e.email = 'Vui lòng nhập email'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Email không hợp lệ'
    if (!form.dob) e.dob = 'Vui lòng chọn ngày sinh'
    if (!form.hometown) e.hometown = 'Vui lòng chọn tỉnh/thành'
    if (!form.occupation) e.occupation = 'Vui lòng chọn nghề nghiệp'
    return e
  }

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    if (!agreed) { alert('Vui lòng đồng ý với điều khoản trước khi tiếp tục.'); return }

    setSubmitting(true)
    const info: CandidateInfo = { ...form, submittedAt: new Date().toISOString() }
    localStorage.setItem('candidateInfo', JSON.stringify(info))
    router.push('/test')
  }

  const inputCls = (field: keyof FormData) =>
    `w-full px-4 py-3 rounded-xl border-2 bg-white text-gray-800 placeholder-gray-400 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-300 ${
      errors[field]
        ? 'border-red-400 focus:border-red-400'
        : 'border-gray-200 focus:border-indigo-500'
    }`

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-indigo-100 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="flex items-center gap-0">
            <img src="/logo-ag.png" alt="Logo AG" className="h-10 w-auto object-contain" />
            <img src="/logo-gi.png" alt="Logo GI" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-indigo-900 leading-none">Glocal IELTS E-Bridge Test</h1>
            <p className="text-xs text-indigo-400 mt-0.5">Speaking & Writing Assessment</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8 fade-in">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-sm font-medium px-4 py-2 rounded-full mb-4">
            <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
            Bài kiểm tra Tiếng Anh E-Bridge
          </div>
          <h2 className="text-3xl font-bold text-indigo-900 mb-3">Điền thông tin thí sinh</h2>
          <p className="text-gray-500 max-w-xl mx-auto">
            Thông tin của bạn sẽ được bảo mật và chỉ dùng để liên hệ sau bài kiểm tra.
            Vui lòng điền đầy đủ và chính xác.
          </p>
        </div>

        {/* Test Overview */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8 fade-in">
          {[
            { part: 1, name: 'Self Intro', time: '1 phút', icon: '🎤' },
            { part: 2, name: 'Cultural Sharing', time: '1.5 phút', icon: '🌏' },
            { part: 3, name: 'Discussion', time: '1.5 phút', icon: '💬' },
            { part: 4, name: 'Leadership', time: '1.5 phút', icon: '🏆' },
            { part: 5, name: 'Writing', time: '8 phút', icon: '✍️' },
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
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg border border-indigo-100 p-6 md:p-8 fade-in">
          <h3 className="text-xl font-bold text-gray-800 mb-6 pb-4 border-b border-gray-100">
            Thông tin cá nhân
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
                placeholder="Nguyễn Văn A"
                className={inputCls('fullName')}
              />
              {errors.fullName && <p className="text-red-500 text-xs mt-1">{errors.fullName}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Số điện thoại <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="0901 234 567"
                className={inputCls('phone')}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Gmail / Email <span className="text-red-500">*</span>
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ngày tháng năm sinh <span className="text-red-500">*</span>
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

            {/* Hometown */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Quê quán / Tỉnh thành <span className="text-red-500">*</span>
              </label>
              <select
                value={form.hometown}
                onChange={e => set('hometown', e.target.value)}
                className={inputCls('hometown')}
              >
                <option value="">-- Chọn tỉnh/thành --</option>
                {provinces.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              {errors.hometown && <p className="text-red-500 text-xs mt-1">{errors.hometown}</p>}
            </div>

            {/* Occupation */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nghề nghiệp <span className="text-red-500">*</span>
              </label>
              <select
                value={form.occupation}
                onChange={e => set('occupation', e.target.value)}
                className={inputCls('occupation')}
              >
                <option value="">-- Chọn nghề nghiệp --</option>
                <option value="Học sinh / Sinh viên">Học sinh / Sinh viên</option>
                <option value="Nhân viên / Viên chức">Nhân viên / Viên chức</option>
                <option value="Doanh nhân">Doanh nhân</option>
                <option value="Giáo viên / Giảng viên">Giáo viên / Giảng viên</option>
                <option value="Khác">Khác</option>
              </select>
              {errors.occupation && <p className="text-red-500 text-xs mt-1">{errors.occupation}</p>}
            </div>

            {/* Organization */}
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Trường / Tổ chức <span className="text-gray-400 font-normal">(không bắt buộc)</span>
              </label>
              <input
                type="text"
                value={form.organization}
                onChange={e => set('organization', e.target.value)}
                placeholder="Tên trường hoặc nơi làm việc"
                className={inputCls('organization')}
              />
            </div>
          </div>

          {/* Consent */}
          <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-5 h-5 rounded border-indigo-300 text-indigo-600 accent-indigo-600 cursor-pointer"
              />
              <span className="text-sm text-gray-700 leading-relaxed">
                Tôi đồng ý cho <strong>E-Bridge Program</strong> lưu trữ thông tin cá nhân,
                bài nói và bài viết của tôi để phục vụ mục đích đánh giá và liên hệ sau kiểm tra.
                Thông tin sẽ được bảo mật và không chia sẻ cho bên thứ ba.
              </span>
            </label>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold text-lg py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Đang xử lý...
              </>
            ) : (
              <>
                Bắt đầu bài kiểm tra
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
