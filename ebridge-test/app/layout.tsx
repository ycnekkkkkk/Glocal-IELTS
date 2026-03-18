import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Glocal IELTS E-Bridge Test',
  description: 'Glocal IELTS E-Bridge Test — Speaking and Writing Assessment',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
