# E-Bridge Speaking & Writing Test

Web bài kiểm tra Tiếng Anh cho chương trình E-Bridge (Vietnam – Mongolia).

> **Lưu ý:** Dùng **OAuth2 + Refresh Token** (không phải Service Account)  
> vì Service Account không có storage quota trên Google Drive cá nhân.

---

## Hướng dẫn Setup Google Drive (làm 1 lần)

### Bước 1: Tạo Google Cloud Project

1. Vào [https://console.cloud.google.com](https://console.cloud.google.com)
2. Click **"Select a project"** → **"New Project"** → đặt tên (ví dụ `ebridge-test`) → **"Create"**

### Bước 2: Bật Google Drive API

1. Vào **APIs & Services** → **Library**
2. Tìm **"Google Drive API"** → click → **"Enable"**

### Bước 3: Tạo OAuth2 Credentials

1. Vào **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → chọn **"OAuth client ID"**
3. Nếu được hỏi **Configure consent screen**:
   - Chọn **External** → **Create**
   - Điền App name: `E-Bridge Test`, User support email: email của bạn
   - Kéo xuống cuối → **Save and Continue** (bỏ qua các bước còn lại)
   - Quay lại **Credentials**
4. Tạo OAuth client ID:
   - Application type: **Desktop app**
   - Name: `ebridge-local`
   - Click **"Create"**
5. Copy **Client ID** và **Client Secret**

### Bước 4: Điền vào `.env.local`

Tạo file `.env.local` trong thư mục `ebridge-test/`:

```
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxx
GOOGLE_REFRESH_TOKEN=    ← để trống, sẽ điền ở bước 6
GOOGLE_DRIVE_FOLDER_ID=  ← để trống, sẽ điền ở bước 7
```

### Bước 5: Tạo thư mục trên Google Drive

1. Mở [Google Drive](https://drive.google.com) bằng tài khoản admin
2. Tạo thư mục mới: **"+ New"** → **"Folder"** → đặt tên `E-Bridge Test Results`
3. Mở thư mục → copy **Folder ID** từ URL:
   ```
   https://drive.google.com/drive/folders/1xxxxxxxxxxxxxxxxxxx
                                           ↑ đây là Folder ID
   ```
4. Dán vào `.env.local`:
   ```
   GOOGLE_DRIVE_FOLDER_ID=1xxxxxxxxxxxxxxxxxxx
   ```

### Bước 6: Lấy Refresh Token (chạy 1 lần)

```bash
node scripts/get-refresh-token.mjs
```

- Script sẽ in ra một URL dài → mở URL đó trong trình duyệt
- Đăng nhập bằng tài khoản Google của admin (tài khoản sở hữu Drive)
- Cho phép quyền truy cập Drive
- Refresh Token sẽ hiện trong trình duyệt và terminal
- Copy vào `.env.local`:
  ```
  GOOGLE_REFRESH_TOKEN=1//xxxxxxxxxx
  ```

> ⚠️ Nếu thấy màn hình "Google hasn't verified this app" → click **"Advanced"** → **"Go to ... (unsafe)"** → đây là bình thường khi app chưa publish.

---

## Chạy project

```bash
npm run dev
```

Mở trình duyệt: [http://localhost:3000](http://localhost:3000)

---

## Cấu trúc thư mục Google Drive sau khi có thí sinh

```
📁 E-Bridge Test Results/
├── 📁 Nguyễn Văn An - 0901234567/
│   ├── 📄 thong-tin-thi-sinh.json
│   ├── 🎵 part1-self-introduction.webm
│   ├── 🎵 part2-cultural-sharing.webm
│   ├── 🎵 part3-intercultural-discussion.webm
│   ├── 🎵 part4-leadership-scenario.webm
│   └── 📄 part5-writing.txt
└── 📁 Trần Thị Bình - 0912345678/
    └── ...
```

---

## Deploy lên Vercel (free)

```bash
npx vercel --prod
```

Thêm các biến môi trường trong Vercel Dashboard:
**Project Settings → Environment Variables** → thêm 4 biến như trong `.env.local`.

---

## Rubric chấm điểm

| Part | Tiêu chí | Thang điểm |
|------|----------|------------|
| 1 – Self Introduction | Fluency, Pronunciation, Vocabulary, Grammar | 0–5 mỗi tiêu chí |
| 2 – Cultural Sharing | Content relevance, Vocabulary, Fluency, Grammar | 0–5 mỗi tiêu chí |
| 3 – Intercultural Discussion | Idea development, Communication clarity, Vocabulary, Grammar | 0–5 mỗi tiêu chí |
| 4 – Leadership Scenario | Problem explanation, Communication skills, Fluency, Vocabulary | 0–5 mỗi tiêu chí |
| 5 – Writing Reflection | Task response, Organization, Vocabulary, Grammar | 0–5 mỗi tiêu chí |
