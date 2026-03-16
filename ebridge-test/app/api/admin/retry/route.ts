import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { uploadPDF } from '@/lib/gdrive'
import { generateGradePDF } from '@/lib/pdf-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

function checkAuth(req: NextRequest): boolean {
  const pwd = req.headers.get('x-admin-password')
  return !!process.env.ADMIN_PASSWORD && pwd === process.env.ADMIN_PASSWORD
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildEmailHtml(candidateInfo: any, grades: any): string {
  const cefr = grades.overall?.cefrLevel ?? '—'
  const total = grades.overall?.totalScore ?? 0
  const summary = grades.overall?.summary ?? ''
  const strengths = grades.overall?.strengths ?? ''
  const improvements = grades.overall?.improvements ?? ''

  const partRows = [
    ['Part 1 – Self Introduction', grades.part1?.total ?? 0],
    ['Part 2 – Cultural Sharing', grades.part2?.total ?? 0],
    ['Part 3 – Intercultural Discussion', grades.part3?.total ?? 0],
    ['Part 4 – Leadership Scenario', grades.part4?.total ?? 0],
    ['Part 5 – Writing Reflection', grades.part5?.total ?? 0],
  ]
    .map(([label, score]) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e7ff;">${label}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e0e7ff;text-align:center;font-weight:600;color:#3730a3;">${score}/20</td>
      </tr>`)
    .join('')

  return `<!DOCTYPE html>
<html lang="vi">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#4f46e5,#2563eb);padding:32px 32px 24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Kết quả bài thi</h1>
    <p style="color:#c7d2fe;margin:6px 0 0;">Glocal IELTS E-Bridge Test</p>
  </div>
  <div style="padding:28px 32px;">
    <p style="color:#374151;font-size:15px;">Xin chào <strong>${candidateInfo.fullName}</strong>,</p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;">Bài thi của bạn đã được chấm điểm bởi AI. Dưới đây là kết quả chi tiết.</p>
    <div style="background:#eef2ff;border-radius:12px;padding:20px 24px;margin:20px 0;text-align:center;">
      <div style="font-size:42px;font-weight:700;color:#3730a3;">${total}<span style="font-size:20px;color:#6366f1;">/100</span></div>
      <div style="font-size:16px;color:#4f46e5;font-weight:600;margin-top:4px;">Trình độ CEFR: ${cefr}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e0e7ff;">
      <thead><tr style="background:#f5f3ff;">
        <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;">Phần thi</th>
        <th style="padding:10px 12px;text-align:center;font-size:13px;color:#6b7280;">Điểm</th>
      </tr></thead>
      <tbody>${partRows}</tbody>
    </table>
    ${summary ? `<div style="margin-top:20px;"><p style="font-weight:600;color:#374151;margin:0 0 6px;">Nhận xét tổng quát:</p><p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">${summary}</p></div>` : ''}
    ${strengths ? `<div style="margin-top:14px;"><p style="font-weight:600;color:#059669;margin:0 0 6px;">✅ Điểm mạnh:</p><p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">${strengths}</p></div>` : ''}
    ${improvements ? `<div style="margin-top:14px;"><p style="font-weight:600;color:#d97706;margin:0 0 6px;">📈 Cần cải thiện:</p><p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">${improvements}</p></div>` : ''}
    <p style="font-size:13px;color:#9ca3af;margin-top:24px;">File PDF kết quả chi tiết được đính kèm trong email này.</p>
  </div>
  <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 Glocal IELTS E-Bridge · Vietnam – Mongolia Exchange</p>
  </div>
</div>
</body></html>`
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { action, candidateInfo, grades, writing, folderId } = await req.json()

    const pdfBuffer = await generateGradePDF(grades, candidateInfo, writing || '')

    if (action === 'drive') {
      if (!folderId) return NextResponse.json({ success: false, error: 'Thiếu folderId' }, { status: 400 })
      await uploadPDF(folderId, 'ket-qua-cham-diem-ai.pdf', pdfBuffer)
      return NextResponse.json({ success: true, action: 'drive' })
    }

    if (action === 'email') {
      const recipientEmail = candidateInfo?.email
      if (!recipientEmail) return NextResponse.json({ success: false, error: 'Không có email' }, { status: 400 })
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return NextResponse.json({ success: false, error: 'Chưa cấu hình Gmail' }, { status: 400 })
      }
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', port: 465, secure: true,
        auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
      })
      await transporter.sendMail({
        from: `"Glocal IELTS E-Bridge" <${process.env.GMAIL_USER}>`,
        to: recipientEmail,
        subject: `Kết quả bài thi Glocal IELTS E-Bridge Test — ${candidateInfo.fullName}`,
        html: buildEmailHtml(candidateInfo, grades),
        attachments: [{ filename: 'ket-qua-cham-diem.pdf', content: pdfBuffer }],
      })
      return NextResponse.json({ success: true, action: 'email' })
    }

    return NextResponse.json({ success: false, error: 'action không hợp lệ' }, { status: 400 })
  } catch (error) {
    console.error('Retry error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
