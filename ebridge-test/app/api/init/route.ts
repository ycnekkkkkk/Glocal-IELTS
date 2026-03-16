import { NextRequest, NextResponse } from 'next/server'
import { createCandidateFolder, uploadJson } from '@/lib/gdrive'
import { CandidateInfo } from '@/lib/types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { candidateInfo }: { candidateInfo: CandidateInfo } = await req.json()

    const folderId = await createCandidateFolder(candidateInfo.fullName, candidateInfo.phone)

    const now = new Date()
    const vnTime = new Intl.DateTimeFormat('vi-VN', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    }).format(now)

    await uploadJson(folderId, 'thong-tin-thi-sinh.json', {
      ...candidateInfo,
      ngayLamBai: vnTime,
      timestamp: now.toISOString(),
    })

    return NextResponse.json({ success: true, folderId })
  } catch (error) {
    console.error('Init error:', error)
    return NextResponse.json({ success: false, error: 'Không thể khởi tạo bài thi' }, { status: 500 })
  }
}
