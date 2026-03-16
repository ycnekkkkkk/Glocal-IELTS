import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateSubfolder, uploadJson } from '@/lib/gdrive'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { candidateInfo, writing, folderId } = await req.json()

    const queueFolderId = await getOrCreateSubfolder(
      process.env.GOOGLE_DRIVE_FOLDER_ID!,
      '_queue'
    )

    const ts = Date.now()
    const fileName = `${ts}-${(candidateInfo.phone || 'unknown').replace(/\s/g, '')}.json`

    await uploadJson(queueFolderId, fileName, {
      candidateInfo,
      writing: writing || '',
      folderId,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Submit error:', error)
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
