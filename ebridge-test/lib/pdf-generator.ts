import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

let fontBuffer: Buffer | null = null

function loadRobotoFont(): Buffer {
  if (fontBuffer) return fontBuffer
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'Roboto-Regular.ttf')
  fontBuffer = fs.readFileSync(fontPath)
  return fontBuffer
}

const INDIGO = '#4f46e5'
const INDIGO_LIGHT = '#eef2ff'
const DARK = '#1e1b4b'
const GRAY = '#6b7280'
const GRAY_LIGHT = '#f3f4f6'
const GREEN = '#16a34a'
const AMBER = '#d97706'
const RED = '#dc2626'

function scoreColor(score: number, max = 5) {
  const pct = score / max
  return pct >= 0.8 ? GREEN : pct >= 0.6 ? INDIGO : pct >= 0.4 ? AMBER : RED
}

function drawScoreBar(
  doc: PDFKit.PDFDocument,
  x: number, y: number, w: number, h: number,
  score: number, max: number
) {
  doc.rect(x, y, w, h).fillColor('#e5e7eb').fill()
  const filled = (score / max) * w
  doc.rect(x, y, filled, h).fillColor(scoreColor(score, max)).fill()
}

function sectionHeader(doc: PDFKit.PDFDocument, x: number, y: number, w: number, text: string) {
  doc.rect(x, y, w, 22).fillColor(INDIGO).fill()
  doc.fillColor('white').fontSize(10).text(text, x + 8, y + 6)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateGradePDF(
  grades: Record<string, any>,
  candidateInfo: Record<string, any>,
  writing: string
): Promise<Buffer> {
  const font = loadRobotoFont()
  const W = 595.28
  const MARGIN = 45
  const CONTENT_W = W - MARGIN * 2

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: MARGIN, compress: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.registerFont('Roboto', font)
    doc.font('Roboto')

    // ── HEADER ──────────────────────────────────────────
    doc.rect(0, 0, W, 70).fillColor(INDIGO).fill()
    doc.fillColor('white').fontSize(20).text('Glocal IELTS E-Bridge Test', MARGIN, 16)
    doc.fontSize(10).fillColor('#c7d2fe').text('AI Grading Report · E-Bridge Vietnam–Mongolia Exchange Program', MARGIN, 42)

    let y = 85

    // ── CANDIDATE INFO ───────────────────────────────────
    doc.rect(MARGIN, y, CONTENT_W, 50).fillColor(GRAY_LIGHT).fill()
    doc.fillColor(DARK).fontSize(13).text(candidateInfo.fullName || 'Candidate', MARGIN + 10, y + 8)
    doc.fontSize(9).fillColor(GRAY)
      .text(
        `Phone: ${candidateInfo.phone || '—'} · Email: ${candidateInfo.email || '—'} · DOB: ${candidateInfo.dob || '—'} · Country: ${candidateInfo.hometown || '—'}`,
        MARGIN + 10, y + 28
      )
    y += 60

    // ── OVERALL SCORE ────────────────────────────────────
    doc.rect(MARGIN, y, CONTENT_W, 56).fillColor(INDIGO_LIGHT).fill()
    doc.rect(MARGIN, y, 4, 56).fillColor(INDIGO).fill()

    const scoreText = `${grades.overall?.totalScore ?? 0}/100`
    doc.fillColor(INDIGO).fontSize(26).text(scoreText, MARGIN + 14, y + 8)
    const cefrLevel = grades.overall?.cefrLevel || 'B1'
    doc.fontSize(13).fillColor(DARK).text(`CEFR: ${cefrLevel}`, MARGIN + 14, y + 36)

    const summaryText = grades.overall?.summary || ''
    doc.fontSize(9).fillColor(GRAY).text(summaryText, MARGIN + 120, y + 8, { width: CONTENT_W - 130, height: 44 })
    y += 66

    // ── PARTS ────────────────────────────────────────────
    const PARTS = [
      {
        key: 'part1', icon: '1', title: 'Self Introduction',
        criteria: [
          ['Fluency', grades.part1?.fluency],
          ['Pronunciation', grades.part1?.pronunciation],
          ['Vocabulary', grades.part1?.vocabulary],
          ['Grammar', grades.part1?.grammar],
        ],
        total: grades.part1?.total, feedback: grades.part1?.feedback,
      },
      {
        key: 'part2', icon: '2', title: 'Cultural Sharing',
        criteria: [
          ['Content Relevance', grades.part2?.contentRelevance],
          ['Vocabulary', grades.part2?.vocabulary],
          ['Fluency', grades.part2?.fluency],
          ['Grammar', grades.part2?.grammar],
        ],
        total: grades.part2?.total, feedback: grades.part2?.feedback,
      },
      {
        key: 'part3', icon: '3', title: 'Intercultural Discussion',
        criteria: [
          ['Idea Development', grades.part3?.ideaDevelopment],
          ['Communication Clarity', grades.part3?.communicationClarity],
          ['Vocabulary', grades.part3?.vocabulary],
          ['Grammar', grades.part3?.grammar],
        ],
        total: grades.part3?.total, feedback: grades.part3?.feedback,
      },
      {
        key: 'part4', icon: '4', title: 'Leadership Scenario',
        criteria: [
          ['Problem Explanation', grades.part4?.problemExplanation],
          ['Communication Skills', grades.part4?.communicationSkills],
          ['Fluency', grades.part4?.fluency],
          ['Vocabulary', grades.part4?.vocabulary],
        ],
        total: grades.part4?.total, feedback: grades.part4?.feedback,
      },
      {
        key: 'part5', icon: '5', title: `Writing Reflection (${grades.part5?.wordCount ?? 0} words)`,
        criteria: [
          ['Task Response', grades.part5?.taskResponse],
          ['Organization', grades.part5?.organization],
          ['Vocabulary', grades.part5?.vocabulary],
          ['Grammar', grades.part5?.grammar],
        ],
        total: grades.part5?.total, feedback: grades.part5?.feedback,
      },
    ]

    for (const part of PARTS) {
      const partHeight = 120
      if (y + partHeight > 780) { doc.addPage(); y = 40 }

      // Part header
      sectionHeader(doc, MARGIN, y, CONTENT_W, `Part ${part.icon} — ${part.title}    ${part.total ?? 0}/20 pts`)
      y += 26

      // Criteria bars
      const barW = (CONTENT_W / 2) - 10
      const criteria = part.criteria as [string, number][]
      criteria.forEach(([label, score], i) => {
        const col = i % 2
        const row = Math.floor(i / 2)
        const bx = MARGIN + col * (barW + 20)
        const by = y + row * 20
        doc.fillColor(DARK).fontSize(8).text(label, bx, by + 1, { width: 90 })
        drawScoreBar(doc, bx + 95, by + 3, barW - 115, 8, score ?? 0, 5)
        doc.fillColor(scoreColor(score ?? 0)).fontSize(8).text(`${score ?? 0}/5`, bx + barW - 16, by + 1)
      })
      y += 48

      // Feedback
      if (part.feedback) {
        doc.fillColor(GRAY).fontSize(8).text(`Feedback: ${part.feedback}`, MARGIN, y, { width: CONTENT_W })
        const textHeight = doc.heightOfString(part.feedback, { width: CONTENT_W - 50 })
        y += Math.max(textHeight, 12) + 6
      }
      y += 8
    }

    // ── WRITING ─────────────────────────────────────────
    if (writing) {
      if (y + 60 > 780) { doc.addPage(); y = 40 }
      sectionHeader(doc, MARGIN, y, CONTENT_W, 'Writing (Part 5)')
      y += 26
      doc.fillColor(DARK).fontSize(8).text(writing, MARGIN, y, { width: CONTENT_W })
      y += doc.heightOfString(writing, { width: CONTENT_W }) + 16
    }

    // ── STRENGTHS & IMPROVEMENTS ─────────────────────────
    if (y + 80 > 780) { doc.addPage(); y = 40 }
    sectionHeader(doc, MARGIN, y, CONTENT_W, 'Overall Feedback')
    y += 26

    const half = (CONTENT_W / 2) - 6
    doc.rect(MARGIN, y, half, 60).fillColor('#f0fdf4').fill()
    doc.rect(MARGIN + half + 12, y, half, 60).fillColor('#fffbeb').fill()

    doc.fillColor(GREEN).fontSize(9).text('Strengths', MARGIN + 6, y + 4)
    doc.fillColor(DARK).fontSize(8)
      .text(grades.overall?.strengths || '—', MARGIN + 6, y + 16, { width: half - 12, height: 40 })

    doc.fillColor(AMBER).fontSize(9).text('Areas for Improvement', MARGIN + half + 18, y + 4)
    doc.fillColor(DARK).fontSize(8)
      .text(grades.overall?.improvements || '—', MARGIN + half + 18, y + 16, { width: half - 12, height: 40 })

    y += 70

    // ── FOOTER ───────────────────────────────────────────
    const pageCount = (doc as any)._pageBuffer?.length ?? 1
    doc.page.margins.bottom = 20
    doc.fillColor(GRAY).fontSize(7)
      .text(
        `E-Bridge Program · Results generated by Gemini AI · ${new Date().toLocaleDateString('en-US', { timeZone: 'UTC' })}`,
        MARGIN, 815, { width: CONTENT_W, align: 'center' }
      )

    void pageCount
    doc.end()
  })
}
