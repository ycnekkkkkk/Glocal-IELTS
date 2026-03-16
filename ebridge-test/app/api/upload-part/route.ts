import { NextRequest, NextResponse } from 'next/server'
import { uploadAudioWithMime, uploadText } from '@/lib/gdrive'

export const runtime = 'nodejs'
export const maxDuration = 30

const PART_BASE_NAMES: Record<string, string> = {
  '1': 'part1-self-introduction',
  '2': 'part2-cultural-sharing',
  '3': 'part3-intercultural-discussion',
  '4': 'part4-leadership-scenario',
}

function extFromMime(mime: string): string {
  if (mime.includes('mp4') || mime.includes('aac') || mime.includes('m4a')) return 'mp4'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
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

    if (type === 'audio') {
      const file = formData.get('file') as File
      const mimeType = file.type || 'audio/webm'
      const ext = extFromMime(mimeType)
      const baseName = PART_BASE_NAMES[partId]
      const fileName = `${baseName}.${ext}`
      const buffer = Buffer.from(await file.arrayBuffer())
      await uploadAudioWithMime(folderId, fileName, buffer, mimeType)
    } else if (type === 'writing') {
      const text = formData.get('text') as string
      await uploadText(folderId, 'part5-writing.txt', text)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ success: false, error: 'Upload thất bại' }, { status: 500 })
  }
}
