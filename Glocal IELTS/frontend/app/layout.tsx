import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Glocal IELTS Diagnostic",
  description: "Step-by-step IELTS diagnostic engine",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                {/* Logo and brand */}
                <div className="flex items-center gap-4">
                  {/* Logo - Globe with IELTS */}
                  <div className="relative flex items-center justify-center w-11 h-11 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-sm overflow-hidden group">
                    {/* Background pattern */}
                    <div className="absolute inset-0 opacity-5">
                      <div className="absolute inset-0" style={{
                        backgroundImage: 'radial-gradient(circle at 2px 2px, rgb(148, 163, 184) 1px, transparent 0)',
                        backgroundSize: '16px 16px'
                      }}></div>
                    </div>

                    {/* Globe icon */}
                    <svg className="w-7 h-7 text-emerald-400 relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {/* Globe outline */}
                      <circle cx="12" cy="12" r="9" strokeWidth="1.5" />
                      {/* Latitude lines */}
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 12h18M12 3c-2.5 3-2.5 9 0 12M12 3c2.5 3 2.5 9 0 12" />
                      {/* Accent dot for location */}
                      <circle cx="12" cy="9" r="1.5" fill="currentColor" className="text-emerald-300" />
                    </svg>

                    {/* Mini "GI" text overlay */}
                    <div className="absolute bottom-0.5 right-0.5 text-[6px] font-bold text-slate-500 leading-none tracking-tighter">
                      GI
                    </div>
                  </div>

                  {/* Brand text */}
                  <div className="flex flex-col">
                    <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
                      Glocal IELTS Diagnostic
                    </h1>
                    <p className="text-xs text-slate-400 font-normal mt-0.5 flex items-center gap-1.5">
                      <span>Level</span>
                      <span className="text-slate-600">→</span>
                      <span>One Skill</span>
                      <span className="text-slate-600">→</span>
                      <span className="text-emerald-400">Deep Analysis</span>
                    </p>
                  </div>
                </div>

                {/* Right side - Version or status */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 font-mono"></span>
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1">
            <div className="max-w-5xl mx-auto px-4 py-8">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}


