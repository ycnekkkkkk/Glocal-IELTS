import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { uploadPDF } from '@/lib/gdrive'
import { generateGradePDF } from '@/lib/pdf-generator'

export const runtime = 'nodejs'
export const maxDuration = 60

// Lấy tất cả API keys từ env (bỏ qua key trống)
function getApiKeys(): string[] {
  return [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GEMINI_API_KEY_6,
    process.env.GEMINI_API_KEY_7,
    process.env.GEMINI_API_KEY_8,
    process.env.GEMINI_API_KEY_9,
    process.env.GEMINI_API_KEY_10,
  ].filter((k): k is string => !!k && k.trim() !== '')
}

function isQuotaError(error: unknown): boolean {
  const msg = String(error)
  return (
    msg.includes('429') ||
    msg.includes('quota') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('rate limit') ||
    msg.includes('Too Many Requests')
  )
}

const PART_LABELS: Record<number, string> = {
  1: 'Self Introduction (1 phút)',
  2: 'Cultural Sharing (1.5 phút)',
  3: 'Intercultural Discussion (1.5 phút)',
  4: 'Leadership Scenario (1.5 phút)',
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
async function tryGradeWithAllKeys(contentParts: any[]): Promise<Record<string, any>> {
  const keys = getApiKeys()
  if (keys.length === 0) throw new Error('NO_KEYS')

  let lastError: unknown = null

  for (let i = 0; i < keys.length; i++) {
    try {
      console.log(`[Grade] Thử key ${i + 1}/${keys.length}...`)
      const genAI = new GoogleGenerativeAI(keys[i])
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: 'application/json' },
      })
      const result = await model.generateContent(contentParts)
      const text = result.response.text()
      console.log(`[Grade] Key ${i + 1} thành công`)
      return JSON.parse(text)
    } catch (error) {
      lastError = error
      if (isQuotaError(error)) {
        console.warn(`[Grade] Key ${i + 1} hết quota, thử key tiếp theo...`)
        continue
      }
      // Lỗi khác (không phải quota) → throw ngay
      throw error
    }
  }

  // Tất cả keys đều hết quota
  console.error('[Grade] Tất cả API keys đã hết quota:', lastError)
  throw new Error('ALL_KEYS_EXHAUSTED')
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const folderId = formData.get('folderId') as string
    const writing = formData.get('writing') as string
    const candidateInfo = JSON.parse((formData.get('candidateInfo') as string) || '{}')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const contentParts: any[] = [{ text: buildPrompt(writing) }]

    for (let i = 1; i <= 4; i++) {
      const file = formData.get(`audio_${i}`) as File | null
      contentParts.push({ text: `\n\n=== AUDIO PART ${i} — ${PART_LABELS[i]} ===` })
      if (file && file.size > 100) {
        const buffer = Buffer.from(await file.arrayBuffer())
        contentParts.push({
          inlineData: { data: buffer.toString('base64'), mimeType: 'audio/webm' },
        })
      } else {
        contentParts.push({ text: '[File audio không tồn tại hoặc trống]' })
      }
    }

    const grades = await tryGradeWithAllKeys(contentParts)

    if (folderId) {
      const pdfBuffer = await generateGradePDF(grades, candidateInfo, writing)
      await uploadPDF(folderId, 'ket-qua-cham-diem-ai.pdf', pdfBuffer).catch(console.error)
    }

    return NextResponse.json({ success: true, grades })
  } catch (error) {
    if (String(error).includes('ALL_KEYS_EXHAUSTED') || String(error).includes('NO_KEYS')) {
      return NextResponse.json({ success: false, overloaded: true })
    }
    console.error('Grade error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
