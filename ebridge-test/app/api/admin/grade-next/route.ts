import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import nodemailer from 'nodemailer'
import {
  getOrCreateSubfolder, listFilesInFolder, downloadFile,
  deleteFile, findAudioInFolder, uploadPDF, uploadJson,
} from '@/lib/gdrive'
import { generateGradePDF } from '@/lib/pdf-generator'

export const runtime = 'nodejs'
export const maxDuration = 120

function checkAuth(req: NextRequest): boolean {
  const pwd = req.headers.get('x-admin-password')
  return !!process.env.ADMIN_PASSWORD && pwd === process.env.ADMIN_PASSWORD
}

function getApiKeys(extraKey?: string): string[] {
  const envKeys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
  ].filter((k): k is string => !!k && k.trim() !== '')
  if (extraKey?.trim()) return [...envKeys, extraKey.trim()]
  return envKeys
}

function isQuotaError(e: unknown): boolean {
  const m = String(e)
  return m.includes('429') || m.includes('quota') || m.includes('RESOURCE_EXHAUSTED') || m.includes('Too Many Requests')
}

const PART_LABELS: Record<number, string> = {
  1: 'Self Introduction (1 phút)',
  2: 'Cultural Sharing (1.5 phút)',
  3: 'Intercultural Discussion (1.5 phút)',
  4: 'Leadership Scenario (1.5 phút)',
}

const AUDIO_BASE_NAMES: Record<number, string> = {
  1: 'part1-self-introduction',
  2: 'part2-cultural-sharing',
  3: 'part3-intercultural-discussion',
  4: 'part4-leadership-scenario',
}

function mimeFromName(name: string): string {
  if (name.endsWith('.mp4') || name.endsWith('.m4a')) return 'audio/mp4'
  if (name.endsWith('.ogg')) return 'audio/ogg'
  return 'audio/webm'
}

function buildPrompt(writing: string): string {
  return `Bạn là giám khảo chấm bài thi tiếng Anh cho chương trình trao đổi E-Bridge Vietnam–Mongolia.
Tôi sẽ cung cấp cho bạn 4 file audio (Part 1–4) và 1 bài viết (Part 5). Hãy nghe audio và chấm điểm theo rubric.

═══ CÂU HỎI & RUBRIC ═══

PART 1 — Self Introduction (1 phút, nói)
Câu hỏi: "Please introduce yourself to the E-Bridge participants. Include: your name and city, your background (student/professional/entrepreneur), why you joined E-Bridge, what you want to learn from Vietnamese and Mongolian participants."
Rubric:
  • Fluency (0–5): Nói liên tục, không ngập ngừng quá nhiều
  • Pronunciation (0–5): Phát âm dễ nghe, dễ hiểu
  • Vocabulary (0–5): Từ vựng cơ bản về bản thân & mục tiêu
  • Grammar (0–5): Cấu trúc câu đơn giản nhưng đúng

PART 2 — Cultural Sharing (1.5 phút, nói)
Câu hỏi: "If you meet a participant from Mongolia/Vietnam for the first time, what cultural experience from your country would you like to introduce? Explain why it represents your culture."
Rubric:
  • Content Relevance (0–5): Đúng chủ đề văn hóa, có giải thích
  • Vocabulary (0–5): Từ vựng về ẩm thực/lễ hội/lối sống
  • Fluency (0–5): Nói trôi chảy
  • Grammar (0–5): Câu văn rõ nghĩa

PART 3 — Intercultural Discussion (1.5 phút, nói)
Câu hỏi: "What cultural differences might Vietnamese and Mongolian people notice when interacting for the first time? How can people respect and understand these differences?"
Rubric:
  • Idea Development (0–5): Giải thích ý rõ ràng, có dẫn chứng
  • Communication Clarity (0–5): Ý tứ mạch lạc, dễ hiểu
  • Vocabulary (0–5): Từ vựng về xã hội/văn hóa
  • Grammar (0–5): Cấu trúc câu phù hợp

PART 4 — Leadership Scenario (1.5 phút, nói)
Câu hỏi: "Imagine you are working in a Vietnam–Mongolia team. Your team must organize a cultural activity. What would you do to communicate effectively and make your team successful?"
Rubric:
  • Problem Explanation (0–5): Giải thích cách tiếp cận rõ ràng
  • Communication Skills (0–5): Diễn đạt logic, thuyết phục
  • Fluency (0–5): Nói tự nhiên, tự tin
  • Vocabulary (0–5): Từ vựng teamwork/leadership

PART 5 — Writing Reflection (8 phút, 120–150 từ)
Câu hỏi: "Why are international exchange programs like E-Bridge important for young people? Write about cultural understanding and leadership development."
Rubric:
  • Task Response (0–5): Trả lời đúng câu hỏi
  • Organization (0–5): Bố cục đoạn văn rõ ràng (mở, thân, kết)
  • Vocabulary (0–5): Từ vựng cơ bản nhưng phù hợp
  • Grammar (0–5): Câu văn hiểu được, ít lỗi

PART 5 WRITING:
"${writing || '[Không có bài viết]'}"

═══ YÊU CẦU ═══
- Nghe kỹ từng audio (Part 1–4) và chấm điểm dựa trên nội dung NGHE được.
- Đếm số từ Part 5.
- Nếu audio trống hoặc im lặng hoàn toàn → cho 0 điểm tất cả tiêu chí.
- Nhận xét (feedback) viết bằng TIẾNG VIỆT, ngắn gọn 2–3 câu mỗi part.
- summary, strengths, improvements viết bằng TIẾNG VIỆT.
- Trả về CHỈ JSON hợp lệ, không markdown, không text thêm.

FORMAT JSON:
{
  "part1": { "fluency": 0, "pronunciation": 0, "vocabulary": 0, "grammar": 0, "total": 0, "feedback": "..." },
  "part2": { "contentRelevance": 0, "vocabulary": 0, "fluency": 0, "grammar": 0, "total": 0, "feedback": "..." },
  "part3": { "ideaDevelopment": 0, "communicationClarity": 0, "vocabulary": 0, "grammar": 0, "total": 0, "feedback": "..." },
  "part4": { "problemExplanation": 0, "communicationSkills": 0, "fluency": 0, "vocabulary": 0, "total": 0, "feedback": "..." },
  "part5": { "taskResponse": 0, "organization": 0, "vocabulary": 0, "grammar": 0, "total": 0, "wordCount": 0, "feedback": "..." },
  "overall": { "totalScore": 0, "maxScore": 100, "percentage": 0, "cefrLevel": "A1", "summary": "...", "strengths": "...", "improvements": "..." }
}`
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gradeWithGemini(contentParts: any[], extraKey?: string): Promise<Record<string, any>> {
  const keys = getApiKeys(extraKey)
  if (keys.length === 0) throw new Error('NO_KEYS')
  let lastError: unknown = null
  for (let i = 0; i < keys.length; i++) {
    try {
      const genAI = new GoogleGenerativeAI(keys[i])
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      })
      const result = await model.generateContent(contentParts)
      return JSON.parse(result.response.text())
    } catch (e) {
      lastError = e
      if (isQuotaError(e)) continue
      throw e
    }
  }
  throw new Error(`ALL_KEYS_EXHAUSTED: ${lastError}`)
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

  return `
<!DOCTYPE html>
<html lang="vi">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<div style="max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
  <div style="background:linear-gradient(135deg,#4f46e5,#2563eb);padding:32px 32px 24px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">Kết quả bài thi</h1>
    <p style="color:#c7d2fe;margin:6px 0 0;">Glocal IELTS E-Bridge Test</p>
  </div>
  <div style="padding:28px 32px;">
    <p style="color:#374151;font-size:15px;">Xin chào <strong>${candidateInfo.fullName}</strong>,</p>
    <p style="color:#6b7280;font-size:14px;line-height:1.6;">
      Bài thi của bạn đã được chấm điểm bởi AI. Dưới đây là kết quả chi tiết.
    </p>

    <div style="background:#eef2ff;border-radius:12px;padding:20px 24px;margin:20px 0;text-align:center;">
      <div style="font-size:42px;font-weight:700;color:#3730a3;">${total}<span style="font-size:20px;color:#6366f1;">/100</span></div>
      <div style="font-size:16px;color:#4f46e5;font-weight:600;margin-top:4px;">Trình độ CEFR: ${cefr}</div>
    </div>

    <table style="width:100%;border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e0e7ff;">
      <thead>
        <tr style="background:#f5f3ff;">
          <th style="padding:10px 12px;text-align:left;font-size:13px;color:#6b7280;">Phần thi</th>
          <th style="padding:10px 12px;text-align:center;font-size:13px;color:#6b7280;">Điểm</th>
        </tr>
      </thead>
      <tbody>${partRows}</tbody>
    </table>

    ${summary ? `<div style="margin-top:20px;"><p style="font-weight:600;color:#374151;margin:0 0 6px;">Nhận xét tổng quát:</p><p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">${summary}</p></div>` : ''}
    ${strengths ? `<div style="margin-top:14px;"><p style="font-weight:600;color:#059669;margin:0 0 6px;">✅ Điểm mạnh:</p><p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">${strengths}</p></div>` : ''}
    ${improvements ? `<div style="margin-top:14px;"><p style="font-weight:600;color:#d97706;margin:0 0 6px;">📈 Cần cải thiện:</p><p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0;">${improvements}</p></div>` : ''}

    <p style="font-size:13px;color:#9ca3af;margin-top:24px;">
      File PDF kết quả chi tiết được đính kèm trong email này.
    </p>
  </div>
  <div style="background:#f9fafb;padding:16px 32px;text-align:center;border-top:1px solid #e5e7eb;">
    <p style="color:#9ca3af;font-size:12px;margin:0;">© 2026 Glocal IELTS E-Bridge · Vietnam – Mongolia Exchange</p>
  </div>
</div>
</body>
</html>`
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json().catch(() => ({}))
    const { fileId: targetFileId, extraApiKey } = body as { fileId?: string; extraApiKey?: string }

    const queueFolderId = await getOrCreateSubfolder(
      process.env.GOOGLE_DRIVE_FOLDER_ID!,
      '_queue'
    )
    const files = await listFilesInFolder(queueFolderId)

    if (files.length === 0) {
      return NextResponse.json({ success: true, done: true, message: 'Hàng đợi đã trống' })
    }

    // Pick specific file by id, or default to first in queue
    const queueFile = targetFileId
      ? (files.find(f => f.id === targetFileId) ?? files[0])
      : files[0]

    const queueBuf = await downloadFile(queueFile.id)
    const { candidateInfo, writing, folderId } = JSON.parse(queueBuf.toString('utf-8'))

    // Build Gemini content parts
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentParts: any[] = [{ text: buildPrompt(writing) }]
    for (let i = 1; i <= 4; i++) {
      contentParts.push({ text: `\n\n=== AUDIO PART ${i} — ${PART_LABELS[i]} ===` })
      if (folderId) {
        const audioFile = await findAudioInFolder(folderId, AUDIO_BASE_NAMES[i])
        if (audioFile) {
          const audioBuf = await downloadFile(audioFile.id)
          const mimeType = mimeFromName(audioFile.name)
          contentParts.push({ inlineData: { data: audioBuf.toString('base64'), mimeType } })
        } else {
          contentParts.push({ text: '[File audio không tồn tại hoặc trống]' })
        }
      } else {
        contentParts.push({ text: '[Không có folderId]' })
      }
    }

    let grades: Record<string, unknown>
    try {
      grades = await gradeWithGemini(contentParts, extraApiKey)
    } catch (gradeError) {
      const isQuota = String(gradeError).includes('ALL_KEYS_EXHAUSTED') || String(gradeError).includes('NO_KEYS')
      return NextResponse.json({
        success: false,
        quotaExhausted: isQuota,
        error: String(gradeError),
        fileId: queueFile.id,
        candidate: candidateInfo?.fullName,
      }, { status: isQuota ? 429 : 500 })
    }

    // Generate PDF & upload to Drive
    let savedToDrive = false
    if (folderId) {
      try {
        const pdfBuffer = await generateGradePDF(grades, candidateInfo, writing)
        await uploadPDF(folderId, 'ket-qua-cham-diem-ai.pdf', pdfBuffer)
        savedToDrive = true
      } catch (pdfErr) {
        console.error('PDF/Drive error:', pdfErr)
      }
    }

    // Send email via Gmail SMTP
    let emailSent = false
    const recipientEmail = candidateInfo?.email
    if (recipientEmail && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const pdfBuffer = await generateGradePDF(grades, candidateInfo, writing)
        const transporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
          },
        })
        await transporter.sendMail({
          from: `"Glocal IELTS E-Bridge" <${process.env.GMAIL_USER}>`,
          to: recipientEmail,
          subject: `Kết quả bài thi Glocal IELTS E-Bridge Test — ${candidateInfo.fullName}`,
          html: buildEmailHtml(candidateInfo, grades),
          attachments: [{ filename: 'ket-qua-cham-diem.pdf', content: pdfBuffer }],
        })
        emailSent = true
      } catch (emailErr) {
        console.error('Email error:', emailErr)
      }
    }

    // Remove from queue
    await deleteFile(queueFile.id)

    // Save to _graded/ history folder in Drive
    const gradedAt = new Date().toISOString()
    const historyRecord = { candidateInfo, grades, writing, folderId, gradedAt, emailSent, savedToDrive }
    try {
      const gradedFolderId = await getOrCreateSubfolder(process.env.GOOGLE_DRIVE_FOLDER_ID!, '_graded')
      const ts = Date.now()
      const phone = (candidateInfo?.phone as string || 'unknown').replace(/\s/g, '')
      await uploadJson(gradedFolderId, `${ts}-${phone}.json`, historyRecord)
    } catch (histErr) {
      console.error('History save error:', histErr)
    }

    return NextResponse.json({
      success: true,
      done: false,
      remaining: files.length - 1,
      fileId: queueFile.id,
      candidate: candidateInfo?.fullName,
      score: grades.overall ? (grades.overall as Record<string, unknown>).totalScore : 0,
      cefr: grades.overall ? (grades.overall as Record<string, unknown>).cefrLevel : '—',
      emailSent,
      savedToDrive,
      grades,
      candidateInfo,
      writing,
      folderId,
      gradedAt,
    })
  } catch (error) {
    console.error('Grade-next error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
