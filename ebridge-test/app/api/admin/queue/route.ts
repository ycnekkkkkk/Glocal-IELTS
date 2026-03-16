import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateSubfolder, listFilesInFolder, downloadFile } from '@/lib/gdrive'

export const runtime = 'nodejs'

function checkAuth(req: NextRequest): boolean {
  const pwd = req.headers.get('x-admin-password')
  return !!process.env.ADMIN_PASSWORD && pwd === process.env.ADMIN_PASSWORD
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const queueFolderId = await getOrCreateSubfolder(
      process.env.GOOGLE_DRIVE_FOLDER_ID!,
      '_queue'
    )
    const files = await listFilesInFolder(queueFolderId)

    const items = await Promise.all(
      files.map(async (file) => {
        try {
          const buf = await downloadFile(file.id)
          const data = JSON.parse(buf.toString('utf-8'))
          return { fileId: file.id, fileName: file.name, ...data }
        } catch {
          return { fileId: file.id, fileName: file.name, error: true }
        }
      })
    )

    return NextResponse.json({ success: true, items, queueFolderId })
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 })
  }
}
