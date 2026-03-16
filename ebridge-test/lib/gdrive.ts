import { google } from 'googleapis'
import { Readable } from 'stream'

function getAuth() {
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  oauth2.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  })
  return oauth2
}

export async function createCandidateFolder(name: string, phone: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })

  const now = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
    hour12: false,
  }).format(new Date()).replace(',', '').replace(/\//g, '-').replace(':', 'h').replace(':', 'p')

  const res = await drive.files.create({
    requestBody: {
      name: `${name} - ${phone} - ${now}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [process.env.GOOGLE_DRIVE_FOLDER_ID!],
    },
    fields: 'id',
  })
  return res.data.id!
}

export async function uploadJson(folderId: string, fileName: string, data: object) {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const stream = Readable.from(Buffer.from(JSON.stringify(data, null, 2), 'utf-8'))
  await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: 'application/json', body: stream },
  })
}

export async function uploadAudio(folderId: string, fileName: string, buffer: Buffer) {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const stream = Readable.from(buffer)
  await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: 'audio/webm', body: stream },
  })
}

export async function uploadText(folderId: string, fileName: string, text: string) {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const stream = Readable.from(Buffer.from(text, 'utf-8'))
  await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: 'text/plain', body: stream },
  })
}

export async function uploadPDF(folderId: string, fileName: string, buffer: Buffer) {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const stream = Readable.from(buffer)
  await drive.files.create({
    requestBody: { name: fileName, parents: [folderId] },
    media: { mimeType: 'application/pdf', body: stream },
  })
}

export async function getOrCreateSubfolder(parentFolderId: string, name: string): Promise<string> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
  })
  if (res.data.files && res.data.files.length > 0) return res.data.files[0].id!
  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] },
    fields: 'id',
  })
  return created.data.id!
}

export async function listFilesInFolder(folderId: string): Promise<{ id: string; name: string }[]> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: 'files(id, name)',
    orderBy: 'createdTime',
  })
  return (res.data.files || []) as { id: string; name: string }[]
}

export async function downloadFile(fileId: string): Promise<Buffer> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const res = await drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' }
  )
  return Buffer.from(res.data as ArrayBuffer)
}

export async function deleteFile(fileId: string): Promise<void> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  await drive.files.delete({ fileId })
}

export async function findFileInFolder(folderId: string, name: string): Promise<string | null> {
  const drive = google.drive({ version: 'v3', auth: getAuth() })
  const res = await drive.files.list({
    q: `'${folderId}' in parents and name = '${name}' and trashed = false`,
    fields: 'files(id)',
  })
  return res.data.files?.[0]?.id ?? null
}
