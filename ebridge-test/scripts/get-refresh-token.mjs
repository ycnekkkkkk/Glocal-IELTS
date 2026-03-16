/**
 * Chạy script này 1 lần để lấy Refresh Token:
 *   node scripts/get-refresh-token.mjs
 *
 * Yêu cầu: đã có GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET trong .env.local
 */

import { google } from 'googleapis'
import http from 'http'
import { readFileSync } from 'fs'

// Đọc .env.local thủ công (không cần cài dotenv)
let CLIENT_ID = ''
let CLIENT_SECRET = ''
try {
  const env = readFileSync('.env.local', 'utf-8')
  const getId = (key) => {
    const m = env.match(new RegExp(`^${key}=(.+)$`, 'm'))
    return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''
  }
  CLIENT_ID = getId('GOOGLE_CLIENT_ID')
  CLIENT_SECRET = getId('GOOGLE_CLIENT_SECRET')
} catch {
  console.error('❌ Không tìm thấy file .env.local')
  process.exit(1)
}

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ Chưa có GOOGLE_CLIENT_ID hoặc GOOGLE_CLIENT_SECRET trong .env.local')
  console.error('   Xem README.md để biết cách lấy.')
  process.exit(1)
}

const REDIRECT_URI = 'http://localhost:3001/callback'
const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/drive'],
  prompt: 'consent',
})

console.log('\n🔑  E-Bridge — Lấy Google Drive Refresh Token')
console.log('═'.repeat(50))
console.log('\n📌 Mở URL sau trong trình duyệt:\n')
console.log(authUrl)
console.log('\n⏳ Đang chờ bạn đăng nhập...\n')

const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url, 'http://localhost:3001')
  const code = urlObj.searchParams.get('code')
  if (!code) { res.end('Không có code.'); return }

  try {
    const { tokens } = await oauth2Client.getToken(code)
    const rt = tokens.refresh_token

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end(`<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>body{font-family:sans-serif;max-width:640px;margin:48px auto;padding:20px;line-height:1.6}
pre{background:#f3f4f6;padding:16px;border-radius:10px;word-break:break-all;font-size:13px}
h2{color:#16a34a}</style></head><body>
<h2>✅ Lấy token thành công!</h2>
<p>Thêm dòng sau vào file <strong>.env.local</strong> của bạn:</p>
<pre>GOOGLE_REFRESH_TOKEN=${rt}</pre>
<p style="color:#6b7280">Đóng tab này và quay lại terminal.</p>
</body></html>`)

    console.log('✅ REFRESH TOKEN:\n')
    console.log(rt)
    console.log('\n📋 Thêm vào .env.local:')
    console.log(`GOOGLE_REFRESH_TOKEN=${rt}\n`)

    setTimeout(() => { server.close(); process.exit(0) }, 1500)
  } catch (err) {
    res.writeHead(500)
    res.end('Lỗi: ' + err.message)
    console.error('❌ Lỗi:', err.message)
  }
})

server.listen(3001, () => {
  console.log('(Server callback chạy tại http://localhost:3001)\n')
})
