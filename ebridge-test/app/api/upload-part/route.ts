import { NextRequest, NextResponse } from 'next/server'
import { uploadAudio, uploadText } from '@/lib/gdrive'

export const runtime = 'nodejs'
export const maxDuration = 30

const PART_NAMES: Record<string, string> = {
  '1': 'part1-self-introduction.webm',
  '2': 'part2-cultural-sharing.webm',
  '3': 'part3-intercultural-discussion.webm',
  '4': 'part4-leadership-scenario.webm',
  '5': 'part5-writing.txt',
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const folderId = formData.get('folderId') as string
    const partId = formData.get('partId') as string
    const type = formData.get('type') as string

    if (!folderId || !partId) {
      return NextResponse.json({ success: false, error: 'Thiếu thông tin' }, { status: 400 })
    }

    const fileName = PART_NAMES[partId]

    if (type === 'audio') {
      const file = formData.get('file') as File
      const buffer = Buffer.from(await file.arrayBuffer())
      await uploadAudio(folderId, fileName, buffer)
    } else if (type === 'writing') {
      const text = formData.get('text') as string
      await uploadText(folderId, fileName, text)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, error: 'Upload thất bại' }, { status: 500 })
  }
}
